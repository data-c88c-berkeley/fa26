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
//     down for 30 seconds, and a reload does not cut the wait short.
//     A Gleam question's widget (render.gleam_check_box) carries its test
//     module instead, and Verify compiles the code with the Gleam compiler
//     (in WebAssembly, from the Gleam playground) and runs those tests.
//   * Visualize: a link beside Reset that opens a Python Tutor diagram of
//     the code (plus the doctests as calls) in a new tab. A discussion can
//     turn it off with `visualize: false` (data-visualize on each widget).
//   * Saved answers: edits, outcomes, and the verify history are kept in
//     localStorage per page and restored on the next visit. The server
//     never stores answers.
//   * Groups: join with a name, a @berkeley.edu email address (the server
//     logs it with the group so staff can tell who sat where), and
//     a group number, and each code pane grows a
//     column of tabs — "You" plus one per other member, showing their name
//     and verify history. A member's tab shows their code in that one pane,
//     read-only and unselectable, with their Verify state (disabled: only
//     they can run their code). A strikes line counts the whole group's ❌s
//     for the question. State is shared through the discuss server while
//     members are on the page.
//   * Pacing reminders: while in a group, a question's Verify is held back,
//     with a note and a Dismiss button beside it, when the group has 5
//     strikes on it (talk to staff first), or when you are the only member
//     to have passed an earlier question (bring the group along). Dismiss
//     re-enables it; dismissals are kept per page and group.
//   * Observer (staff view): a page opened with #discuss-view=<token> (the
//     View link on discuss.cs61a.org, see apps/discuss/server.py) watches
//     one group without joining it. No join bar, nothing saved or shared,
//     every editor read-only and Verify disabled; each pane shows a
//     member's work, with one tab per member and no "You" tab.
//
// The editors announce themselves with bubbling code-editor-ready events and
// expose a cmEditor handle on each wrapper (editor_src/code-editor.js);
// script order between the two files does not matter.

(function () {
  'use strict';

  var SERVER = 'https://discuss.cs61a.org';
  var PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js';
  var GLEAM_PLAYGROUND = 'https://playground.gleam.run/';
  var POLL_MS = 1000;        // group sync cadence
  var SAVE_MS = 2000;        // debounce for saving/sharing edits
  var STALE_AFTER = 3;       // failed polls before the offline notice
  var COOLDOWN_MS = 20000;   // Verify lockout after a failed run
  var ERROR_COOLDOWN_MS = 5000; // ...but only this after an exception
  var RUN_TIMEOUT_MS = 2000; // a verify slower than this counts as a failure
  var PASS = '✅';
  var FAIL = '❌';
  var MAX_HISTORY = 100;     // verify marks kept per question
  var MAX_NAME = 24;         // longer tab names are truncated to 22 + …
  var MAX_CODE = 20000;      // code chars shared/saved per question (server cap)
  var MAX_MEMBERS = 10;      // members shown at once (matches the server + palette)
  var STRIKE_LIMIT = 5;      // group strikes that hold a question's Verify back
  var AHEAD_NOTE = 'Please make sure the other members of your group also ' +
    'finish the previous questions before moving on.';

  // One background tint per group member, in each color scheme (same index
  // = same member). Light: near-white hue tints, close to the editors'
  // default light-gray ground so the differences stay subtle. Dark: the same
  // hues as very dark tints near the dark scheme's code-block ground, with
  // white text on top. Both go on the element as custom properties and
  // assignment.css picks one by [data-theme], so the site's live light/dark
  // toggle switches tints without a reload.
  var PALETTE = [
    '#fdf0e2', '#e9f7e6', '#e4f6f8', '#f9edfa', '#faf8e0',
    '#e8f0fc', '#fcecec', '#efecfb', '#e9f6ef', '#fbeff2',
  ];
  var DARK_PALETTE = [
    '#3a2a1c', '#1e3620', '#1a353b', '#361e39', '#37351a',
    '#1e2a45', '#3d1f1f', '#282244', '#1c3529', '#3b1f2a',
  ];

  // ── Page identity and storage ─────────────────────────────────────────────

  // One saved-answer record per discussion page; the origin scopes the two
  // course sites apart and the pathname scopes the discussions apart.
  var page = location.pathname.replace(/index\.html$/, '');
  if (page.slice(-1) !== '/') page += '/';
  var PAGE_URL = location.origin + page;
  var ANSWERS_KEY = 'discuss-answers:' + page;
  var COOLDOWN_KEY = 'discuss-cooldown:' + page;

  // Staff view: the token from a View link's hash. It stays in the URL (the
  // hash never reaches a server, and a reload keeps watching).
  var VIEW_TOKEN = (location.hash.match(/discuss-view=([^&]+)/) || [])[1] || null;
  var OBSERVER = !!VIEW_TOKEN;

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
  if (OBSERVER) answers = {};  // a watcher's own saved work never shows

  // qid -> epoch ms when a failed verify's cooldown ends, so a reload does
  // not skip the wait. Only the live ones are kept; the record goes away
  // once the last one runs out.
  var cooldowns = {};
  try { cooldowns = JSON.parse(stored(COOLDOWN_KEY)) || {}; } catch (e) {}
  if (OBSERVER) cooldowns = {};
  saveCooldowns();  // drop the ones that ran out while the page was closed

  // The pacing reminders this student dismissed, for one group (joining a
  // different group starts over): ahead[qid] for an earlier question they
  // passed first, strikes[qid] for a question at the strike limit.
  var DISMISSED_KEY = 'discuss-dismissed:' + page;
  var dismissed = null;
  try { dismissed = JSON.parse(stored(DISMISSED_KEY)); } catch (e) {}
  if (!dismissed || typeof dismissed !== 'object' ||
      !dismissed.ahead || !dismissed.strikes) {
    dismissed = { group: null, ahead: {}, strikes: {} };
  }

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

  // qid -> {wrapper, check, marks, output, pane, ownState, cooldownUntil,
  // visualize}.
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

  // The imports an editor hides because they only serve annotations
  // (render.hide_annotation_imports): `from collections.abc import Iterator`
  // must still run before the code, or its first def raises NameError.
  function prelude(q) {
    return (q.wrapper && q.wrapper.dataset.prelude) || '';
  }

  // What runs before an editor's code: the shared lib (data-lib), then the
  // hidden imports. In that order because a lib may open with a __future__
  // import, which must come first.
  function libCode(q) {
    return [q.lib, prelude(q)].filter(Boolean).join('\n\n');
  }

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
                         cooldownUntil: 0, visualize: null };
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
    if (q.output) q.output.hidden = true;
  }

  // What is saved and shared is bounded: a giant paste (all of Shakespeare
  // in a cell) is truncated rather than stored or sent whole. The editor
  // still holds the student's full text to work in.
  function clampCode(code) {
    return code.length > MAX_CODE ? code.slice(0, MAX_CODE) : code;
  }

  function record(qid, code, status, marks) {
    if (OBSERVER) return;
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
    buildVisualize(qid);
    if (OBSERVER) handle.setReadOnly(true);
  }

  function showMarks(qid) {
    var q = questions[qid];
    if (q.marks) q.marks.textContent = abbrev(history(answers[qid]));
  }

  var saveTimers = {};
  document.addEventListener('code-editor-change', function (event) {
    if (restoring || OBSERVER) return;
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
    if (OBSERVER) return;
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
    'import ast, doctest, io, json, tokenize, traceback',
    '',
    'def _discuss_examples(canonical):',
    '    # The doctests live in docstrings. Parsing the raw file text',
    '    # instead would run each docstring\'s closing quotes and the',
    '    # code after it into the last example\'s expected output.',
    '    parser = doctest.DocTestParser()',
    '    try:',
    '        tree = ast.parse(canonical)',
    '    except SyntaxError:',
    '        # A listing with fill-in blanks (e.g. a bare ____: line) does',
    '        # not parse, but it still tokenizes: take examples from its',
    '        # string literals only, for the same reason as the ast walk.',
    '        try:',
    '            tokens = list(tokenize.generate_tokens(',
    '                io.StringIO(canonical).readline))',
    '        except (tokenize.TokenError, SyntaxError):',
    '            return parser.get_examples(canonical)',
    '        examples = []',
    '        for token in tokens:',
    '            if token.type != tokenize.STRING:',
    '                continue',
    '            try:',
    '                text = ast.literal_eval(token.string)',
    '            except (ValueError, SyntaxError):',
    '                continue',
    '            if isinstance(text, str):',
    '                examples.extend(parser.get_examples(text))',
    '        return examples',
    '    examples = []',
    '    for node in ast.walk(tree):',
    '        if isinstance(node, (ast.Module, ast.ClassDef,',
    '                             ast.FunctionDef, ast.AsyncFunctionDef)):',
    '            docstring = ast.get_docstring(node, clean=False)',
    '            if docstring:',
    '                examples.extend(parser.get_examples(docstring))',
    '    return examples',
    '',
    'def _discuss_error(e):',
    '    # The one line Python would print last: the type and its message',
    '    # (a SyntaxError\'s names the line, since the code was compiled as',
    '    # "your code").',
    '    return type(e).__name__ + (": " + str(e) if str(e) else "")',
    '',
    'class _DiscussRunner(doctest.DocTestRunner):',
    '    # Remembers the first exception an example raised, in one line.',
    '    error = None',
    '    def report_unexpected_exception(self, out, test, example, exc_info):',
    '        if self.error is None:',
    '            self.error = (example.source.strip() + " raised "',
    '                          + _discuss_error(exc_info[1]))',
    '        doctest.DocTestRunner.report_unexpected_exception(',
    '            self, out, test, example, exc_info)',
    '',
    'def _discuss_check(canonical, student, lib="", deps="[]"):',
    '    examples = _discuss_examples(canonical)',
    '    env = {}',
    '    try:',
    '        # Shared classes the page ships alongside the question (data-lib,',
    '        # e.g. Link or the tree ADT): defined first so the doctests can',
    '        # use them, overridden by the student\'s own definitions.',
    '        if lib:',
    '            exec(lib, env)',
    '        # The group\'s answers to the questions this one may call',
    '        # (data-uses), since each editor is its own namespace. Each runs',
    '        # on its own and forgivingly: a dependency still holding blanks',
    '        # must not be reported as an error in this question\'s code, and',
    '        # a definition here overrides it.',
    '        for dep in json.loads(deps or "[]"):',
    '            try:',
    '                exec(dep, env)',
    '            except BaseException:',
    '                pass',
    '        exec(compile(student, "your code", "exec"), env)',
    '    except BaseException as e:',
    '        return json.dumps({"ok": False, "error": _discuss_error(e)})',
    '    if not examples:',
    '        return json.dumps({"ok": False,',
    '            "error": "No doctests found for this question."})',
    '    test = doctest.DocTest(examples, env, "question", None, 0, None)',
    '    out = io.StringIO()',
    '    runner = _DiscussRunner(verbose=False,',
    '        optionflags=doctest.ELLIPSIS)',
    '    result = runner.run(test, out=out.write, clear_globs=False)',
    '    return json.dumps({"ok": result.failed == 0, "error": runner.error,',
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
    '    try { out = check(data.canonical, data.student, data.lib, data.deps); }',
    '    finally { check.destroy(); }',
    '    postMessage(out);',
    '  }).catch(function () {',
    '    postMessage(JSON.stringify({ok: false, output: "runner error"}));',
    '  });',
    '};',
  ].join('\n');

  // ── Verify for Gleam (the playground's compiler, in a Web Worker) ───────

  // The Gleam playground (playground.gleam.run, served with CORS open) hosts
  // everything a check needs: compiler.js, its wrapper around the compiler
  // built for WebAssembly; stdlib.js, the stdlib's sources, which the
  // compiler checks imports against; and precompiled/, the prelude and stdlib
  // compiled to JavaScript, which compiled code imports. This follows the
  // playground's own worker.js, with a question's tests run in place of main.
  //
  // The function below is the worker's source (see ensureWorker), so it must
  // not use anything else in this file.
  function gleamWorker(base) {
    var project = null;
    var written = [];        // the modules the last verify wrote
    var ready = Promise.all([
      import(base + 'compiler.js'), import(base + 'stdlib.js'),
    ]).then(function (loaded) {
      return loaded[0].default().then(function (compiler) {
        var stdlib = loaded[1].default;
        project = compiler.newProject();
        Object.keys(stdlib).forEach(function (name) {
          project.writeModule(name, stdlib[name]);
        });
        // Load the precompiled modules now, so that a verify finds them in
        // the module map and only compiling and testing count toward its
        // time limit.
        return Promise.all(['gleam'].concat(Object.keys(stdlib)).map(
          function (name) { return import(base + 'precompiled/' + name + '.mjs'); }));
      });
    }).then(function () {
      postMessage('ready');
    }, function () {
      postMessage('failed');
    });

    // A compiled module as a URL to import: its imports of the question's
    // own modules point at those (LOCAL: name -> URL), the rest at the
    // precompiled stdlib, as in the playground's loadProgram.
    function moduleUrl(js, local) {
      // If echo has been used then add the import to the dict module that
      // the compiler would have added if the stdlib had have been present.
      if (js.indexOf('return value instanceof $stdlib$dict.default;') >= 0) {
        js = 'import * as $stdlib$dict from "./dict.mjs";\n' + js;
      }
      js = js.replace(/from\s+"\.\/(.+?)\.mjs"/g, function (match, name) {
        return 'from "' + (local[name] || base + 'precompiled/' + name + '.mjs') + '"';
      });
      return 'data:text/javascript;base64,' +
        btoa(unescape(encodeURIComponent(js)));
    }

    function check(data) {
      // Every module stays in the compiler's file system, so empty the last
      // verify's: a stale one that no longer compiles would fail this one.
      written.forEach(function (name) { project.writeModule(name, ''); });
      written = [data.module, data.testModule];
      project.writeModule(data.module, data.code);
      project.writeModule(data.testModule, data.test);
      try {
        project.compilePackage('javascript');
      } catch (error) {
        return { ok: false, compileError: String(error) };
      }
      project.takeWarnings();
      var local = {};
      local[data.module] = moduleUrl(
        project.readCompiledJavaScript(data.module), local);
      return import(moduleUrl(project.readCompiledJavaScript(data.testModule),
                              local)).then(function (tests) {
        var failed = false;
        var error = null;
        data.tests.forEach(function (name) {
          try {
            tests[name]();
          } catch (e) {
            failed = true;
            // A test's own failed assert is a wrong answer, not an error.
            if (e && e.gleam_error === 'assert' && e.module === data.testModule) return;
            if (!error) {
              error = {
                name: (e && e.name) || 'Error',
                message: String((e && e.message) || e),
                gleam: (e && e.gleam_error) || null,
                module: (e && e.module) || null,
                line: (e && e.line) || null,
              };
            }
          }
        });
        return { ok: !failed, error: error };
      });
    }

    self.onmessage = function (event) {
      ready.then(function () { return check(event.data); }).then(
        function (result) { postMessage(JSON.stringify(result)); },
        function (error) {
          postMessage(JSON.stringify({ ok: false, crash: String(error) }));
        });
    };
  }

  // ── Running checks in workers ─────────────────────────────────────────────

  // One worker per language, loaded on its first Verify. A worker posts
  // "ready" once loaded (or "failed": the Gleam one cannot load its
  // compiler), then one JSON result per message.
  var RUNTIMES = {
    python: { src: WORKER_SRC, options: {} },
    gleam: {
      src: '(' + gleamWorker.toString() + ')(' +
        JSON.stringify(GLEAM_PLAYGROUND) + ');',
      options: { type: 'module' },
    },
  };
  var workers = {};          // language -> {worker, ready: promise}
  var runQueue = Promise.resolve(); // verifies run one at a time

  function loaded(language) {
    return !!workers[language];
  }

  function ensureWorker(language) {
    if (workers[language]) return workers[language].ready;
    var runtime = RUNTIMES[language];
    var w = new Worker(URL.createObjectURL(
      new Blob([runtime.src], { type: 'text/javascript' })), runtime.options);
    var entry = { worker: w, ready: null };
    workers[language] = entry;
    entry.ready = new Promise(function (resolve, reject) {
      w.onmessage = function (event) {
        if (event.data === 'ready') resolve(w);
        if (event.data === 'failed') reject(new Error(language + ' load failed'));
      };
      w.onerror = function () { reject(new Error(language + ' load failed')); };
    }).catch(function (error) {
      if (workers[language] === entry) delete workers[language]; // retry next click
      w.terminate();
      throw error;
    });
    return entry.ready;
  }

  // Post MESSAGE to the LANGUAGE worker and resolve with its parsed result.
  function runInWorker(language, message) {
    var run = runQueue.then(function () {
      return ensureWorker(language).then(function (w) {
        return new Promise(function (resolve) {
          // Discard the worker; the next verify loads a fresh one. Used for
          // a run that runs too long or crashes the runtime (e.g. exhausts
          // its memory) — either way the page itself is never touched.
          function scrap(result) {
            var entry = workers[language];
            if (entry && entry.worker === w) delete workers[language];
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
          w.postMessage(message);
        });
      });
    });
    runQueue = run.then(function () {}, function () {});
    return run;
  }

  function runPython(q) {
    return runInWorker('python', {
      canonical: clampCode(api(q).original), student: clampCode(api(q).getText()),
      lib: libCode(q) || '', deps: usedCode(q) || '[]',
    });
  }

  // An editor's line in a Gleam widget's module template (render.
  // GLEAM_EDITOR_LINE).
  var GLEAM_EDITOR_LINE = /^\/\/ @discuss-editor (\S+)$/;

  // The module a Gleam question's code belongs to: the template with each
  // editor's line replaced by its code — yours for this question and the
  // ones before it, the published listing for later ones (which may still
  // hold a todo, and that compiles) and, given LISTINGS, for the earlier
  // ones too. The layout records the module lines each editor fills, to
  // report line numbers the way the editor numbers them, and `edited`
  // whether an earlier editor's code differs from its listing.
  function gleamModule(qid, listings) {
    var lines = [];
    var layout = [];
    var edited = false;
    var here = order.indexOf(qid);
    questions[qid].gleam.template.split('\n').forEach(function (line) {
      var match = GLEAM_EDITOR_LINE.exec(line);
      var dep = match && questions[match[1]];
      if (!dep || !api(dep)) {
        lines.push(line);
        return;
      }
      var text;
      var at = order.indexOf(match[1]);
      if (at > here || (listings && at < here)) text = api(dep).original;
      else if (showingMember(dep)) {
        text = (answers[match[1]] || {}).code || api(dep).original;
      } else text = api(dep).getText();
      if (at < here && text !== api(dep).original) edited = true;
      var chunk = text.split('\n');
      layout.push({ key: match[1], start: lines.length + 1,
                    end: lines.length + chunk.length });
      lines.push.apply(lines, chunk);
    });
    return { code: lines.join('\n'), layout: layout, edited: edited };
  }

  // Line LINE of the assembled module as the student sees it: "line 3" of
  // this question's editor, "line 3 of compose" in another, or '' outside
  // every editor.
  function gleamWhere(qid, layout, line) {
    for (var i = 0; i < layout.length; i++) {
      var chunk = layout[i];
      if (line >= chunk.start && line <= chunk.end) {
        return 'line ' + (line - chunk.start + 1) +
          (chunk.key === qid ? '' : ' of ' + chunk.key);
      }
    }
    return '';
  }

  // A compiler error in one line, like the last line Python prints for a
  // SyntaxError: the first diagnostic's title, where it is, and its
  // explanation (or, lacking one, the label under the code), e.g.
  // "Unknown variable on line 2: The name `y` is not in scope here."
  function gleamCompileError(qid, text, data, layout) {
    var first = text.split(/\n(?=error)/)[0];
    var title = (first.match(/^error: (.*)/) || [null, 'Compile error'])[1];
    var where = '';
    var at = first.match(/\/src\/(\S+)\.gleam:(\d+):\d+/);
    if (at && at[1] === data.module) where = gleamWhere(qid, layout, +at[2]);
    var label = (first.match(/│[ \t]*\^+[ \t]*(.*)$/m) || [])[1] || '';
    var explanation = first.split(/\n[ \t]*\n/).filter(function (part) {
      return part.trim() && !/[│┌]|^\s*(error|Hint):/.test(part);
    })[0] || '';
    var detail = explanation.trim().replace(/\s+/g, ' ') || label.trim();
    return title + (where ? ' on ' + where : '') +
      (at && at[1] === data.testModule ? ' in the tests' : '') +
      (detail ? ': ' + detail : '');
  }

  // An error a test run raised (other than a test's failed assert), e.g.
  // "Line 4: `todo` expression evaluated. This code has not yet been
  // implemented." or "RangeError: Maximum call stack size exceeded".
  function gleamRunError(qid, error, data, layout) {
    var where = error.module === data.module && error.line
      ? gleamWhere(qid, layout, error.line) : '';
    var message = error.gleam ? error.message : error.name + ': ' + error.message;
    return where ? where.charAt(0).toUpperCase() + where.slice(1) + ': ' + message
      : message;
  }

  // Whether a compiler error is in this question's own editor.
  function gleamOwnError(qid, text, data, layout) {
    var at = text.split(/\n(?=error)/)[0].match(/\/src\/(\S+)\.gleam:(\d+):\d+/);
    if (!at || at[1] !== data.module) return false;
    return layout.some(function (chunk) {
      return chunk.key === qid && +at[2] >= chunk.start && +at[2] <= chunk.end;
    });
  }

  // Compile and test the question's module. Like Python's harness, which
  // runs the earlier editors forgivingly, a mistake in an earlier editor
  // (an unfinished compose) must not block checking this one: when the
  // module does not compile and the error is not in this question's own
  // code, it is compiled again with the earlier editors' published
  // listings, and that run decides. (A syntax error can surface outside
  // the editor that caused it, past an unclosed brace, so anywhere but
  // this editor counts.)
  function runGleam(qid) {
    var q = questions[qid];
    function attempt(listings) {
      var built = gleamModule(qid, listings);
      var data = {
        module: q.gleam.module, code: clampCode(built.code),
        testModule: q.gleam.testModule, test: q.gleam.test, tests: q.gleam.tests,
      };
      return runInWorker('gleam', data).then(function (result) {
        if (result.compileError) {
          if (!listings && built.edited &&
              !gleamOwnError(qid, result.compileError, data, built.layout)) {
            return attempt(true);
          }
          return { ok: false, detail: result.compileError,
                   error: gleamCompileError(qid, result.compileError, data, built.layout) };
        }
        if (result.error) {
          return { ok: false, error: gleamRunError(qid, result.error, data, built.layout) };
        }
        if (result.crash) return { ok: false, error: result.crash };
        return result;
      });
    }
    return attempt(false);
  }

  // The code from the questions this one may call, to run before the
  // student's own (Verify's harness and the Visualize link both do): first
  // the earlier editors of a code file split among several questions
  // (data-file, e.g. the Interval class before add_interval), then the
  // questions named in data-uses. A member's pane shows their code rather
  // than yours, so fall back to your own saved answer there.
  function usedSources(q) {
    var code = [];
    var names = [];
    var file = q.wrapper && q.wrapper.dataset.file;
    if (file) {
      var editors = document.querySelectorAll('.code-editor');
      for (var i = 0; i < editors.length && editors[i] !== q.wrapper; i++) {
        if (editors[i].dataset.file === file) {
          names.push(questionFor(editors[i]));
        }
      }
    }
    names.concat(q.uses || []).forEach(function (name) {
      var dep = questions[name];
      if (!dep) return;
      var text = showingMember(dep)
        ? (answers[name] || {}).code || ''
        : (api(dep) ? api(dep).getText() : '');
      if (text) code.push(clampCode(
        prelude(dep) ? prelude(dep) + '\n\n' + text : text));
    });
    return code;
  }

  function usedCode(q) {
    return JSON.stringify(usedSources(q));
  }

  function runCheck(qid) {
    var q = questions[qid];
    if (!q || !api(q) || showingMember(q) || OBSERVER) return;
    var button = q.check;
    var cooldownMs = 0;  // set by a failed run
    q.running = true;
    button.disabled = true;
    var language = q.gleam ? 'gleam' : 'python';
    button.textContent = loaded(language) ? 'Checking…'
      : q.gleam ? 'Loading Gleam…' : 'Loading Python…';
    (q.gleam ? runGleam(qid) : runPython(q)).then(function (result) {
      var status = result.ok ? 'green' : 'red';
      var marks = history(answers[qid]) + (result.ok ? PASS : FAIL);
      if (marks.length > MAX_HISTORY) { // invisible middle marks give way
        marks = marks.slice(0, 4) + marks.slice(4 - MAX_HISTORY);
      }
      setStatus(qid, status);
      // An exception is named next to the button, to the right of the
      // marks (its type and one-line message, from the harness: a
      // SyntaxError or NameError in the code, or the first one an example
      // raised; for Gleam, a compiler error or one a test raised, with the
      // compiler's full report on hover). Beyond that only the outcome is
      // reported (the button color and ❌ mark), not the failing doctests
      // or tests: working out what went wrong is the exercise.
      if (q.output) {
        q.output.textContent = result.error || '';
        q.output.title = result.detail || '';
        q.output.hidden = !result.error;
      }
      record(qid, api(q).getText(), status, marks);
      showMarks(qid);
      renderPanes();
      // An exception (a SyntaxError or NameError in the code, or one an
      // example raised) is a quick fix, so it earns a much shorter wait
      // than failing doctests or a timeout.
      if (!result.ok) cooldownMs = result.error ? ERROR_COOLDOWN_MS : COOLDOWN_MS;
    }).catch(function () {
      if (q.output) {
        q.output.textContent = 'Could not load the ' +
          (q.gleam ? 'Gleam compiler' : 'Python runtime') +
          '; check your connection and try again.';
        q.output.hidden = false;
      }
    }).then(function () {
      // Reset the label before the cooldown ring is added: setting
      // textContent replaces the button's children.
      button.textContent = 'Verify';
      q.running = false;
      button.disabled = locked(qid);
      if (cooldownMs) startCooldown(qid, 0, cooldownMs);
    });
  }

  // ── Cooldown: 20s between failed verifies (5s after an exception) ────────

  function coolingDown(q) { return q.cooldownUntil > Date.now(); }

  // Whether the question's Verify button is disabled: mid-run, cooling
  // down, showing a member's code, or held back by a pacing reminder.
  function locked(qid) {
    var q = questions[qid];
    return OBSERVER || !!q.running || showingMember(q) || coolingDown(q) ||
      reminders(qid).length > 0;
  }

  function saveCooldowns() {
    var now = Date.now();
    Object.keys(cooldowns).forEach(function (qid) {
      if (!(cooldowns[qid] > now)) delete cooldowns[qid];
    });
    store(COOLDOWN_KEY,
          Object.keys(cooldowns).length ? JSON.stringify(cooldowns) : null);
  }

  // A fresh cooldown of `ms` (the full COOLDOWN_MS unless given), or
  // (given `until`, from storage) the rest of one that a reload
  // interrupted. A saved deadline never buys more than a full cooldown,
  // in case the clock has moved.
  function startCooldown(qid, until, ms) {
    var q = questions[qid];
    var now = Date.now();
    q.cooldownUntil = Math.min(until || 0, now + COOLDOWN_MS)
                      || now + (ms || COOLDOWN_MS);
    cooldowns[qid] = q.cooldownUntil;
    saveCooldowns();
    q.check.disabled = true;
    function step() {
      var left = q.cooldownUntil - Date.now();
      if (left <= 0) {
        clearInterval(timer);
        delete cooldowns[qid];
        saveCooldowns();
        q.check.textContent = 'Verify';
        q.check.disabled = locked(qid);
        return;
      }
      // Counts 20, 15, 10, 5: a 5-second tick is enough to explain the
      // wait without the flicker of a per-second countdown.
      q.check.textContent =
        'Retry in ' + (Math.ceil(left / 5000) * 5) + 's';
    }
    step();
    var timer = setInterval(step, 5000);
  }

  // ── Visualize (Python Tutor, in a new tab) ───────────────────────────────

  // A link beside Reset in the editor's action row, to a Python Tutor
  // diagram of the code in the pane with the listing's doctests appended as
  // calls so there is something to step through: a red button says only
  // that something is wrong, and this is how a student finds out what.
  // The Composing Programs edition of Python Tutor (the textbook's and the
  // lectures'), not the vanilla visualizer: it draws lists and function
  // parents the way the course does. mode=display opens straight on the
  // diagram. A new tab, not an iframe: the page is a full one, with its
  // own title, links, and ads, and the diagram wants the room anyway.
  var TUTOR_URL = 'https://pythontutor.com/cp/composingprograms.html#code=';
  var TUTOR_OPTS = '&cumulative=true&curInstr=0&mode=display' +
                   '&origin=composingprograms.js&py=3&rawInputLstJSON=%5B%5D';
  var PROMPT = /^>>>( |$)/;
  var CONTINUE = /^\.\.\.( |$)/;

  // The calls in the listing's doctests: every `>>>` line plus the `...`
  // continuations right after it, without prompts or expected output. A
  // bare `...` body only counts as a continuation when it follows a prompt.
  function doctestCalls(original) {
    var calls = [];
    var inExample = false;
    original.split('\n').forEach(function (line) {
      var text = line.replace(/^\s+/, '');
      if (PROMPT.test(text) || (inExample && CONTINUE.test(text))) {
        calls.push(text.slice(4));
        inExample = true;
      } else {
        inExample = false;   // expected output, prose, or ordinary code
      }
    });
    return calls.join('\n');
  }

  function tutorCode(qid) {
    var q = questions[qid];
    var parts = [];
    var lib = libCode(q);             // Link, the tree ADT: as Verify does
    if (lib) parts.push(lib);
    // The code this one builds on, also as Verify does: otherwise the
    // diagram stops at a NameError.
    parts = parts.concat(usedSources(q));
    parts.push(api(q).getText());
    var calls = doctestCalls(api(q).original);
    if (calls) parts.push('# doctests\n' + calls);
    return clampCode(parts.join('\n\n'));
  }

  function tutorUrl(code) {
    return TUTOR_URL + encodeURIComponent(code) + TUTOR_OPTS;
  }

  // The link carries the program in its fragment, so it is rebuilt from the
  // pane on the events that precede a navigation — rather than on every
  // keystroke — which keeps it a real link: middle-click and cmd-click open
  // the current code too. (A groupmate's code is never offered: the action
  // row is hidden with their pane, and the guard here backs that up.)
  function freshenLink(qid) {
    var q = questions[qid];
    if (!api(q) || showingMember(q)) return;
    q.visualize.href = tutorUrl(tutorCode(qid));
  }

  // Built once the question has both its editor (the row to sit in) and its
  // Verify widget (the doctests and lib to include); either can come second.
  // A discussion published with `visualize: false` gets none.
  function buildVisualize(qid) {
    var q = questions[qid];
    if (OBSERVER || q.visualize || q.noVisualize || !q.check || !api(q)) return;
    var actions = q.wrapper.querySelector('.code-editor-actions');
    if (!actions) return;
    var link = document.createElement('a');
    link.className = 'discuss-visualize';
    link.href = TUTOR_URL;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Visualize';
    link.title = 'Step through an environment diagram of this code in ' +
                 'Python Tutor (opens a new tab)';
    ['pointerdown', 'focus', 'click'].forEach(function (event) {
      link.addEventListener(event, function () { freshenLink(qid); });
    });
    actions.prepend(link);
    q.visualize = link;
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
    button.disabled = OBSERVER;  // only a member can run their own code
    button.addEventListener('click', function () { runCheck(qid); });
    var marks = document.createElement('span');
    marks.className = 'discuss-history';
    var output = document.createElement('code');  // exception, after the marks
    output.className = 'discuss-check-output';
    output.hidden = true;
    var notes = document.createElement('span');  // pacing reminders, last
    notes.className = 'discuss-reminders';
    notes.hidden = true;
    box.append(button, marks, output, notes);
    q.lib = box.dataset.lib || '';
    q.uses = (box.dataset.uses || '').split(/\s+/).filter(Boolean);
    q.noVisualize = box.dataset.visualize === 'false';
    if (box.dataset.language === 'gleam') {
      q.gleam = {
        module: box.dataset.module, template: box.dataset.template || '',
        testModule: box.dataset.testModule, test: box.dataset.test || '',
        tests: (box.dataset.tests || '').split(/\s+/).filter(Boolean),
      };
    }
    q.check = button;
    q.marks = marks;
    q.output = output;
    q.notes = notes;
    buildVisualize(qid);
    showMarks(qid);
    // A cooldown that a reload interrupted picks up where it left off.
    if (!OBSERVER && cooldowns[qid] > Date.now()) startCooldown(qid, cooldowns[qid]);
  });

  // ── Group membership (top bar) ────────────────────────────────────────────

  var group = null;          // the group's name (trimmed) while joined
  var name = stored('discuss-name') || '';
  var email = stored('discuss-email') || '';
  // A Berkeley address (any case); the server does not check it again.
  var EMAIL = /^[^\s@]+@berkeley\.edu$/i;
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

    joined = document.createElement('div');
    joined.className = 'discuss-joined';
    hint = document.createElement('span');
    hint.className = 'discuss-hint';
    hint.hidden = true;

    if (OBSERVER) {
      // No form, no Leave, no auto-rejoin: `group` stays null, so nothing
      // ever syncs or leaves on this page's behalf.
      bar.append(joined, hint);
      assignment.insertBefore(bar, assignment.firstChild);
      showObserving(null);
      startObserving();
      return;
    }

    form = document.createElement('form');
    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Name';
    nameInput.maxLength = 32;
    nameInput.value = name;
    nameInput.setAttribute('aria-label', 'Name');
    var emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = '@berkeley.edu email address';
    emailInput.autocomplete = 'email';
    emailInput.maxLength = 254;
    emailInput.value = email;
    emailInput.setAttribute('aria-label', '@berkeley.edu email address');
    var groupInput = document.createElement('input');
    groupInput.type = 'text';  // any name: 3, 3a, "back table"…
    groupInput.maxLength = 64;
    groupInput.placeholder = 'Group number';
    groupInput.setAttribute('aria-label', 'Group number');
    var join = document.createElement('button');
    join.type = 'submit';
    join.textContent = 'Join Group';
    join.disabled = true;
    function validate() {
      join.disabled = !(nameInput.value.trim() && groupInput.value.trim()
                        && EMAIL.test(emailInput.value.trim()));
    }
    nameInput.addEventListener('input', validate);
    emailInput.addEventListener('input', validate);
    groupInput.addEventListener('input', validate);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      joinGroup(nameInput.value.trim(), emailInput.value.trim(),
                groupInput.value.trim());
    });
    var label = document.createElement('span');
    label.className = 'discuss-bar-label';
    label.textContent = 'Discuss with your group:';
    form.append(label, nameInput, emailInput, groupInput, join);
    joined.hidden = true;
    bar.append(form, joined, hint);
    assignment.insertBefore(bar, assignment.firstChild);

    var saved = stored('discuss-group');
    if (saved && saved.trim()) {
      groupInput.value = saved.trim();
      validate();              // setting .value fires no input event
      // Auto-rejoin is idempotent. A browser whose saved name and group
      // predate the email field gets the form once, prefilled.
      if (name && EMAIL.test(email)) joinGroup(name, email, saved.trim());
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

  // The observer's bar: who is watching what, and the way back to the tiles.
  function showObserving(label, back) {
    joined.textContent = '';
    var who = document.createElement('strong');
    who.textContent = 'Staff view';
    var text = document.createElement('span');
    text.textContent = label === null ? ' — connecting… ' : ' — Group ' + label + ' ';
    var link = document.createElement('a');
    link.href = back || SERVER + '/';  // this course's staff view
    link.textContent = 'Active groups';
    joined.append(who, text, link);
  }

  function joinGroup(newName, newEmail, newGroup) {
    name = newName;
    email = newEmail;
    group = newGroup;
    store('discuss-name', name);
    store('discuss-email', email);
    store('discuss-group', group);
    if (dismissed.group !== group) {  // another group's dismissals don't carry
      dismissed = { group: group, ahead: {}, strikes: {} };
      saveDismissed();
    }
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
      client: clientId, name: name, email: email, page: PAGE_URL,
      group: group, leave: true,
    }));
  });

  // ── Sync ──────────────────────────────────────────────────────────────────

  function payload(leave) {
    var body = {
      client: clientId, name: name, email: email, page: PAGE_URL, group: group,
    };
    if (leave) {
      body.leave = true;
      return body;
    }
    if (dirty) body.answers = answers;
    return body;
  }

  // Carry the status so a caller can tell "server rejected us" (4xx) apart
  // from "server unreachable" (a network failure, which rejects the fetch
  // itself with no status).
  function parsed(response) {
    if (!response.ok) {
      var error = new Error('sync ' + response.status);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  function sync(leave) {
    // No Content-Type header: the request stays CORS-simple (no preflight).
    return fetch(SERVER + '/sync', {
      method: 'POST',
      body: JSON.stringify(payload(leave)),
    }).then(parsed);
  }

  function observe() {
    return fetch(SERVER + '/observe', {
      method: 'POST',
      body: JSON.stringify({ token: VIEW_TOKEN }),
    }).then(parsed);
  }

  // Replace the membership with the server's reply and redraw the panes.
  function applyMembers(data) {
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
      applyMembers(data);
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

  // ── Observing (staff view) ────────────────────────────────────────────────

  var observedGroup = null;  // the group label shown in the bar

  function observePoll() {
    observe().then(function (data) {
      failCount = 0;
      hint.hidden = true;
      if (String(data.group) !== observedGroup) {
        observedGroup = String(data.group);
        showObserving(observedGroup, data.back);
      }
      applyMembers(data);
    }).catch(function (error) {
      if (error && error.status === 403) {
        // The token was signed for a few hours; after that, come back in
        // through the tiles page for a fresh one.
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        showHint('This staff view link has expired; reopen it from '
          + SERVER.replace(/^https?:\/\//, '') + '.');
        return;
      }
      failCount++;
      if (failCount >= STALE_AFTER) {
        showHint('Staff view is offline (can\'t reach the server); retrying.');
      }
    });
  }

  function startObserving() {
    if (!pollTimer) pollTimer = setInterval(observePoll, POLL_MS);
    observePoll();
  }

  // ── Per-pane member tabs ──────────────────────────────────────────────────

  // First-come color assignment: hash the id for a stable starting slot,
  // then probe past slots already taken so two members never share a color
  // (the palette covers the max group size). Assignments stick for the
  // session even if a member leaves.
  var colorSlots = {};       // client id -> palette index

  function slotFor(id) {
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
    return colorSlots[id];
  }

  // Give an element a member's tint in both schemes; the stylesheet applies
  // whichever matches the page's [data-theme].
  function tint(el, id) {
    var slot = slotFor(id);
    el.style.setProperty('--discuss-tint', PALETTE[slot]);
    el.style.setProperty('--discuss-tint-dark', DARK_PALETTE[slot]);
  }

  function untint(el) {
    el.style.removeProperty('--discuss-tint');
    el.style.removeProperty('--discuss-tint-dark');
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
    tint(q.wrapper, id);
    handle.setReadOnly(true);
    silently(function () { handle.setText(''); });
    renderPaneTabs(qid);
    renderReminder(qid);   // your reminders hide while their code shows
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
    untint(q.wrapper);
    var handle = api(q);
    if (handle) {
      silently(function () {
        if (handle.getText() !== q.pane.ownText) handle.setText(q.pane.ownText);
      });
      handle.setReadOnly(OBSERVER);
    }
    if (q.check) {
      q.check.dataset.state = q.ownState;
      showMarks(qid);
    }
    renderPaneTabs(qid);
    renderReminder(qid);
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
    if (!OBSERVER) {  // a watcher has no work of their own to show
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
    }
    memberOrder.forEach(function (id) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'discuss-tab';
      tint(tab, id);
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
      // A watcher's pane always shows someone: the first member until a
      // tab is clicked, the next one when the shown member leaves.
      if (OBSERVER && !q.pane.showing) showMember(qid, memberOrder[0]);
      renderPaneTabs(qid);
      if (q.pane.showing) refreshShown(qid);
    });
    order.forEach(renderReminder);
  }

  // ── Pacing reminders (hold Verify back until dismissed) ──────────────────

  function saveDismissed() {
    store(DISMISSED_KEY, JSON.stringify(dismissed));
  }

  function passed(marks) { return marks.indexOf(PASS) >= 0; }

  // You have passed this question and no one else in the group has.
  function aheadOn(qid) {
    return passed(history(answers[qid])) && !memberOrder.some(function (id) {
      return passed(history(memberAnswer(id, qid)));
    });
  }

  // The reminders holding this question's Verify back, as [kind, text]
  // pairs: the group is at the strike limit on it, or you alone have passed
  // an earlier question. Only while the group has other members (the
  // strikes line is showing), and never for a watcher.
  function reminders(qid) {
    if (OBSERVER || !group || !memberOrder || !memberOrder.length) return [];
    var list = [];
    var count = strikes(qid);
    if (count >= STRIKE_LIMIT && !dismissed.strikes[qid]) {
      list.push(['strikes', 'Your group has ' + count + ' strikes. We ' +
        'recommend that you talk to someone from the course staff before ' +
        'trying again.']);
    }
    var earlier = order.slice(0, order.indexOf(qid));
    if (earlier.some(function (p) {
      return questions[p].check && !dismissed.ahead[p] && aheadOn(p);
    })) {
      list.push(['ahead', AHEAD_NOTE]);
    }
    return list;
  }

  // Dismissing the strikes reminder frees this question; dismissing the
  // ahead reminder frees every later question, for each question you are
  // ahead on now (passing another one first brings the reminder back).
  function dismiss(kind, qid) {
    if (kind === 'strikes') {
      dismissed.strikes[qid] = true;
    } else {
      order.forEach(function (p) {
        if (questions[p].check && aheadOn(p)) dismissed.ahead[p] = true;
      });
    }
    saveDismissed();
    order.forEach(renderReminder);
  }

  // Show a question's reminders beside its Verify button (none while a
  // member's code is shown there) and set the button to match. The notes
  // are rebuilt only when their text changes, so a poll never replaces a
  // Dismiss button under a click.
  function renderReminder(qid) {
    var q = questions[qid];
    if (!q.check) return;
    var list = showingMember(q) ? [] : reminders(qid);
    var sig = JSON.stringify(list);
    if (q.notesSig !== sig) {
      q.notesSig = sig;
      q.notes.textContent = '';
      list.forEach(function (item) {
        var note = document.createElement('span');
        note.className = 'discuss-reminder';
        note.dataset.kind = item[0];
        var text = document.createElement('span');
        text.textContent = item[1];
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'discuss-dismiss';
        button.textContent = 'Dismiss';
        button.addEventListener('click', function () { dismiss(item[0], qid); });
        note.append(text, button);
        q.notes.appendChild(note);
      });
      q.notes.hidden = list.length === 0;
    }
    q.check.disabled = locked(qid);
  }

  buildBar();
})();
