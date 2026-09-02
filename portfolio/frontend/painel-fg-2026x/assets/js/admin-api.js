// The csrf_token cookie belongs to the backend's domain (different from the
// frontend's domain on Vercel), so document.cookie can never read it here —
// that's a same-origin browser restriction. Instead we ask the backend for
// it (GET /api/auth/csrf-token, itself protected by the access_token cookie)
// and cache it in memory for the lifetime of this page.
let cachedCsrfToken = null;

async function ensureCsrfToken() {
  if (cachedCsrfToken) return cachedCsrfToken;
  const data = await adminRequest("/api/auth/csrf-token");
  cachedCsrfToken = data.csrf_token;
  return cachedCsrfToken;
}

async function adminRequest(path, options = {}, isRetry = false) {
  const method = (options.method || "GET").toUpperCase();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

  // Double-submit CSRF: every mutating request must echo back the same
  // value the backend has stored in the csrf_token cookie, or it's rejected
  // with 403. Safe (GET) requests, and the csrf-token fetch itself, don't
  // need it — skip to avoid infinite recursion.
  const CSRF_EXEMPT_PATHS = ["/api/auth/csrf-token", "/api/auth/login", "/api/auth/refresh"];
  if (method !== "GET" && method !== "HEAD" && !CSRF_EXEMPT_PATHS.includes(path)) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && !isRetry && path !== "/api/auth/login" && path !== "/api/auth/refresh") {
    try {
      await adminRequest("/api/auth/refresh", { method: "POST" }, true);
      // The refresh rotates the csrf_token cookie server-side, so the
      // cached value is now stale — drop it and let the retried request
      // (or the next mutating one) fetch a fresh one.
      cachedCsrfToken = null;
      return adminRequest(path, options, true);
    } catch (_) {
      window.location.href = "login.html";
      throw new Error("Sessão expirada.");
    }
  }

  // A 403 specifically for a bad/expired CSRF token (e.g. this tab was left
  // open across a token rotation) is recoverable by refetching once, unlike
  // other 403s (permission errors) which should just surface to the user.
  if (response.status === 403 && !isRetry) {
    let peek = null;
    try { peek = await response.clone().json(); } catch (_) { }
    if (peek && typeof peek.detail === "string" && peek.detail.toLowerCase().includes("csrf")) {
      cachedCsrfToken = null;
      return adminRequest(path, options, true);
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

  getConversations: (limit = 50, offset = 0) =>
    adminRequest(`/api/chat/admin/conversations?limit=${limit}&offset=${offset}`),
  getConversationMessages: (id, afterId = 0) =>
    adminRequest(`/api/chat/admin/conversations/${id}/messages?after_id=${afterId}`),
  sendConversationMessage: (id, content) =>
    adminRequest(`/api/chat/admin/conversations/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, website: "" }),
    }),
  updateConversationStatus: (id, statusValue) =>
    adminRequest(`/api/chat/admin/conversations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: statusValue }),
    }),
  deleteConversation: (id) =>
    adminRequest(`/api/chat/admin/conversations/${id}`, { method: "DELETE" }),
  blockConversationIp: (id) =>
    adminRequest(`/api/chat/admin/conversations/${id}/block-ip`, { method: "POST" }),
  unblockConversationIp: (id) =>
    adminRequest(`/api/chat/admin/conversations/${id}/block-ip`, { method: "DELETE" }),
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