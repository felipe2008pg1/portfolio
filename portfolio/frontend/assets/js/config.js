// Change this value when deploying to production (e.g., "https://api.yourdomain.com")
const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "";