// Adds a copy button to each pytest command box emitted by the assignment builder.
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
