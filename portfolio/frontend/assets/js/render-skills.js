document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("skillsTable");
  if (!container) return;

  try {
    const skills = await api.getSkills();

    if (!skills || skills.length === 0) {
      container.innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "skills-empty";
      empty.textContent = "Nenhuma skill cadastrada ainda.";
      container.appendChild(empty);
      return;
    }

    const grouped = new Map();
    for (const skill of skills) {
      if (!grouped.has(skill.category)) grouped.set(skill.category, []);
      grouped.get(skill.category).push(skill.name);
    }

    container.innerHTML = "";
    for (const [category, names] of grouped) {
      const row = document.createElement("div");
      row.className = "skills-row";

      const label = document.createElement("div");
      label.className = "skills-row-label";
      label.textContent = category;

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
  } catch (error) {
    container.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "skills-empty";
    empty.textContent = "Não foi possível carregar a stack técnica agora.";
    container.appendChild(empty);
  }
});