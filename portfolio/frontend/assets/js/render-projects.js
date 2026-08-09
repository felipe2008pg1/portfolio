let cachedProjects = null;

function isSafeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function buildProjectsSkeleton() {
  const wrap = document.createDocumentFragment();
  for (let i = 0; i < 3; i++) {
    const card = document.createElement("div");
    card.className = "skeleton-project-card";

    const img = document.createElement("div");
    img.className = "skeleton skeleton-project-image";

    const body = document.createElement("div");
    body.className = "skeleton-project-body";
    for (let j = 0; j < 3; j++) {
      const line = document.createElement("div");
      line.className = "skeleton skeleton-line";
      body.appendChild(line);
    }

    card.appendChild(img);
    card.appendChild(body);
    wrap.appendChild(card);
  }
  return wrap;
}

function buildEmptyState(text) {
  const wrap = document.createElement("div");
  wrap.className = "empty-state";

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "empty-state-icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "1.5");
  icon.innerHTML = '<rect x="3" y="4" width="18" height="16" rx="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 9h18" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 4v5" stroke-linecap="round" stroke-linejoin="round"/>';

  const span = document.createElement("span");
  span.className = "empty-state-text";
  span.textContent = text;

  wrap.appendChild(icon);
  wrap.appendChild(span);
  return wrap;
}

function renderProjectsGrid() {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (cachedProjects === null) {
    grid.appendChild(buildProjectsSkeleton());
    return;
  }

  if (cachedProjects === "error") {
    grid.appendChild(buildEmptyState(i18n.t("projects.error")));
    return;
  }

  if (cachedProjects.length === 0) {
    grid.appendChild(buildEmptyState(i18n.t("projects.empty")));
    return;
  }

  const total = cachedProjects.length;

  cachedProjects.forEach((project, index) => {
    const card = document.createElement("article");
    card.className = "project-card";
    card.style.animationDelay = `${index * 80}ms`;

    if (project.image_path && isSafeHttpUrl(project.image_path)) {
      const img = document.createElement("img");
      img.className = "project-card-image";
      img.src = project.image_path;
      img.alt = project.title;
      img.loading = "lazy";
      img.onerror = () => img.remove();
      card.appendChild(img);
    }

    const head = document.createElement("div");
    head.className = "project-card-head";
    const idTag = document.createElement("span");
    idTag.className = "project-card-id";
    idTag.textContent = `FOLHA ${String(index + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}`;
    head.appendChild(idTag);

    const body = document.createElement("div");
    body.className = "project-card-body";

    const title = document.createElement("h3");
    title.className = "project-card-title";
    title.textContent = project.title;

    const desc = document.createElement("p");
    desc.className = "project-card-desc";
    const useEnglish = i18n.getLang() === "en" && project.description_en && project.description_en.trim() !== "";
    desc.textContent = useEnglish ? project.description_en : project.description;

    const stackWrap = document.createElement("div");
    stackWrap.className = "project-card-stack";
    String(project.stack)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((tech) => {
        const tag = document.createElement("span");
        tag.className = "skill-tag";
        tag.textContent = tech;
        stackWrap.appendChild(tag);
      });

    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(stackWrap);

    const links = document.createElement("div");
    links.className = "project-card-links";

    if (project.repo_url && isSafeHttpUrl(project.repo_url)) {
      const repoLink = document.createElement("a");
      repoLink.href = project.repo_url;
      repoLink.target = "_blank";
      repoLink.rel = "noopener noreferrer";
      repoLink.className = "btn btn-outline";
      repoLink.textContent = i18n.t("projects.linkCode");
      links.appendChild(repoLink);
    }

    if (project.demo_url && isSafeHttpUrl(project.demo_url)) {
      const demoLink = document.createElement("a");
      demoLink.href = project.demo_url;
      demoLink.target = "_blank";
      demoLink.rel = "noopener noreferrer";
      demoLink.className = "btn btn-outline";
      demoLink.textContent = i18n.t("projects.linkDemo");
      links.appendChild(demoLink);
    }

    card.appendChild(head);
    card.appendChild(body);
    if (links.childElementCount > 0) card.appendChild(links);

    grid.appendChild(card);
  });
}

async function loadProjects() {
  try {
    cachedProjects = await api.getProjects();
  } catch (error) {
    cachedProjects = "error";
  }
  renderProjectsGrid();
}

window.renderProjectsGrid = renderProjectsGrid;

document.addEventListener("DOMContentLoaded", loadProjects);