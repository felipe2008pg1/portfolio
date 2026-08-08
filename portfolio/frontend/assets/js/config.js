const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "https://portfolio-production-fef5.up.railway.app";

const TURNSTILE_SITE_KEY = "1x00000000000000000000AA";