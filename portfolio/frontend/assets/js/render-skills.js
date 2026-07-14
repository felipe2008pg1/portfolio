let cachedSkills = null;

function renderSkillsTable() {
  const container = document.getElementById("skillsTable");
  if (!container) return;

  if (cachedSkills === null) {
    container.innerHTML = "";
    const loading = document.createElement("div");
    loading.className = "skills-empty";
    loading.textContent = i18n.t("skills.loading");
    container.appendChild(loading);
    return;
  }

  if (cachedSkills === "error") {
    container.innerHTML = "";
    const error = document.createElement("div");
    error.className = "skills-empty";
    error.textContent = i18n.t("skills.error");
    container.appendChild(error);
    return;
  }

  if (cachedSkills.length === 0) {
    container.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "skills-empty";
    empty.textContent = i18n.t("skills.empty");
    container.appendChild(empty);
    return;
  }

  const grouped = new Map();
  for (const skill of cachedSkills) {
    if (!grouped.has(skill.category)) grouped.set(skill.category, []);
    grouped.get(skill.category).push(skill.name);
  }

  container.innerHTML = "";
  for (const [category, names] of grouped) {
    const row = document.createElement("div");
    row.className = "skills-row";

    const label = document.createElement("div");
    label.className = "skills-row-label";
    label.textContent = i18n.translateCategory(category);

    const items = document.createElement("div");
    items.className = "skills-row-items";
    for (const name of names) {
      const tag = document.createElement("span");
      tag.className = "skill-tag";
      tag.textContent = name;
      items.appendChild(tag);
    }

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