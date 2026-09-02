function loginText(key, fallback) {
  return typeof i18n !== "undefined" ? i18n.t(key) : fallback;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof i18n !== "undefined") i18n.apply();

  const form = document.getElementById("loginForm");
  const submitBtn = document.getElementById("loginSubmit");
  const alertEl = document.getElementById("loginAlert");
  const mfaForm = document.getElementById("mfaForm");
  const mfaSubmitBtn = document.getElementById("mfaSubmit");
  let mfaAlertEl = document.getElementById("mfaAlert");
  let pendingMfaToken = null;

  if (!mfaAlertEl) {
    mfaAlertEl = document.createElement("div");
    mfaAlertEl.id = "mfaAlert";
    mfaAlertEl.className = "admin-alert";
    mfaForm.prepend(mfaAlertEl);
  }

  function showAlert(message) {
    alertEl.textContent = message;
    alertEl.className = "admin-alert is-visible is-error";
  }

  function showMfaAlert(message) {
    mfaAlertEl.textContent = message;
    mfaAlertEl.className = "admin-alert is-visible is-error";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    alertEl.className = "admin-alert";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const turnstileToken = window.turnstile ? window.turnstile.getResponse() : "";

    if (!username || !password) {
      showAlert(loginText("admin.login.errorFields", "Preencha usuário e senha."));
      return;
    }

    if (!turnstileToken) {
      showAlert("Complete a verificação de segurança antes de entrar.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = loginText("admin.login.submitting", "Entrando…");

    try {
      const result = await adminApi.login(username, password, turnstileToken);

      if (result && result.mfa_required) {
        pendingMfaToken = result.mfa_token;
        form.style.display = "none";
        mfaForm.style.display = "";
        submitBtn.disabled = false;
        submitBtn.textContent = loginText("admin.login.submit", "Entrar");
        document.getElementById("mfaCode").focus();
        return;
      }

      window.location.href = "dashboard.html";
      return;
    } catch (error) {
      console.error("[admin] falha no login:", error);
      if (error.status === 429) {
        showAlert(loginText("admin.login.errorRateLimit", "Muitas tentativas. Aguarde alguns minutos."));
      } else if (error.status === 401) {
        showAlert(loginText("admin.login.errorGeneric", "Usuário ou senha inválidos."));
      } else {
        showAlert(loginText("admin.login.errorNetwork", "Não foi possível conectar ao servidor. Verifique se o backend está rodando e o CORS liberado."));
      }
      submitBtn.disabled = false;
      submitBtn.textContent = loginText("admin.login.submit", "Entrar");
      if (window.turnstile) window.turnstile.reset();
    }
  });

  mfaForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    mfaAlertEl.className = "admin-alert";

    const code = document.getElementById("mfaCode").value.trim();

    if (!code) {
      showMfaAlert(loginText("admin.login.errorMfaCode", "Digite o código de verificação."));
      return;
    }

    if (!pendingMfaToken) {
      showMfaAlert(loginText("admin.login.errorMfaExpired", "Sessão de verificação expirada. Faça login novamente."));
      return;
    }

    mfaSubmitBtn.disabled = true;
    mfaSubmitBtn.textContent = loginText("admin.login.submitting", "Verificando…");

    try {
      await adminApi.mfaVerify(pendingMfaToken, code);
      window.location.href = "dashboard.html";
      return;
    } catch (error) {
      console.error("[admin] falha na verificação MFA:", error);
      if (error.status === 429) {
        showMfaAlert(loginText("admin.login.errorRateLimit", "Muitas tentativas. Aguarde alguns minutos."));
      } else {
        showMfaAlert(loginText("admin.login.errorMfaInvalid", "Código inválido."));
      }
      mfaSubmitBtn.disabled = false;
      mfaSubmitBtn.textContent = loginText("admin.login.mfaSubmit", "Verificar");
    }
  });
});
