(() => {
  const href = "/assets/css/books-terminal-deferred.css";
  const styleRole = "books-shell-deferred";

  if (document.querySelector(`link[data-style-role="${styleRole}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.media = "print";
  link.dataset.styleRole = styleRole;

  const activateDeferredStyles = () => {
    link.media = "all";
  };

  link.addEventListener("load", activateDeferredStyles, { once: true });
  document.head.appendChild(link);
})();
