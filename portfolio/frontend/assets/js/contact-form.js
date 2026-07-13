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
    };

    if (payload.website.length > 0) {
      showStatus("Mensagem enviada! Você será redirecionado ao WhatsApp.", "success");
      form.reset();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando…";
    statusEl.className = "form-status";

    try {
      const result = await api.sendContact(payload);
      showStatus("Mensagem enviada! Abrindo o WhatsApp…", "success");
      form.reset();

      const whatsappWindow = window.open(result.whatsapp_url, "_blank", "noopener,noreferrer");
      if (!whatsappWindow) {
        showStatus("Mensagem enviada! Clique para abrir o WhatsApp.", "success");
        const link = document.createElement("a");
        link.href = result.whatsapp_url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Abrir WhatsApp";
        link.className = "btn btn-primary";
        link.style.marginTop = "12px";
        statusEl.appendChild(document.createElement("br"));
        statusEl.appendChild(link);
      }
    } catch (error) {
      if (error.status === 429) {
        showStatus("Muitas tentativas. Aguarde um pouco antes de enviar novamente.", "error");
      } else {
        showStatus(error.message || "Não foi possível enviar. Tente novamente.", "error");
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar via WhatsApp";
    }
  });
});