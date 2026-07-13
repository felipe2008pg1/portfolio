/**
* Fetch wrapper. It never exposes internal error details to the end user —
* it only passes along the controlled message that the backend has already sanitized.
 */
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: options.credentials || "omit",
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    // Empty response body (ex: 204)
  }

  if (!response.ok) {
    const message = (data && data.detail) || "Não foi possível completar a solicitação.";
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

const api = {
  getSkills: () => apiRequest("/api/skills"),
  getProjects: () => apiRequest("/api/projects"),
  sendContact: (payload) =>
    apiRequest("/api/contact", { method: "POST", body: JSON.stringify(payload) }),
};