function loginText(key, fallback) {
  return typeof i18n !== "undefined" ? i18n.t(key) : fallback;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof i18n !== "undefined") i18n.apply();

  try {
    await adminApi.me();
    window.location.href = "dashboard.html";
    return;
  } catch (_) {
    console.debug("[admin] No active session; proceeding to standard login.");
  }

  const loginForm = document.getElementById("loginForm");
  const mfaForm = document.getElementById("mfaForm");
  const loginTitle = document.getElementById("loginTitle");
  const submitBtn = document.getElementById("loginSubmit");
  const mfaSubmitBtn = document.getElementById("mfaSubmit");
  const alertEl = document.getElementById("loginAlert");

  let pendingMfaToken = null;

  function showAlert(message) {
    alertEl.textContent = message;
    alertEl.className = "admin-alert is-visible is-error";
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    alertEl.className = "admin-alert";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const turnstileToken = window.turnstile ? window.turnstile.getResponse() : "";

    if (!username || !password) {
      showAlert(loginText("admin.login.errorFields", "Enter your username and password."));
      return;
    }

    if (!turnstileToken) {
      showAlert("Complete the security check before entering.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = loginText("admin.login.submitting", "Entrando…");

    try {
      const result = await adminApi.login(username, password, turnstileToken);

      if (result.mfa_required) {
        pendingMfaToken = result.mfa_token;
        loginForm.style.display = "none";
        mfaForm.style.display = "block";
        loginTitle.textContent = "Two-step verification";
        document.getElementById("mfaCode").focus();
        submitBtn.disabled = false;
        submitBtn.textContent = loginText("admin.login.submit", "Enter");
        return;
      }

      window.location.href = "dashboard.html";
      return;
    } catch (error) {
      console.error("[admin] login failed:", error);
      if (error.status === 429) {
        showAlert(loginText("admin.login.errorRateLimit", "Too many attempts. Please wait a few minutes."));
      } else if (error.status === 401) {
        showAlert(loginText("admin.login.errorGeneric", "Invalid user or password."));
      } else {
        showAlert(loginText("admin.login.errorNetwork", "Unable to connect to the server. Check if the backend is running and CORS is enabled."));
      }
      submitBtn.disabled = false;
      submitBtn.textContent = loginText("admin.login.submit", "Enter");
      if (window.turnstile) window.turnstile.reset();
    }
  });

  mfaForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    alertEl.className = "admin-alert";

    const code = document.getElementById("mfaCode").value.trim();
    if (!code) return;

    mfaSubmitBtn.disabled = true;
    mfaSubmitBtn.textContent = "Checking";

    try {
      await adminApi.mfaVerify(pendingMfaToken, code);
      window.location.href = "dashboard.html";
    } catch (error) {
      showAlert(error.message || "Invalid code");
      mfaSubmitBtn.disabled = false;
      mfaSubmitBtn.textContent = "To check";
    }
  });
});