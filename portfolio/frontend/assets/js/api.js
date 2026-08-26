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


function getExperienceContainer() {
  const container = document.getElementById("experienceContent");

  if (!container) {
    return null;
  }

  return container;
}


function renderExperiences(experiences) {
  const container = getExperienceContainer();

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (
    !Array.isArray(experiences) ||
    experiences.length === 0
  ) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";

    const text = document.createElement("span");
    text.className = "empty-state-text";
    text.dataset.i18n = "experience.empty";
    text.textContent = i18n.t("experience.empty");

    emptyState.appendChild(text);
    container.appendChild(emptyState);

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
    value.appendChild(
      document.createTextNode(" — ")
    );
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

  container.appendChild(facts);
}


function renderExperienceLoading() {
  const container = getExperienceContainer();

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const loadingState = document.createElement("div");
  loadingState.className = "empty-state";

  const text = document.createElement("span");
  text.className = "empty-state-text";
  text.dataset.i18n = "experience.loading";
  text.textContent = i18n.t("experience.loading");

  loadingState.appendChild(text);
  container.appendChild(loadingState);
}


function renderExperienceError() {
  const container = getExperienceContainer();

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const errorState = document.createElement("div");
  errorState.className = "empty-state";

  const text = document.createElement("span");
  text.className = "empty-state-text";
  text.dataset.i18n = "experience.error";
  text.textContent = i18n.t("experience.error");

  errorState.appendChild(text);
  container.appendChild(errorState);
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


let experiencesCache = [];


async function loadExperiences() {
  const container = getExperienceContainer();

  if (!container) {
    return;
  }

  renderExperienceLoading();

  try {
    const experiences = await api.getExperiences();

    experiencesCache = Array.isArray(experiences)
      ? experiences
      : [];

    renderExperiences(experiencesCache);
  } catch (error) {
    console.error(
      "Failed to load experiences:",
      error
    );

    experiencesCache = [];

    renderExperienceError();
  }
}


function rerenderExperiencesForLanguage() {
  if (!Array.isArray(experiencesCache)) {
    return;
  }

  renderExperiences(experiencesCache);
}


document.addEventListener(
  "DOMContentLoaded",
  loadExperiences
);


window.renderExperiences = renderExperiences;
window.rerenderExperiencesForLanguage =
  rerenderExperiencesForLanguage;
window.loadExperiences = loadExperiences;