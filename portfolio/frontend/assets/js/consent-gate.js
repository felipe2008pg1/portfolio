(function () {
  "use strict";
  var STORAGE_KEY = "terms_accepted_at_v1";
  var CONSENT_DURATION_MS = 2 * 60 * 1000; // re-ask after this long — bump to e.g. 30 days in production

  function hasValidConsent() {
    var storedAt = Number(localStorage.getItem(STORAGE_KEY));
    if (!storedAt) return false;
    return Date.now() - storedAt < CONSENT_DURATION_MS;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (hasValidConsent()) return;

    var overlay = document.getElementById("consentGateOverlay");
    var checkbox = document.getElementById("consentGateCheckbox");
    var button = document.getElementById("consentGateButton");
    if (!overlay || !checkbox || !button) return;

    document.body.style.overflow = "hidden";
    overlay.classList.add("is-open");

    checkbox.addEventListener("change", function () {
      button.disabled = !checkbox.checked;
    });

    button.addEventListener("click", function () {
      if (!checkbox.checked) return;
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    });
  });
})();