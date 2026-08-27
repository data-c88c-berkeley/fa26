// Support script for assignment pages emitted by the assignment builder:
// copy buttons on pytest command boxes, and a sticky python3/python/py
// switch so Windows students see (and copy) commands that use their
// interpreter.

// Adds a copy button to each pytest command box emitted by the assignment
// builder. dataset.command is read at click time so it reflects the
// python3/python switch below.
document.querySelectorAll('.pytest-command').forEach(function (box) {
  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'pytest-copy';
  button.textContent = 'Copy';
  button.addEventListener('click', function () {
    navigator.clipboard.writeText(box.dataset.command).then(function () {
      button.textContent = 'Copied!';
      setTimeout(function () { button.textContent = 'Copy'; }, 1500);
    });
  });
  box.appendChild(button);
});

// Commands are authored for Mac/Linux, where the interpreter is `python3`;
// on Windows it is `python` (or the `py` launcher). Wrap each python3 token
// inside a command block in a span so the whole page can be flipped between
// the interpreter names, defaulting to python3 or python from the visitor's
// OS and remembering an explicit choice across pages.
// Inline code in prose is left alone (it may be discussing the difference).
(function () {
  var TOKEN = /\bpython3\b/;
  var names = [];
  document.querySelectorAll('.assignment pre code').forEach(function (code) {
    var walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var match;
      while ((match = TOKEN.exec(node.data))) {
        var rest = node.splitText(match.index + 'python3'.length);
        var span = document.createElement('span');
        span.className = 'python-name';
        span.textContent = 'python3';
        node.parentNode.replaceChild(span, node.splitText(match.index));
        names.push(span);
        node = rest;
      }
    });
  });
  var boxes = Array.prototype.filter.call(
    document.querySelectorAll('.pytest-command'),
    function (box) { return TOKEN.test(box.dataset.command); }
  ).map(function (box) { return { box: box, command: box.dataset.command }; });
  if (!names.length && !boxes.length) return;

  var KEY = 'python-command';
  function remembered() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function remember(name) {
    try { localStorage.setItem(KEY, name); } catch (e) {}
  }
  var platform = (navigator.userAgentData && navigator.userAgentData.platform)
    || navigator.platform || '';
  var isWindows = /^win/i.test(platform) || /windows/i.test(navigator.userAgent);

  var buttons = {};
  function apply(name) {
    names.forEach(function (span) { span.textContent = name; });
    boxes.forEach(function (entry) {
      entry.box.dataset.command = entry.command.replace(/\bpython3\b/g, name);
    });
    Object.keys(buttons).forEach(function (key) {
      buttons[key].classList.toggle('active', key === name);
      buttons[key].setAttribute('aria-pressed', String(key === name));
    });
  }

  var bar = document.createElement('div');
  bar.className = 'python-toggle';
  var pill = document.createElement('div');
  pill.className = 'python-toggle-pill';
  pill.setAttribute('role', 'group');
  pill.setAttribute('aria-label', 'Operating system for Python commands');
  var label = document.createElement('span');
  label.className = 'python-toggle-label';
  label.textContent = 'Python command:';
  pill.appendChild(label);
  [
    { name: 'python3', os: 'Mac/Linux' },
    { name: 'python', os: 'Windows' },
    { name: 'py', os: 'Windows (py launcher)' }
  ].forEach(function (choice) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = choice.name;
    button.title = 'Show Python commands as ' + choice.name +
      ', as typically run on ' + choice.os;
    button.addEventListener('click', function () {
      apply(choice.name);
      remember(choice.name);
    });
    buttons[choice.name] = button;
    pill.appendChild(button);
  });
  bar.appendChild(pill);
  var assignment = document.querySelector('.assignment') || document.body;
  assignment.insertBefore(bar, assignment.firstChild);

  apply(remembered() || (isWindows ? 'python' : 'python3'));
})();
