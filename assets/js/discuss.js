// Discuss: in-page collaboration for discussion pages (see apps/discuss/).
//
// Loaded (with code-editor.js) by assignment.js on any page that has
// .code-editor wrappers — the screen form of a discussion's student page.
// Three features, all optional layers over the editors:
//
//   * Verify: each .discuss-check placeholder (render.discuss_check_box)
//     becomes a Verify button that runs the question's doctests in Pyodide
//     against the code in the paired editor, plus a running ✅/❌ history of
//     every press. The doctests come from the editor's published listing
//     (cmEditor.original), never its current contents, so editing or
//     deleting them cannot fake a pass. A failed verify cools the button
//     down for 30 seconds.
//   * Saved answers: edits, outcomes, and the verify history are kept in
//     localStorage per page and restored on the next visit. The server
//     never stores answers.
//   * Groups: join with a name and group number, and each code pane grows a
//     column of tabs — "You" plus one per other member, showing their name
//     and verify history. A member's tab shows their code in that one pane,
//     read-only and unselectable, with their Verify state (disabled: only
//     they can run their code). A strikes line counts the whole group's ❌s
//     for the question. State is shared through the discuss server while
//     members are on the page.
//
// The editors announce themselves with bubbling code-editor-ready events and
// expose a cmEditor handle on each wrapper (editor_src/code-editor.js);
// script order between the two files does not matter.

(function () {
  'use strict';

  var SERVER = 'https://discuss.cs61a.org';
  var PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js';
  var POLL_MS = 1000;        // group sync cadence
  var SAVE_MS = 2000;        // debounce for saving/sharing edits
  var STALE_AFTER = 3;       // failed polls before the offline notice
  var COOLDOWN_MS = 30000;   // Verify lockout after a failed run
  var RUN_TIMEOUT_MS = 2000; // a verify slower than this counts as a failure
  var PASS = '✅';
  var FAIL = '❌';
  var MAX_HISTORY = 100;     // verify marks kept per question
  var MAX_NAME = 24;         // longer tab names are truncated to 22 + …
  var MAX_CODE = 20000;      // code chars shared/saved per question (server cap)
  var MAX_MEMBERS = 10;      // members shown at once (matches the server + palette)

  // One background tint per group member: near-white hue tints, close to
  // the editors' default light-gray ground so the differences stay subtle.
  var PALETTE = [
    '#fdf0e2', '#e9f7e6', '#e4f6f8', '#f9edfa', '#faf8e0',
    '#e8f0fc', '#fcecec', '#efecfb', '#e9f6ef', '#fbeff2',
  ];

  // ── Page identity and storage ─────────────────────────────────────────────

  // One saved-answer record per discussion page; the origin scopes the two
  // course sites apart and the pathname scopes the discussions apart.
  var page = location.pathname.replace(/index\.html$/, '');
  if (page.slice(-1) !== '/') page += '/';
  var PAGE_URL = location.origin + page;
  var ANSWERS_KEY = 'discuss-answers:' + page;

  function stored(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function store(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { /* private windows etc.: everything still works unsaved */ }
  }

  // Site-wide random identity; the name is only a label on the tab, so two
  // students with the same name never collide.
  var clientId = stored('discuss-client-id');
  if (!clientId) {
    clientId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    store('discuss-client-id', clientId);
  }

  var answers = {};          // qid -> {code, status, history}; the saved record
  try { answers = JSON.parse(stored(ANSWERS_KEY)) || {}; } catch (e) {}

  // ── The verify history (✅/❌ strings) ────────────────────────────────────

  function history(record) {
    return (record && typeof record.history === 'string') ? record.history : '';
  }

  // ❌❌❌❌…✅ once the marks outgrow a tab.
  function abbrev(marks) {
    if (marks.length <= 6) return marks;
    return marks.slice(0, 4) + '…' + marks.slice(-1);
  }

  function failures(marks) {
    return marks.split(FAIL).length - 1;
  }

  // ── Questions: editors and Verify widgets ─────────────────────────────────

  // qid -> {wrapper, check, marks, output, pane, ownState, cooldownUntil}.
  // The editor handle is wrapper.cmEditor once mounted; pane appears when
  // the group first has another member (see buildPanes).
  var questions = {};
  var order = [];            // qids in document order
  var restoring = 0;         // >0 while our own setText calls fire changes

  // Run FN while the change events our own setText fires are ignored, so
  // restoring or swapping editor contents is never mistaken for the student
  // typing. The counter (not a boolean) keeps nested calls correct.
  function silently(fn) {
    restoring++;
    try { fn(); } finally { restoring--; }
  }

  function api(q) { return q.wrapper && q.wrapper.cmEditor; }

  function showingMember(q) { return !!(q.pane && q.pane.showing); }

  function questionFor(wrapper) {
    var qid = wrapper.dataset.question;
    if (!qid) {              // pages published before data-question existed
      qid = 'q' + Array.prototype.indexOf.call(
        document.querySelectorAll('.code-editor'), wrapper);
    }
    if (!questions[qid]) {
      questions[qid] = { wrapper: null, check: null, marks: null,
                         output: null, pane: null, ownState: 'gray',
                         cooldownUntil: 0 };
      order.push(qid);
    }
    var q = questions[qid];
    if (!q.wrapper) q.wrapper = wrapper;
    return qid;
  }

  // A Verify widget pairs with the editor of the same data-question, falling
  // back to the nearest .code-editor before it in the page.
  function checkTarget(box) {
    var qid = box.dataset.question;
    var wrapper = qid &&
      document.querySelector('.code-editor[data-question="' + qid + '"]');
    if (!wrapper) {
      var editors = document.querySelectorAll('.code-editor');
      for (var i = 0; i < editors.length; i++) {
        if (box.compareDocumentPosition(editors[i]) &
            Node.DOCUMENT_POSITION_PRECEDING) wrapper = editors[i];
      }
    }
    return wrapper ? questionFor(wrapper) : null;
  }

  // The student's own Verify state; shown unless the pane is on a member.
  function setStatus(qid, status) {
    var q = questions[qid];
    q.ownState = status;
    if (q.check && !showingMember(q)) q.check.dataset.state = status;
    if (q.output && status !== 'red') q.output.hidden = true;
  }

  // What is saved and shared is bounded: a giant paste (all of Shakespeare
  // in a cell) is truncated rather than stored or sent whole. The editor
  // still holds the student's full text to work in.
  function clampCode(code) {
    return code.length > MAX_CODE ? code.slice(0, MAX_CODE) : code;
  }

  function record(qid, code, status, marks) {
    if (marks === undefined) marks = history(answers[qid]);
    answers[qid] = { code: clampCode(code), status: status, history: marks };
    store(ANSWERS_KEY, JSON.stringify(answers));
    markDirty();
  }

  // Restore this editor's saved answer, then start tracking its edits.
  function adopt(wrapper) {
    var qid = questionFor(wrapper);
    var saved = answers[qid];
    var handle = wrapper.cmEditor;
    if (saved && typeof saved.code === 'string' &&
        saved.code !== handle.getText()) {
      silently(function () { handle.setText(saved.code); });
    }
    setStatus(qid, (saved && saved.status) || 'gray');
    showMarks(qid);
  }

  function showMarks(qid) {
    var q = questions[qid];
    if (q.marks) q.marks.textContent = abbrev(history(answers[qid]));
  }

  var saveTimers = {};
  document.addEventListener('code-editor-change', function (event) {
    if (restoring) return;
    var wrapper = event.target;
    if (!wrapper.classList || !wrapper.classList.contains('code-editor')) return;
    var qid = questionFor(wrapper);
    if (showingMember(questions[qid])) return; // read-only; never user edits
    setStatus(qid, 'gray');
    clearTimeout(saveTimers[qid]);
    saveTimers[qid] = setTimeout(function () {
      record(qid, wrapper.cmEditor.getText(), 'gray');
    }, SAVE_MS);
  });

  function flushSaves() {
    Object.keys(saveTimers).forEach(function (qid) {
      clearTimeout(saveTimers[qid]);
      var q = questions[qid];
      if (api(q) && !showingMember(q)) {
        var code = api(q).getText();
        if (!answers[qid] || answers[qid].code !== code) {
          record(qid, code, q.ownState);
        }
      }
    });
    saveTimers = {};
  }
  window.addEventListener('pagehide', flushSaves);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flushSaves();
  });
  document.addEventListener('focusout', function (event) {
    if (event.target.closest && event.target.closest('.code-editor')) {
      flushSaves();
    }
  });

  document.addEventListener('code-editor-ready', function (event) {
    adopt(event.target);
  });
  document.querySelectorAll('.code-editor').forEach(function (wrapper) {
    if (wrapper.cmEditor) adopt(wrapper); // mounted before we loaded
    else questionFor(wrapper);            // known; adopted on its ready event
  });

  // ── Verify (Pyodide doctests, in a Web Worker) ────────────────────────────

  // The checker: run the student's code, then the doctests parsed from the
  // published listing. Everything returns through one JSON string.
  var HARNESS = [
    'import ast, doctest, io, json, traceback',
    '',
    'def _discuss_examples(canonical):',
    '    # The doctests live in docstrings. Parsing the raw file text',
    '    # instead would run each docstring\'s closing quotes and the',
    '    # code after it into the last example\'s expected output.',
    '    parser = doctest.DocTestParser()',
    '    try:',
    '        tree = ast.parse(canonical)',
    '    except SyntaxError:',
    '        return parser.get_examples(canonical)',
    '    examples = []',
    '    for node in ast.walk(tree):',
    '        if isinstance(node, (ast.Module, ast.ClassDef,',
    '                             ast.FunctionDef, ast.AsyncFunctionDef)):',
    '            docstring = ast.get_docstring(node, clean=False)',
    '            if docstring:',
    '                examples.extend(parser.get_examples(docstring))',
    '    return examples',
    '',
    'def _discuss_check(canonical, student):',
    '    examples = _discuss_examples(canonical)',
    '    env = {}',
    '    try:',
    '        exec(student, env)',
    '    except BaseException:',
    '        return json.dumps({"ok": False,',
    '            "output": traceback.format_exc(limit=0)})',
    '    if not examples:',
    '        return json.dumps({"ok": False,',
    '            "output": "No doctests found for this question."})',
    '    test = doctest.DocTest(examples, env, "question", None, 0, None)',
    '    out = io.StringIO()',
    '    runner = doctest.DocTestRunner(verbose=False,',
    '        optionflags=doctest.ELLIPSIS)',
    '    result = runner.run(test, out=out.write, clear_globs=False)',
    '    return json.dumps({"ok": result.failed == 0,',
    '        "output": out.getvalue()})',
  ].join('\n');

  // Pyodide runs in a worker so an infinite loop in student code cannot
  // freeze the page: a run that misses RUN_TIMEOUT_MS is cut off by
  // terminating the worker (the next verify starts a fresh one).
  var WORKER_SRC = [
    'importScripts(' + JSON.stringify(PYODIDE_URL) + ');',
    'var ready = loadPyodide({indexURL: ' +
      JSON.stringify(PYODIDE_URL.replace(/pyodide\.js$/, '')) + '})',
    '  .then(function (py) {',
    '    py.runPython(' + JSON.stringify(HARNESS) + ');',
    '    postMessage("ready");',
    '    return py;',
    '  });',
    'onmessage = function (event) {',
    '  var data = event.data;',
    '  ready.then(function (py) {',
    '    var check = py.globals.get("_discuss_check");',
    '    var out;',
    '    try { out = check(data.canonical, data.student); }',
    '    finally { check.destroy(); }',
    '    postMessage(out);',
    '  }).catch(function () {',
    '    postMessage(JSON.stringify({ok: false, output: "runner error"}));',
    '  });',
    '};',
  ].join('\n');

  var worker = null;
  var workerReady = null;    // promise for a loaded worker
  var runQueue = Promise.resolve(); // verifies run one at a time

  function ensureWorker() {
    if (workerReady) return workerReady;
    var w = new Worker(URL.createObjectURL(
      new Blob([WORKER_SRC], { type: 'text/javascript' })));
    worker = w;
    workerReady = new Promise(function (resolve, reject) {
      w.onmessage = function (event) {
        if (event.data === 'ready') resolve(w);
      };
      w.onerror = function () { reject(new Error('pyodide load failed')); };
    }).catch(function (error) {
      workerReady = null;    // allow a retry on the next click
      worker = null;
      w.terminate();
      throw error;
    });
    return workerReady;
  }

  function runInWorker(canonical, student) {
    var run = runQueue.then(function () {
      return ensureWorker().then(function (w) {
        return new Promise(function (resolve) {
          // Discard the worker; the next verify loads a fresh one. Used for
          // a run that runs too long or crashes the runtime (e.g. exhausts
          // its memory) — either way the page itself is never touched.
          function scrap(result) {
            if (worker === w) { worker = null; workerReady = null; }
            w.terminate();
            resolve(result);
          }
          var timer = setTimeout(function () {
            scrap({ ok: false, timeout: true });
          }, RUN_TIMEOUT_MS);
          w.onmessage = function (event) {
            if (event.data === 'ready') return;
            clearTimeout(timer);
            resolve(JSON.parse(event.data));
          };
          w.onerror = function () {
            clearTimeout(timer);
            scrap({ ok: false, output: 'runner error' });
          };
          w.postMessage({
            canonical: clampCode(canonical), student: clampCode(student),
          });
        });
      });
    });
    runQueue = run.then(function () {}, function () {});
    return run;
  }

  function runCheck(qid) {
    var q = questions[qid];
    if (!q || !api(q) || showingMember(q)) return;
    var button = q.check;
    var failedRun = false;
    button.disabled = true;
    button.textContent = workerReady ? 'Checking…' : 'Loading Python…';
    runInWorker(api(q).original, api(q).getText()).then(function (result) {
      var status = result.ok ? 'green' : 'red';
      var marks = history(answers[qid]) + (result.ok ? PASS : FAIL);
      if (marks.length > MAX_HISTORY) { // invisible middle marks give way
        marks = marks.slice(0, 4) + marks.slice(4 - MAX_HISTORY);
      }
      setStatus(qid, status);
      record(qid, api(q).getText(), status, marks);
      showMarks(qid);
      renderPanes();
      // Only the outcome is reported (the button color and ❌ mark), not
      // the failing doctests: working out what went wrong is the exercise.
      if (!result.ok) failedRun = true;
    }).catch(function () {
      if (q.output) {
        q.output.textContent =
          'Could not load the Python runtime; check your connection and try again.';
        q.output.hidden = false;
      }
    }).then(function () {
      // Reset the label before the cooldown ring is added: setting
      // textContent replaces the button's children.
      button.textContent = 'Verify';
      button.disabled = showingMember(q) || coolingDown(q);
      if (failedRun) startCooldown(qid);
    });
  }

  // ── Cooldown: 30s between failed verifies, with a progress ring ───────────

  function coolingDown(q) { return q.cooldownUntil > Date.now(); }

  function startCooldown(qid) {
    var q = questions[qid];
    q.cooldownUntil = Date.now() + COOLDOWN_MS;
    q.check.disabled = true;
    function step() {
      var left = q.cooldownUntil - Date.now();
      if (left <= 0) {
        clearInterval(timer);
        q.check.textContent = 'Verify';
        if (!showingMember(q)) q.check.disabled = false;
        return;
      }
      // Counts 30, 25, ..., 5: a 5-second tick is enough to explain the
      // wait without the flicker of a per-second countdown.
      q.check.textContent =
        'Retry in ' + (Math.ceil(left / 5000) * 5) + 's';
    }
    step();
    var timer = setInterval(step, 5000);
  }

  document.querySelectorAll('.discuss-check').forEach(function (box) {
    var qid = checkTarget(box);
    if (!qid) return;
    var q = questions[qid];
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'discuss-check-button';
    button.dataset.state = (answers[qid] && answers[qid].status) || 'gray';
    button.textContent = 'Verify';
    button.addEventListener('click', function () { runCheck(qid); });
    var marks = document.createElement('span');
    marks.className = 'discuss-history';
    var output = document.createElement('pre');
    output.className = 'discuss-check-output';
    output.hidden = true;
    box.append(button, marks, output);
    q.check = button;
    q.marks = marks;
    q.output = output;
    showMarks(qid);
  });

  // ── Group membership (top bar) ────────────────────────────────────────────

  var group = null;          // non-negative integer while joined
  var name = stored('discuss-name') || '';
  var members = {};          // client id -> {name, answers}
  var memberOrder = [];      // client ids in the server's join order
  var dirty = true;          // answers not yet pushed to the group
  var failCount = 0;
  var pollTimer = null;
  var bar, form, joined, hint;

  function markDirty() { dirty = true; }

  function buildBar() {
    var assignment = document.querySelector('.assignment');
    if (!assignment) return;
    bar = document.createElement('div');
    bar.className = 'discuss-bar';

    form = document.createElement('form');
    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Name';
    nameInput.maxLength = 32;
    nameInput.value = name;
    nameInput.setAttribute('aria-label', 'Name');
    var groupInput = document.createElement('input');
    groupInput.type = 'number';
    groupInput.min = '0';
    groupInput.step = '1';
    groupInput.placeholder = 'Group number';
    groupInput.setAttribute('aria-label', 'Group number');
    var join = document.createElement('button');
    join.type = 'submit';
    join.textContent = 'Join Group';
    join.disabled = true;
    function validate() {
      join.disabled = !(nameInput.value.trim() &&
        /^\d+$/.test(groupInput.value.trim()));
    }
    nameInput.addEventListener('input', validate);
    groupInput.addEventListener('input', validate);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      joinGroup(nameInput.value.trim(),
                parseInt(groupInput.value.trim(), 10));
    });
    var label = document.createElement('span');
    label.className = 'discuss-bar-label';
    label.textContent = 'Discuss with your group:';
    form.append(label, nameInput, groupInput, join);

    joined = document.createElement('div');
    joined.className = 'discuss-joined';
    joined.hidden = true;

    hint = document.createElement('span');
    hint.className = 'discuss-hint';
    hint.hidden = true;

    bar.append(form, joined, hint);
    assignment.insertBefore(bar, assignment.firstChild);

    var saved = stored('discuss-group');
    if (name && saved && /^\d+$/.test(saved)) {
      groupInput.value = saved;
      joinGroup(name, parseInt(saved, 10)); // auto-rejoin is idempotent
    }
  }

  function showJoined() {
    form.hidden = true;
    joined.hidden = false;
    joined.textContent = '';
    var who = document.createElement('strong');
    who.textContent = name;
    var text = document.createElement('span');
    text.textContent = ' — Group ' + group + ' ';
    var leave = document.createElement('button');
    leave.type = 'button';
    leave.textContent = 'Leave';
    leave.addEventListener('click', leaveGroup);
    joined.append(who, text, leave);
  }

  function joinGroup(newName, newGroup) {
    name = newName;
    group = newGroup;
    store('discuss-name', name);
    store('discuss-group', String(group));
    dirty = true;
    showJoined();
    if (!pollTimer) pollTimer = setInterval(poll, POLL_MS);
    poll();
  }

  function leaveGroup() {
    sync(true);
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    group = null;
    store('discuss-group', null); // no auto-rejoin until the next Join
    members = {};
    memberOrder = [];
    renderPanes();
    form.hidden = false;
    joined.hidden = true;
    hint.hidden = true;
  }

  // Leaving the page leaves the group (the saved name/group re-join it on the
  // next visit). text/plain keeps sendBeacon CORS-simple.
  window.addEventListener('pagehide', function () {
    if (group === null || !navigator.sendBeacon) return;
    navigator.sendBeacon(SERVER + '/sync', JSON.stringify({
      client: clientId, name: name, page: PAGE_URL, group: group, leave: true,
    }));
  });

  // ── Sync ──────────────────────────────────────────────────────────────────

  function payload(leave) {
    var body = {
      client: clientId, name: name, page: PAGE_URL, group: group,
    };
    if (leave) {
      body.leave = true;
      return body;
    }
    if (dirty) body.answers = answers;
    return body;
  }

  function sync(leave) {
    // No Content-Type header: the request stays CORS-simple (no preflight).
    return fetch(SERVER + '/sync', {
      method: 'POST',
      body: JSON.stringify(payload(leave)),
    }).then(function (response) {
      if (!response.ok) {
        // Carry the status so poll() can tell "server rejected us" (4xx)
        // apart from "server unreachable" (a network failure, which rejects
        // the fetch itself with no status).
        var error = new Error('sync ' + response.status);
        error.status = response.status;
        throw error;
      }
      return response.json();
    });
  }

  function poll() {
    if (group === null) return;
    var pushed = dirty;
    var forGroup = group;    // ignore a reply that lands after a group switch
    sync(false).then(function (data) {
      if (group !== forGroup) return; // left or switched groups mid-request
      if (pushed) dirty = false;
      failCount = 0;
      if (data.full) {
        showHint('This group is full, so sharing is off. Your work is still '
          + 'saved on this device.');
      } else {
        hint.hidden = true;
      }
      members = {};
      memberOrder = [];
      // Never show more than the palette can distinguish; the server already
      // caps this, so the slice is belt-and-suspenders.
      (data.members || []).slice(0, MAX_MEMBERS).forEach(function (member) {
        members[member.client] = {
          name: member.name,
          answers: member.answers || {},
        };
        memberOrder.push(member.client);
      });
      renderPanes();
    }).catch(function (error) {
      failCount++;
      if (failCount >= STALE_AFTER) {
        // Editing, saving, and Verify all keep working either way — only the
        // live group sharing is affected. A 4xx means the server answered but
        // refused the request; anything else means we couldn't reach it.
        var refused = error && error.status >= 400 && error.status < 500;
        showHint((refused
          ? 'Group sharing is unavailable right now. '
          : 'Group sharing is offline (can\'t reach the server). ')
          + 'Your work is still saved on this device.');
      }
    });
  }

  function showHint(text) {
    hint.textContent = text;
    hint.hidden = false;
  }

  // ── Per-pane member tabs ──────────────────────────────────────────────────

  // First-come color assignment: hash the id for a stable starting slot,
  // then probe past slots already taken so two members never share a color
  // (the palette covers the max group size). Assignments stick for the
  // session even if a member leaves.
  var colorSlots = {};       // client id -> palette index

  function colorFor(id) {
    if (!(id in colorSlots)) {
      var used = {};
      Object.keys(colorSlots).forEach(function (other) {
        used[colorSlots[other]] = true;
      });
      var hash = 0;
      for (var i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
      }
      var slot = hash % PALETTE.length;
      for (var probe = 0; probe < PALETTE.length && used[slot]; probe++) {
        slot = (slot + 1) % PALETTE.length;
      }
      colorSlots[id] = slot;
    }
    return PALETTE[colorSlots[id]];
  }

  function tabName(text) {
    // Count by code points, not UTF-16 units, so truncating never splits an
    // emoji in a student's name into a broken half-character.
    var chars = Array.from(text);
    return chars.length > MAX_NAME ? chars.slice(0, 22).join('') + '…' : text;
  }

  function memberAnswer(id, qid) {
    var member = members[id];
    return (member && member.answers && member.answers[qid]) || null;
  }

  // Every member's ❌s for this question, plus your own — the group's
  // running cost of hasty verifies.
  function strikes(qid) {
    var total = failures(history(answers[qid]));
    memberOrder.forEach(function (id) {
      total += failures(history(memberAnswer(id, qid)));
    });
    return total;
  }

  // Wrap the editor in a flex row with the tab column; undone on teardown so
  // a groupless page looks exactly as it did before joining.
  function buildPane(q, qid) {
    var pane = document.createElement('div');
    pane.className = 'discuss-pane';
    q.wrapper.parentNode.insertBefore(pane, q.wrapper);
    var tabs = document.createElement('div');
    tabs.className = 'discuss-tabs';
    var strikesLine = document.createElement('div');
    strikesLine.className = 'discuss-strikes';
    pane.append(q.wrapper, tabs);
    q.pane = { el: pane, tabs: tabs, strikesLine: strikesLine,
               showing: null, ownText: '' };
  }

  function teardownPane(q, qid) {
    if (!q.pane) return;
    showYou(qid);
    q.pane.el.parentNode.insertBefore(q.wrapper, q.pane.el);
    q.pane.el.remove();
    q.pane = null;
  }

  function showMember(qid, id) {
    var q = questions[qid];
    var handle = api(q);
    if (!handle || q.pane.showing === id) return;
    if (q.pane.showing === null) q.pane.ownText = handle.getText();
    q.pane.showing = id;
    // Everything the click can change instantly changes now — tab highlight,
    // pane color, and the outgoing code cleared away — so the switch feels
    // immediate; the member's code fills in on the next frame.
    q.pane.el.classList.add('showing-member');
    q.wrapper.style.background = colorFor(id);
    handle.setReadOnly(true);
    silently(function () { handle.setText(''); });
    renderPaneTabs(qid);
    requestAnimationFrame(function () {
      if (q.pane && q.pane.showing === id) refreshShown(qid);
    });
  }

  // While a member's code is shown: their text, their Verify state and
  // marks, and no way to run or copy it. Re-run on every poll.
  function refreshShown(qid) {
    var q = questions[qid];
    var answer = memberAnswer(q.pane.showing, qid);
    var code = (answer && typeof answer.code === 'string')
      ? answer.code : api(q).original;
    if (api(q).getText() !== code) {
      silently(function () { api(q).setText(code); });
    }
    if (q.check) {
      q.check.dataset.state = (answer && answer.status) || 'gray';
      q.check.disabled = true;
      q.marks.textContent = abbrev(history(answer));
      q.output.hidden = true;
    }
  }

  function showYou(qid) {
    var q = questions[qid];
    if (!q.pane || q.pane.showing === null) return;
    q.pane.showing = null;
    q.pane.el.classList.remove('showing-member');
    q.wrapper.style.background = '';
    var handle = api(q);
    if (handle) {
      silently(function () {
        if (handle.getText() !== q.pane.ownText) handle.setText(q.pane.ownText);
      });
      handle.setReadOnly(false);
    }
    if (q.check) {
      q.check.dataset.state = q.ownState;
      q.check.disabled = coolingDown(q);
      showMarks(qid);
    }
    renderPaneTabs(qid);
  }

  // Everything the tab column displays, as one string. Rebuilding the tabs
  // only when this changes keeps a once-a-second poll from replacing the tab
  // buttons underneath a click in progress (which would swallow the click).
  function tabSignature(qid) {
    var parts = [name, history(answers[qid]), String(questions[qid].pane.showing),
                 String(strikes(qid))];
    memberOrder.forEach(function (id) {
      parts.push(id + ':' + members[id].name + ':' +
                 history(memberAnswer(id, qid)));
    });
    return parts.join('\n');
  }

  // Rebuild one pane's tab column (You + members + strikes) from the current
  // membership. Pure UI: it never touches the editor's contents. Skipped when
  // nothing displayed has changed, so idle polls leave the tab buttons (and
  // any click landing on them) alone.
  function renderPaneTabs(qid) {
    var q = questions[qid];
    if (!q.pane) return;
    var sig = tabSignature(qid);
    if (q.pane.sig === sig) return;
    q.pane.sig = sig;
    var tabs = q.pane.tabs;
    tabs.textContent = '';
    var you = document.createElement('button');
    you.type = 'button';
    you.className = 'discuss-tab discuss-tab-you';
    var youLabel = document.createElement('span');
    youLabel.className = 'discuss-tab-name';
    youLabel.textContent = tabName('You (' + name + ')');
    var youSeq = document.createElement('span');
    youSeq.className = 'discuss-tab-marks';
    youSeq.textContent = abbrev(history(answers[qid]));
    you.append(youLabel, youSeq);
    if (q.pane.showing === null) you.classList.add('active');
    you.addEventListener('click', function () { showYou(qid); });
    tabs.appendChild(you);
    memberOrder.forEach(function (id) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'discuss-tab';
      tab.style.background = colorFor(id);
      var label = document.createElement('span');
      label.className = 'discuss-tab-name';
      label.textContent = tabName(members[id].name);
      var seq = document.createElement('span');
      seq.className = 'discuss-tab-marks';
      seq.textContent = abbrev(history(memberAnswer(id, qid)));
      tab.append(label, seq);
      if (q.pane.showing === id) tab.classList.add('active');
      tab.addEventListener('click', function () { showMember(qid, id); });
      tabs.appendChild(tab);
    });
    var strikeCount = strikes(qid);
    q.pane.strikesLine.textContent = 'Group strikes: ';
    var countSpan = document.createElement('span');
    countSpan.className = 'discuss-strikes-count';
    if (strikeCount > 0) countSpan.classList.add('nonzero');
    countSpan.textContent = strikeCount;
    q.pane.strikesLine.appendChild(countSpan);
    tabs.appendChild(q.pane.strikesLine);
  }

  // Rebuild every pane from the current membership: called on each poll,
  // after a verify (marks changed), and on leave (teardown).
  function renderPanes() {
    order.forEach(function (qid) {
      var q = questions[qid];
      if (!api(q)) return;
      if (memberOrder.length === 0) {
        teardownPane(q, qid);
        return;
      }
      if (!q.pane) buildPane(q, qid);
      if (q.pane.showing && memberOrder.indexOf(q.pane.showing) < 0) {
        showYou(qid); // whoever was shown has left
      }
      renderPaneTabs(qid);
      if (q.pane.showing) refreshShown(qid);
    });
  }

  buildBar();
})();
