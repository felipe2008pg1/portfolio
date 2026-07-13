function isSafeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;

  try {
    const projects = await api.getProjects();

    if (!projects || projects.length === 0) {
      grid.innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "projects-empty";
      empty.textContent = "Novos projetos em breve.";
      grid.appendChild(empty);
      return;
    }

    grid.innerHTML = "";
    projects.forEach((project) => {
      const card = document.createElement("article");
      card.className = "project-card";

      const head = document.createElement("div");
      head.className = "project-card-head";
      const idTag = document.createElement("span");
      idTag.className = "project-card-id";
      idTag.textContent = `PRJ_${String(project.id).padStart(3, "0")}`;
      head.appendChild(idTag);

      const body = document.createElement("div");
      body.className = "project-card-body";

      const title = document.createElement("h3");
      title.className = "project-card-title";
      title.textContent = project.title;

      const desc = document.createElement("p");
      desc.className = "project-card-desc";
      desc.textContent = project.description;

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
        repoLink.textContent = "Código";
        links.appendChild(repoLink);
      }

      if (project.demo_url && isSafeHttpUrl(project.demo_url)) {
        const demoLink = document.createElement("a");
        demoLink.href = project.demo_url;
        demoLink.target = "_blank";
        demoLink.rel = "noopener noreferrer";
        demoLink.className = "btn btn-outline";
        demoLink.textContent = "Demo";
        links.appendChild(demoLink);
      }

      card.appendChild(head);
      card.appendChild(body);
      if (links.childElementCount > 0) card.appendChild(links);

      grid.appendChild(card);
    });
  } catch (error) {
    grid.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "projects-empty";
    empty.textContent = "Não foi possível carregar os projetos agora.";
    grid.appendChild(empty);
  }
});