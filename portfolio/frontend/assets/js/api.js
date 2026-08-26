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


const api = {
  getSkills: () => apiRequest("/api/skills"),

  getProjects: () => apiRequest("/api/projects"),

  getExperiences: () => apiRequest("/api/experiences"),

  sendContact: (payload) =>
    apiRequest("/api/contact", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};


function renderExperiences(experiences) {
  const section = document.getElementById("experiencia");

  if (!section) {
    return;
  }

  const container = section.querySelector(".container");

  if (!container) {
    return;
  }

  const sectionHead = container.querySelector(".section-head");

  if (!sectionHead) {
    return;
  }

  const existingContent = container.querySelector(
    ".experience-rendered-content"
  );

  if (existingContent) {
    existingContent.remove();
  }

  const content = document.createElement("div");
  content.className = "experience-rendered-content";

  if (!Array.isArray(experiences) || experiences.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";

    const text = document.createElement("span");
    text.className = "empty-state-text";
    text.textContent = i18n.t("experience.empty");

    emptyState.appendChild(text);
    content.appendChild(emptyState);

    container.appendChild(content);
    return;
  }

  const facts = document.createElement("div");
  facts.className = "about-facts";

  experiences.forEach((experience) => {
    const fact = document.createElement("div");
    fact.className = "about-fact";

    const label = document.createElement("span");
    label.className = "about-fact-label";

    const role = document.createElement("strong");
    role.textContent = experience.role;

    const period = document.createElement("span");
    period.textContent = ` · ${experience.period}`;

    label.appendChild(role);
    label.appendChild(period);

    const value = document.createElement("span");
    value.className = "about-fact-value";

    const company = document.createElement("strong");
    company.textContent = experience.company;

    const description = document.createElement("span");

    const useEnglish =
      i18n.getLang() === "en" &&
      experience.description_en &&
      experience.description_en.trim() !== "";

    description.textContent = useEnglish
      ? experience.description_en
      : experience.description;

    value.appendChild(company);
    value.appendChild(document.createTextNode(" — "));
    value.appendChild(description);

    if (
      experience.company_url &&
      isSafeHttpUrl(experience.company_url)
    ) {
      const link = document.createElement("a");

      link.href = experience.company_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = " →";

      value.appendChild(link);
    }

    fact.appendChild(label);
    fact.appendChild(value);
    facts.appendChild(fact);
  });

  content.appendChild(facts);
  container.appendChild(content);
}


function renderExperienceError() {
  const section = document.getElementById("experiencia");

  if (!section) {
    return;
  }

  const container = section.querySelector(".container");

  if (!container) {
    return;
  }

  const existingContent = container.querySelector(
    ".experience-rendered-content"
  );

  if (existingContent) {
    existingContent.remove();
  }

  const content = document.createElement("div");
  content.className = "experience-rendered-content";

  const errorState = document.createElement("div");
  errorState.className = "empty-state";

  const text = document.createElement("span");
  text.className = "empty-state-text";
  text.textContent = i18n.t("experience.error");

  errorState.appendChild(text);
  content.appendChild(errorState);

  container.appendChild(content);
}


function isSafeHttpUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch (_) {
    return false;
  }
}


async function loadExperiences() {
  const section = document.getElementById("experiencia");

  if (!section) {
    return;
  }

  try {
    const experiences = await api.getExperiences();

    renderExperiences(experiences);
  } catch (_) {
    renderExperienceError();
  }
}


document.addEventListener(
  "DOMContentLoaded",
  loadExperiences
);


window.renderExperiences = renderExperiences;