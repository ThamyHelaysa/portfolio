(function () {
  window.addEventListener("open:modal", ({ detail }) => {
    document.querySelector("note-modal").setAttribute("node-tmpl", detail.value);
  });
})();