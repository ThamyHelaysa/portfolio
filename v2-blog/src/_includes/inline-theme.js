(function() {
  // JS-presence marker: CSS keeps pre-upgrade custom elements invisible only
  // under html.js, so no-JS visitors still see the server-rendered fallback.
  document.documentElement.classList.add("js");

  const saved = localStorage.getItem("theme");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = saved === "dark" || (!saved && systemDark);
  if (isDark) {
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();