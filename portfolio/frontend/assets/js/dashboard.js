let projectsCache = [];
let skillsCache = [];

function showGlobalAlert(message, type) {
  const el = document.getElementById("globalAlert");
  el.textContent = message;
  el.className = `admin-alert is-visible is-${type}`;
  setTimeout(() => el.classList.remove("is-visible"), 4000);
}

function showFormAlert(elId, message) {
  const el = document.getElementById(elId);
  el.textContent = message;
  el.className = "admin-alert is-visible is-error";
}

function clearFormAlert(elId) {
  document.getElementById(elId).className = "admin-alert";
}

function openModal(name) { document.getElementById(`${name}ModalOverlay`).classList.add("is-open"); }
function closeModal(name) { document.getElementById(`${name}ModalOverlay`).classList.remove("is-open"); }

document.querySelectorAll("[data-close-modal]").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(btn.getAttribute("data-close-modal")));
});

async function loadProjects() {
  const tbody = document.getElementById("projectsTableBody");
  try {
    projectsCache = await adminApi.getAllProjects();
    renderProjectsTable();
  } catch (error) {
    tbody.innerHTML = "";
    const row = document.createElement("tr");
    row.className = "admin-empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = i18n.t("admin.dashboard.errorLoadProjects");
    row.appendChild(cell);
    tbody.appendChild(row);
  }
}

function renderProjectsTable() {
  const tbody = document.getElementById("projectsTableBody");
  tbody.innerHTML = "";

  if (projectsCache.length === 0) {
    const row = document.createElement("tr");
    row.className = "admin-empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = i18n.t("admin.dashboard.noProjects");
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  projectsCache.forEach((project) => {
    const row = document.createElement("tr");

    const titleCell = document.createElement("td");
    titleCell.textContent = project.title;
    const stackCell = document.createElement("td");
    stackCell.textContent = project.stack;
    const publishedCell = document.createElement("td");
    publishedCell.textContent = project.is_published ? i18n.t("admin.dashboard.yes") : i18n.t("admin.dashboard.no");

    const actionsCell = document.createElement("td");
    actionsCell.className = "col-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-outline btn-sm";
    editBtn.textContent = i18n.t("admin.dashboard.edit");
    editBtn.addEventListener("click", () => openProjectModal(project));
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger btn-sm";
    deleteBtn.textContent = i18n.t("admin.dashboard.delete");
    deleteBtn.addEventListener("click", () => deleteProject(project.id, project.title));
    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(deleteBtn);

    row.appendChild(titleCell);
    row.appendChild(stackCell);
    row.appendChild(publishedCell);
    row.appendChild(actionsCell);
    tbody.appendChild(row);
  });
}

function openProjectModal(project) {
  clearFormAlert("projectFormAlert");
  document.getElementById("projectModalTitle").textContent = project
    ? i18n.t("admin.dashboard.editProjectModalTitle")
    : i18n.t("admin.dashboard.newProjectModalTitle");
  document.getElementById("projectId").value = project ? project.id : "";
  document.getElementById("projectTitle").value = project ? project.title : "";
  document.getElementById("projectDescription").value = project ? project.description : "";
  document.getElementById("projectStack").value = project ? project.stack : "";
  document.getElementById("projectRepoUrl").value = project && project.repo_url ? project.repo_url : "";
  document.getElementById("projectDemoUrl").value = project && project.demo_url ? project.demo_url : "";
  document.getElementById("projectPublished").checked = project ? project.is_published : true;
  openModal("project");
}

async function deleteProject(id, title) {
  const msg = i18n.t("admin.dashboard.confirmDeleteProject").replace("{name}", title);
  if (!window.confirm(msg)) return;
  try {
    await adminApi.deleteProject(id);
    showGlobalAlert(i18n.t("admin.dashboard.projectDeleted"), "success");
    loadProjects();
  } catch (error) {
    showGlobalAlert(error.message || i18n.t("admin.dashboard.errorDeleteProject"), "error");
  }
}

document.getElementById("newProjectBtn").addEventListener("click", () => openProjectModal(null));

document.getElementById("projectForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormAlert("projectFormAlert");

  const id = document.getElementById("projectId").value;
  const payload = {
    title: document.getElementById("projectTitle").value.trim(),
    description: document.getElementById("projectDescription").value.trim(),
    stack: document.getElementById("projectStack").value.trim(),
    repo_url: document.getElementById("projectRepoUrl").value.trim() || null,
    demo_url: document.getElementById("projectDemoUrl").value.trim() || null,
    is_published: document.getElementById("projectPublished").checked,
    display_order: 0,
  };

  const submitBtn = document.getElementById("projectSubmitBtn");
  submitBtn.disabled = true;

  try {
    if (id) {
      await adminApi.updateProject(id, payload);
    } else {
      await adminApi.createProject(payload);
    }
    closeModal("project");
    showGlobalAlert(i18n.t("admin.dashboard.projectSaved"), "success");
    loadProjects();
  } catch (error) {
    showFormAlert("projectFormAlert", error.message || i18n.t("admin.dashboard.errorSaveProject"));
  } finally {
    submitBtn.disabled = false;
  }
});

async function loadSkills() {
  const tbody = document.getElementById("skillsTableBody");
  try {
    skillsCache = await adminApi.getSkills();
    renderSkillsTable();
  } catch (error) {
    tbody.innerHTML = "";
    const row = document.createElement("tr");
    row.className = "admin-empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = i18n.t("admin.dashboard.errorLoadSkills");
    row.appendChild(cell);
    tbody.appendChild(row);
  }
}

function renderSkillsTable() {
  const tbody = document.getElementById("skillsTableBody");
  tbody.innerHTML = "";

  if (skillsCache.length === 0) {
    const row = document.createElement("tr");
    row.className = "admin-empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = i18n.t("admin.dashboard.noSkills");
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  skillsCache.forEach((skill) => {
    const row = document.createElement("tr");

    const categoryCell = document.createElement("td");
    categoryCell.textContent = skill.category;
    const nameCell = document.createElement("td");
    nameCell.textContent = skill.name;
    const orderCell = document.createElement("td");
    orderCell.textContent = String(skill.display_order);

    const actionsCell = document.createElement("td");
    actionsCell.className = "col-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-outline btn-sm";
    editBtn.textContent = i18n.t("admin.dashboard.edit");
    editBtn.addEventListener("click", () => openSkillModal(skill));
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger btn-sm";
    deleteBtn.textContent = i18n.t("admin.dashboard.delete");
    deleteBtn.addEventListener("click", () => deleteSkill(skill.id, skill.name));
    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(deleteBtn);

    row.appendChild(categoryCell);
    row.appendChild(nameCell);
    row.appendChild(orderCell);
    row.appendChild(actionsCell);
    tbody.appendChild(row);
  });
}

function openSkillModal(skill) {
  clearFormAlert("skillFormAlert");
  document.getElementById("skillModalTitle").textContent = skill
    ? i18n.t("admin.dashboard.editSkillModalTitle")
    : i18n.t("admin.dashboard.newSkillModalTitle");
  document.getElementById("skillId").value = skill ? skill.id : "";
  document.getElementById("skillCategory").value = skill ? skill.category : "";
  document.getElementById("skillName").value = skill ? skill.name : "";
  document.getElementById("skillOrder").value = skill ? skill.display_order : 0;
  openModal("skill");
}

async function deleteSkill(id, name) {
  const msg = i18n.t("admin.dashboard.confirmDeleteSkill").replace("{name}", name);
  if (!window.confirm(msg)) return;
  try {
    await adminApi.deleteSkill(id);
    showGlobalAlert(i18n.t("admin.dashboard.skillDeleted"), "success");
    loadSkills();
  } catch (error) {
    showGlobalAlert(error.message || i18n.t("admin.dashboard.errorDeleteSkill"), "error");
  }
}

document.getElementById("newSkillBtn").addEventListener("click", () => openSkillModal(null));

document.getElementById("skillForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormAlert("skillFormAlert");

  const id = document.getElementById("skillId").value;
  const payload = {
    category: document.getElementById("skillCategory").value.trim(),
    name: document.getElementById("skillName").value.trim(),
    display_order: parseInt(document.getElementById("skillOrder").value, 10) || 0,
  };

  const submitBtn = document.getElementById("skillSubmitBtn");
  submitBtn.disabled = true;

  try {
    if (id) {
      await adminApi.updateSkill(id, payload);
    } else {
      await adminApi.createSkill(payload);
    }
    closeModal("skill");
    showGlobalAlert(i18n.t("admin.dashboard.skillSaved"), "success");
    loadSkills();
  } catch (error) {
    showFormAlert("skillFormAlert", error.message || i18n.t("admin.dashboard.errorSaveSkill"));
  } finally {
    submitBtn.disabled = false;
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await adminApi.logout();
  } finally {
    window.location.href = "login.html";
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const authed = await requireAdminSession();
  if (!authed) return;
  loadProjects();
  loadSkills();
});