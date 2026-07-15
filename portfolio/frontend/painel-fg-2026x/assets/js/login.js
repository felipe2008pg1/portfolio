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
    console.debug("[admin] sem sessão ativa, seguindo pro login normal");
  }

  const form = document.getElementById("loginForm");
  const submitBtn = document.getElementById("loginSubmit");
  const alertEl = document.getElementById("loginAlert");

  function showAlert(message) {
    alertEl.textContent = message;
    alertEl.className = "admin-alert is-visible is-error";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    alertEl.className = "admin-alert";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      showAlert(loginText("admin.login.errorFields", "Preencha usuário e senha."));
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = loginText("admin.login.submitting", "Entrando…");

    try {
      await adminApi.login(username, password);
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
    }
  });
});
