function loginText(key, fallback) {
  return typeof i18n !== "undefined" ? i18n.t(key) : fallback;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof i18n !== "undefined") i18n.apply();

  /*
  try {
    await adminApi.me();
    window.location.href = "dashboard.html";
    return;
  } catch (_) {
    console.debug("[admin] ");
  }
  */
  // ------------------------------------

  const form = document.getElementById("loginForm");
  const submitBtn = document.getElementById("loginSubmit");
  const alertEl = document.getElementById("loginAlert");

  function showAlert(message) {
    alertEl.textContent = message;
    alertEl.className = "admin-alert is-visible is-error";
  }

  form.addEventListener("submit", async (event) => {
      event.preventDefault();
      
      const turnstileWidget = document.querySelector('.cf-turnstile');
      const turnstileToken = turnstileWidget ? turnstileWidget.querySelector('input[name="cf-turnstile-response"]')?.value : "";

      if (!turnstileToken) {
          showAlert("Wait the security verification or try again.");
          return;
      }

    if (!turnstileToken) {
      showAlert("Complete the security verification before signing in.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = loginText("admin.login.submitting", "Signing in...");

    try {
      const turnstileToken = window.turnstile ? window.turnstile.getResponse() : "";
      console.log("Token send for backend:", turnstileToken);
      await adminApi.login(username, password, turnstileToken);
      window.location.href = "dashboard.html";
      return;
    } catch (error) {
      console.log("--- ERRO CAPTURED ---");
      console.error("Error status:", error.status);
      console.error("Payload completed:", error);
      
      if (error.status === 429) {
        showAlert("Attemps much.");
      } else if (error.status === 401) {
        showAlert("User or password invalid.");
      } else {
        showAlert("Critical error: " + error.message);
      }
      
      submitBtn.disabled = false;
      submitBtn.textContent = "Enter";
      if (window.turnstile) window.turnstile.reset();
    }
  });
});