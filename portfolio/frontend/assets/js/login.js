function loginText(key, fallback) {
  return typeof i18n !== "undefined" ? i18n.t(key) : fallback;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof i18n !== "undefined") {
    i18n.apply();
  }

  const form = document.getElementById("loginForm");
  const mfaForm = document.getElementById("mfaForm");
  const submitBtn = document.getElementById("loginSubmit");
  const alertEl = document.getElementById("loginAlert");

  let mfaToken = null;

  function showAlert(message) {
    alertEl.textContent = message;
    alertEl.className = "admin-alert is-visible is-error";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    alertEl.className = "admin-alert";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const turnstileToken = window.turnstile
      ? window.turnstile.getResponse()
      : "";

    if (!username || !password) {
      showAlert(
        loginText(
          "admin.login.errorFields",
          "Preencha usuário e senha."
        )
      );
      return;
    }

    if (!turnstileToken) {
      showAlert(
        "Complete a verificação de segurança antes de entrar."
      );
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = loginText(
      "admin.login.submitting",
      "Entrando…"
    );

    try {
      const data = await adminApi.login(
        username,
        password,
        turnstileToken
      );

      if (data && data.mfa_required) {
        mfaToken = data.mfa_token;

        form.style.display = "none";

        if (mfaForm) {
          mfaForm.style.display = "block";
        }

        return;
      }

      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("[admin] login failed:", error);

      if (error.status === 429) {
        showAlert(
          loginText(
            "admin.login.errorRateLimit",
            "Muitas tentativas. Aguarde alguns minutos."
          )
        );
      } else if (error.status === 401) {
        showAlert(
          loginText(
            "admin.login.errorGeneric",
            "Usuário ou senha inválidos."
          )
        );
      } else {
        showAlert(
          loginText(
            "admin.login.errorNetwork",
            "Não foi possível conectar ao servidor. Verifique se o backend está rodando e o CORS liberado."
          )
        );
      }

      submitBtn.disabled = false;
      submitBtn.textContent = loginText(
        "admin.login.submit",
        "Entrar"
      );

      if (window.turnstile) {
        window.turnstile.reset();
      }
    }
  });

  if (mfaForm) {
    mfaForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      alertEl.className = "admin-alert";

      const code = document
        .getElementById("mfaCode")
        .value
        .trim();

      if (!code) {
        showAlert("Enter your authentication code.");
        return;
      }

      const mfaSubmit = document.getElementById("mfaSubmit");

      if (mfaSubmit) {
        mfaSubmit.disabled = true;
        mfaSubmit.textContent = "Verifying…";
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/mfa/verify`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              mfa_token: mfaToken,
              code,
            }),
          }
        );

        let data = null;

        try {
          data = await response.json();
        } catch (_) {}

        if (!response.ok) {
          const error = new Error(
            (data && data.detail) || "Invalid authentication code."
          );

          error.status = response.status;
          throw error;
        }

        window.location.href = "dashboard.html";
      } catch (error) {
        console.error("[admin] MFA verification failed:", error);

        if (error.status === 429) {
          showAlert(
            "Too many attempts. Please wait a few minutes."
          );
        } else if (error.status === 401) {
          showAlert("Invalid authentication code.");
        } else {
          showAlert(
            "Unable to verify the authentication code."
          );
        }

        if (mfaSubmit) {
          mfaSubmit.disabled = false;
          mfaSubmit.textContent = "Verificar";
        }
      }
    });
  }
});