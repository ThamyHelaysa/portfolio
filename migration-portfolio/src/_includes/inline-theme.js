// (function() {
//   const saved = localStorage.getItem("theme");
//   const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
//   const isDark = saved === "dark" || (!saved && systemDark);
//   if (isDark) {
//     document.documentElement.classList.add("dark");
//     document.documentElement.setAttribute("data-theme", "dark");
//   }
// })();