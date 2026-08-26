function loginText(key, fallback) {
  return typeof i18n !== "undefined" ? i18n.t(key) : fallback;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof i18n !== "undefined") i18n.apply();

  const loginForm = document.getElementById("loginForm");
  const mfaForm = document.getElementById("mfaForm");
  const loginSubmit = document.getElementById("loginSubmit");
  const mfaSubmit = document.getElementById("mfaSubmit");
  const alertEl = document.getElementById("loginAlert");
  const loginTitle = document.getElementById("loginTitle");
  let mfaToken = null;

  function showAlert(message) {
    alertEl.textContent = message;
    alertEl.className = "admin-alert is-visible is-error";
  }

  function clearAlert() {
    alertEl.textContent = "";
    alertEl.className = "admin-alert";
  }

  function showMfaForm() {
    loginForm.style.display = "none";
    mfaForm.style.display = "block";
    loginTitle.textContent = "MFA verification";
    document.getElementById("mfaCode").focus();
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert();

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

    loginSubmit.disabled = true;
    loginSubmit.textContent = loginText("admin.login.submitting", "Entrando…");

    try {
      const result = await adminApi.login(username, password, turnstileToken);

      if (result.mfa_required && result.mfa_token) {
        mfaToken = result.mfa_token;
        showMfaForm();
        return;
      }

      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("[admin] Login failed:", error);

      if (error.status === 429) {
        showAlert(loginText("admin.login.errorRateLimit", "Muitas tentativas. Aguarde alguns minutos."));
      } else if (error.status === 401) {
        showAlert(loginText("admin.login.errorGeneric", "Usuário ou senha inválidos."));
      } else {
        showAlert(loginText("admin.login.errorNetwork", "Não foi possível conectar ao servidor. Verifique se o backend está rodando e o CORS liberado."));
      }

      loginSubmit.disabled = false;
      loginSubmit.textContent = loginText("admin.login.submit", "Entrar");
      if (window.turnstile) window.turnstile.reset();
    }
  });

  mfaForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert();

    const code = document.getElementById("mfaCode").value.trim();

    if (!mfaToken) {
      showAlert("The MFA verification session is invalid or expired.");
      return;
    }

    if (!code) {
      showAlert("Enter your authentication code.");
      return;
    }

    mfaSubmit.disabled = true;
    mfaSubmit.textContent = "Verifying…";

    try {
      await adminApi.verifyMfa(mfaToken, code);
      mfaToken = null;
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("[admin] MFA verification failed:", error);

      if (error.status === 429) {
        showAlert("Too many verification attempts. Please wait a few minutes.");
      } else if (error.status === 401) {
        showAlert("Invalid or expired authentication code.");
      } else {
        showAlert("Unable to verify the authentication code. Please try again.");
      }

      mfaSubmit.disabled = false;
      mfaSubmit.textContent = "Verify";
    }
  });
});
