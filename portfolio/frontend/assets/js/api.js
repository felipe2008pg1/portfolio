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
  } catch (_) {}

  if (!response.ok) {
    const message =
      (data && data.detail) ||
      "Unable to complete the request.";

    const error = new Error(message);
    error.status = response.status;
    error.payload = data;

    throw error;
  }

  return data;
}


// Shared by the render-*.js scripts (loaded after this one).
function isSafeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

const api = {
  getSkills: () =>
    apiRequest("/api/skills"),

  getProjects: () =>
    apiRequest("/api/projects"),

  getExperiences: () =>
    apiRequest("/api/experiences"),

  sendContact: (payload) =>
    apiRequest("/api/contact", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};