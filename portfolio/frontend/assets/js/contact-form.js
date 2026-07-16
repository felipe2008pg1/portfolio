document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const submitBtn = document.getElementById("contactSubmit");
  const statusEl = document.getElementById("formStatus");

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `form-status is-visible is-${type}`;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      subject: String(formData.get("subject") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: String(formData.get("website") || ""),
      turnstile_token: window.turnstile ? window.turnstile.getResponse() : "",
    };

    if (payload.website.length > 0) {
      showStatus(i18n.t("contact.successSent"), "success");
      form.reset();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = i18n.t("contact.submitting");
    statusEl.className = "form-status";

    try {
      const result = await api.sendContact(payload);
      showStatus(i18n.t("contact.successOpening"), "success");
      form.reset();

      const whatsappWindow = window.open(result.whatsapp_url, "_blank", "noopener,noreferrer");
      if (!whatsappWindow) {
        showStatus(i18n.t("contact.successManual"), "success");
        const link = document.createElement("a");
        link.href = result.whatsapp_url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = i18n.t("contact.openWhatsapp");
        link.className = "btn btn-primary";
        link.style.marginTop = "12px";
        statusEl.appendChild(document.createElement("br"));
        statusEl.appendChild(link);
      }
    } catch (error) {
      if (error.status === 429) {
        showStatus(i18n.t("contact.errorRateLimit"), "error");
      } else {
        showStatus(error.message || i18n.t("contact.errorGeneric"), "error");
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = i18n.t("contact.submit");
      if (window.turnstile) window.turnstile.reset();
    }
  });
});