async function adminRequest(path, options = {}, isRetry = false) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include",
  });

  if (response.status === 401 && !isRetry && path !== "/api/auth/login" && path !== "/api/auth/refresh") {
    try {
      await adminRequest("/api/auth/refresh", { method: "POST" }, true);
      return adminRequest(path, options, true);
    } catch (_) {
      window.location.href = "login.html";
      throw new Error("Sessão expirada.");
    }
  }

  let data = null;
  try { data = await response.json(); } catch (_) { }

  if (!response.ok) {
    let message = (data && data.detail) || "Não foi possível completar a solicitação.";
    if (data && Array.isArray(data.errors) && data.errors.length > 0) {
      const first = data.errors[0];
      const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : "campo";
      message = `${field}: ${first.msg}`;
    }
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

const adminApi = {
  login: (username, password, turnstileToken) =>
    adminRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password, turnstile_token: turnstileToken }),
    }),
  mfaVerify: (mfaToken, code) =>
    adminRequest("/api/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ mfa_token: mfaToken, code }),
    }),
  logout: () => adminRequest("/api/auth/logout", { method: "POST" }),
  me: () => adminRequest("/api/auth/me"),

  getAllProjects: () => adminRequest("/api/projects/admin"),
  createProject: (payload) => adminRequest("/api/projects", { method: "POST", body: JSON.stringify(payload) }),
  updateProject: (id, payload) => adminRequest(`/api/projects/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteProject: (id) => adminRequest(`/api/projects/${id}`, { method: "DELETE" }),

  getSkills: () => adminRequest("/api/skills"),
  createSkill: (payload) => adminRequest("/api/skills", { method: "POST", body: JSON.stringify(payload) }),
  updateSkill: (id, payload) => adminRequest(`/api/skills/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSkill: (id) => adminRequest(`/api/skills/${id}`, { method: "DELETE" }),

  getAllExperiences: () => adminRequest("/api/experiences/admin"),
  createExperience: (payload) => adminRequest("/api/experiences", { method: "POST", body: JSON.stringify(payload) }),
  updateExperience: (id, payload) => adminRequest(`/api/experiences/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteExperience: (id) => adminRequest(`/api/experiences/${id}`, { method: "DELETE" }),

  getMfaStatus: () => adminRequest("/api/auth/mfa/status"),
  mfaSetupInit: () => adminRequest("/api/auth/mfa/setup/init", { method: "POST" }),
  mfaSetupConfirm: (code) =>
    adminRequest("/api/auth/mfa/setup/confirm", { method: "POST", body: JSON.stringify({ code }) }),
  mfaDisable: (code) =>
    adminRequest("/api/auth/mfa/disable", { method: "POST", body: JSON.stringify({ code }) }),
};

async function requireAdminSession() {
  try {
    await adminApi.me();
    return true;
  } catch (error) {
    window.location.href = "login.html";
    return false;
  }
}