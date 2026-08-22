let cachedSkills = null;

function buildSkillsSkeleton() {
  const wrap = document.createDocumentFragment();
  for (let i = 0; i < 4; i++) {
    const row = document.createElement("div");
    row.className = "skeleton-skills-row";

    const label = document.createElement("div");
    label.className = "skeleton skeleton-line";
    label.style.width = "60%";

    const tags = document.createElement("div");
    tags.className = "skeleton-tags";
    for (let j = 0; j < 3; j++) {
      const tag = document.createElement("div");
      tag.className = "skeleton skeleton-tag";
      tags.appendChild(tag);
    }

    row.appendChild(label);
    row.appendChild(tags);
    wrap.appendChild(row);
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
  icon.innerHTML = '<path d="M3 7l9-4 9 4-9 4-9-4z" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 7v10l9 4 9-4V7" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 11v10" stroke-linecap="round" stroke-linejoin="round"/>';

  const span = document.createElement("span");
  span.className = "empty-state-text";
  span.textContent = text;

  wrap.appendChild(icon);
  wrap.appendChild(span);
  return wrap;
}

function renderSkillsTable() {
  const container = document.getElementById("skillsTable");
  if (!container) return;

  container.innerHTML = "";

  if (cachedSkills === null) {
    container.appendChild(buildSkillsSkeleton());
    return;
  }

  if (cachedSkills === "error") {
    container.appendChild(buildEmptyState(i18n.t("skills.error")));
    return;
  }

  if (cachedSkills.length === 0) {
    container.appendChild(buildEmptyState(i18n.t("skills.empty")));
    return;
  }

  const grouped = new Map();
  for (const skill of cachedSkills) {
    if (!grouped.has(skill.category)) grouped.set(skill.category, []);
    grouped.get(skill.category).push(skill.name);
  }

  for (const [category, names] of grouped) {
    const row = document.createElement("div");
    row.className = "skills-row";

    const label = document.createElement("div");
    label.className = "skills-row-label";
    label.textContent = i18n.translateCategory(category);

    const items = document.createElement("div");
    items.className = "skills-row-items";
    names.forEach((name, index) => {
      const tag = document.createElement("span");
      tag.className = "skill-tag";
      tag.textContent = name;
      tag.style.animationDelay = `${index * 45}ms`;
      items.appendChild(tag);
    });

    row.appendChild(label);
    row.appendChild(items);
    container.appendChild(row);
  }
}

async function loadSkills() {
  try {
    cachedSkills = await api.getSkills();
  } catch (error) {
    cachedSkills = "error";
  }
  renderSkillsTable();
}

window.renderSkillsTable = renderSkillsTable;

document.addEventListener("DOMContentLoaded", loadSkills);