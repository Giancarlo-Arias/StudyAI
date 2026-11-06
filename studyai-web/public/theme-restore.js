try {
  const theme = globalThis.localStorage.getItem("studyai-theme");
  if (theme === "light" || theme === "dark") {
    globalThis.document.documentElement.dataset.theme = theme;
  }
} catch {
  globalThis.document.documentElement.removeAttribute("data-theme");
}
