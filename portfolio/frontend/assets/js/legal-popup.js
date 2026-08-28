function showLegalPopup() {
    return new Promise((resolve) => {
        const overlay = document.getElementById("legalPopupOverlay");
        const textEl = document.getElementById("legalPopupText");
        const okBtn = document.getElementById("legalPopupOk");

        if (!overlay || !textEl || !okBtn) {
            resolve();
            return;
        }

        const titleEl = document.getElementById("legalPopupTitle");
        if (titleEl && typeof i18n !== "undefined") {
            titleEl.textContent = i18n.t("legal.warningTitle");
        }
        textEl.textContent = typeof i18n !== "undefined" ? i18n.t("legal.warning") : textEl.textContent;
        overlay.classList.add("is-open");

        function onOk() {
            overlay.classList.remove("is-open");
            okBtn.removeEventListener("click", onOk);
            resolve();
        }

        okBtn.addEventListener("click", onOk);
    });
}

window.showLegalPopup = showLegalPopup;