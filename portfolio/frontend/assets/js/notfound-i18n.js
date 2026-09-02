(function () {
  var SUPPORTED = ["pt", "en"];
  var lang = localStorage.getItem("lang");
  if (SUPPORTED.indexOf(lang) === -1) {
    lang = navigator.language && navigator.language.toLowerCase().indexOf("en") === 0 ? "en" : "pt";
  }

  function apply() {
    document.documentElement.setAttribute("lang", lang === "en" ? "en" : "pt-BR");
    document.querySelectorAll("[data-i18n-pt]").forEach(function (el) {
      el.textContent = el.getAttribute(lang === "en" ? "data-i18n-en" : "data-i18n-pt");
    });
    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  document.querySelectorAll("[data-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = btn.getAttribute("data-lang");
      if (SUPPORTED.indexOf(next) === -1 || next === lang) return;
      lang = next;
      localStorage.setItem("lang", lang);
      apply();
    });
  });

  apply();
})();