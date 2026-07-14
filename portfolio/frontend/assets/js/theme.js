const THEME_KEY = "theme";

function getPreferredTheme() {
  const stored = localStorage.getItem(THEME_KEY);

  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function updateThemeToggleUI(theme) {
  const btn = document.getElementById("themeToggle");

  if (!btn) return;

  const icon = btn.querySelector(".theme-toggle-icon");

  if (icon) icon.textContent = theme === "dark" ? "☀" : "☾";

  btn.setAttribute("aria-pressed", String(theme === "dark"));
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeToggleUI(theme);
}

function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

// Apply before DOMContentLoaded to prevent a flash of the wrong theme.
applyTheme(getPreferredTheme());

document.addEventListener("DOMContentLoaded", () => {
  applyTheme(getPreferredTheme());

  const btn = document.getElementById("themeToggle");

  if (!btn) return;

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");

    setTheme(current === "dark" ? "light" : "dark");
  });
});