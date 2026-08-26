let cachedExperiences = null;

function buildExperienceSkeleton() {
  const wrap = document.createDocumentFragment();
  for (let i = 0; i < 3; i++) {
    const row = document.createElement("div");
    row.className = "skeleton-skills-row";

    const label = document.createElement("div");
    label.className = "skeleton skeleton-line";
    label.style.width = "40%";

    const tags = document.createElement("div");
    tags.className = "skeleton-tags";
    const tag = document.createElement("div");
    tag.className = "skeleton skeleton-tag";
    tag.style.width = "100%";
    tags.appendChild(tag);

    row.appendChild(label);
    row.appendChild(tags);
    wrap.appendChild(row);
  }
  return wrap;
}

function buildExperienceEmptyState(text) {
  const wrap = document.createElement("div");
  wrap.className = "experience-empty";
  wrap.textContent = text;
  return wrap;
}

function isSafeExperienceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function buildExperienceItem(experience) {
  const item = document.createElement("div");
  item.className = "experience-item";

  const visual = document.createElement("div");
  visual.className = "experience-item-visual";

  if (experience.logo_url && isSafeExperienceUrl(experience.logo_url)) {
    const logo = document.createElement("img");
    logo.className = "experience-item-logo";
    logo.src = experience.logo_url;
    logo.alt = experience.company;
    logo.loading = "lazy";
    logo.referrerPolicy = "no-referrer";
    logo.onerror = () => {
      logo.remove();
      visual.appendChild(buildLogoFallback(experience.company));
    };
    visual.appendChild(logo);
  } else {
    visual.appendChild(buildLogoFallback(experience.company));
  }

  const body = document.createElement("div");
  body.className = "experience-item-body";

  const header = document.createElement("div");
  header.className = "experience-item-header";

  const company = document.createElement("div");
  company.className = "experience-item-company";
  company.textContent = experience.company;

  const period = document.createElement("div");
  period.className = "experience-item-period";
  period.textContent = experience.period;

  header.appendChild(company);
  header.appendChild(period);

  const role = document.createElement("div");
  role.className = "experience-item-role";
  role.textContent = experience.role;

  const desc = document.createElement("div");
  desc.className = "experience-item-desc";

  const useEnglish =
    i18n.getLang() === "en" &&
    experience.description_en &&
    experience.description_en.trim() !== "";

  desc.textContent = useEnglish
    ? experience.description_en
    : experience.description;

  body.appendChild(header);
  body.appendChild(role);
  body.appendChild(desc);

  if (experience.company_url && isSafeExperienceUrl(experience.company_url)) {
    const link = document.createElement("a");
    link.className = "btn btn-outline btn-sm experience-item-link";
    link.href = experience.company_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("data-i18n", "experience.visitCompany");
    link.textContent = i18n.t("experience.visitCompany");
    body.appendChild(link);
  }

  item.appendChild(visual);
  item.appendChild(body);

  return item;
}

function buildLogoFallback(companyName) {
  const fallback = document.createElement("div");
  fallback.className = "experience-item-logo-fallback";
  fallback.textContent = (companyName || "?").trim().charAt(0).toUpperCase();
  return fallback;
}

function renderExperienceList() {
  const container = document.getElementById("experienceList");
  if (!container) return;

  container.innerHTML = "";

  if (cachedExperiences === null) {
    container.appendChild(buildExperienceSkeleton());
    return;
  }

  if (cachedExperiences === "error") {
    container.appendChild(buildExperienceEmptyState(i18n.t("experience.error")));
    return;
  }

  if (cachedExperiences.length === 0) {
    container.appendChild(buildExperienceEmptyState(i18n.t("experience.empty")));
    return;
  }

  const fragment = document.createDocumentFragment();
  cachedExperiences.forEach((experience) => {
    fragment.appendChild(buildExperienceItem(experience));
  });
  container.appendChild(fragment);
}

async function loadExperienceList() {
  try {
    cachedExperiences = await api.getExperiences();
  } catch (error) {
    cachedExperiences = "error";
  }
  renderExperienceList();
}

window.renderExperienceList = renderExperienceList;

document.addEventListener("DOMContentLoaded", loadExperienceList);