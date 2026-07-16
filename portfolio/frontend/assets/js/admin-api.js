const API_BASE_URL = "http://127.0.0.1:8000";

async function adminRequest(path, options = {}, isRetry = false) {
  const url = `${API_BASE_URL}${path}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: { 
        "Content-Type": "application/json", 
        ...(options.headers || {}) 
      },
      credentials: "omit",
    });

    // If the backend returns an error (e.g., 400, 401), the fetch does NOT trigger an error in the catch block. 
    // It returns the response object. You need to check .ok.
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[admin] Erro no fetch para ${path}:`, response.status, errorData);
      
      // Error handling logic (ex: 401)
      if (response.status === 401 && !isRetry) {
      }
      
      const error = new Error(errorData.detail || "Request failed");
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } catch (err) {
    console.error(`[admin] Fail in the net for ${url}:`, err);
    throw err;
  }
}

const adminApi = {
  login: (username, password, turnstileToken) =>
    adminRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password, turnstile_token: turnstileToken }),
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
};

async function requireAdminSession() {
  try {
    await adminApi.me();
    return true;
  } catch (error) {
    if (!window.location.pathname.endsWith("login.html")) {
      window.location.href = "login.html";
    }
    return false;
  }
}