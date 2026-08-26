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
    updateStats();
  } catch (error) {
    tbody.innerHTML = "";
    const row = document.createElement("tr");
    row.className = "admin-empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = i18n.t("admin.dashboard.errorLoadingProjects");
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
  document.getElementById("projectDescriptionEn").value = project && project.description_en ? project.description_en : "";
  document.getElementById("projectStack").value = project ? project.stack : "";
  document.getElementById("projectImageUrl").value = project && project.image_path ? project.image_path : "";
  document.getElementById("projectRepoUrl").value = project && project.repo_url ? project.repo_url : "";
  document.getElementById("projectDemoUrl").value = project && project.demo_url ? project.demo_url : "";
  document.getElementById("projectPublished").checked = project ? project.is_published : true;
  openModal("project");
}

async function deleteProject(id, title) {
  if (!window.confirm(`Excluir o projeto "${title}"? Essa ação não pode ser desfeita.`)) return;
  try {
    await adminApi.deleteProject(id);
    showGlobalAlert("Projeto excluído.", "success");
    loadProjects();
  } catch (error) {
    showGlobalAlert(error.message || "Erro ao excluir projeto.", "error");
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
    description_en: document.getElementById("projectDescriptionEn").value.trim() || null,
    stack: document.getElementById("projectStack").value.trim(),
    image_path: document.getElementById("projectImageUrl").value.trim() || null,
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
    showGlobalAlert("Projeto salvo com sucesso.", "success");
    loadProjects();
  } catch (error) {
    showFormAlert("projectFormAlert", error.message || "Erro ao salvar projeto.");
  } finally {
    submitBtn.disabled = false;
  }
});

async function loadSkills() {
  const tbody = document.getElementById("skillsTableBody");
  try {
    skillsCache = await adminApi.getSkills();
    renderSkillsTable();
    updateStats();
  } catch (error) {
    tbody.innerHTML = "";
    const row = document.createElement("tr");
    row.className = "admin-empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = i18n.t("admin.dashboard.errorLoadingSkills");
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
  document.getElementById("skillModalTitle").textContent = skill ? "Editar skill" : "Nova skill";
  document.getElementById("skillId").value = skill ? skill.id : "";
  document.getElementById("skillCategory").value = skill ? skill.category : "";
  document.getElementById("skillName").value = skill ? skill.name : "";
  document.getElementById("skillOrder").value = skill ? skill.display_order : 0;
  openModal("skill");
}

async function deleteSkill(id, name) {
  if (!window.confirm(`Excluir a skill "${name}"?`)) return;
  try {
    await adminApi.deleteSkill(id);
    showGlobalAlert("Skill excluída.", "success");
    loadSkills();
  } catch (error) {
    showGlobalAlert(error.message || "Erro ao excluir skill.", "error");
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
    showGlobalAlert("Skill salva com sucesso.", "success");
    loadSkills();
  } catch (error) {
    showFormAlert("skillFormAlert", error.message || "Erro ao salvar skill.");
  } finally {
    submitBtn.disabled = false;
  }
});

function updateStats() {
  const totalProjectsEl = document.getElementById("statTotalProjects");
  const publishedEl = document.getElementById("statPublished");
  const totalSkillsEl = document.getElementById("statTotalSkills");

  if (totalProjectsEl) totalProjectsEl.textContent = String(projectsCache.length);
  if (publishedEl) {
    const publishedCount = projectsCache.filter((project) => project.is_published).length;
    publishedEl.textContent = String(publishedCount);
  }
  if (totalSkillsEl) totalSkillsEl.textContent = String(skillsCache.length);
}

let mfaStatusCache = null;

async function updateMfaStat() {
  try {
    const { enabled } = await adminApi.getMfaStatus();
    mfaStatusCache = enabled ? "on" : "off";
  } catch (error) {
    mfaStatusCache = "error";
  }
  renderMfaStat();
}

function renderMfaStat() {
  const mfaStatusEl = document.getElementById("statMfaStatus");
  if (!mfaStatusEl) return;

  if (mfaStatusCache === "on") {
    mfaStatusEl.textContent = i18n.t("admin.stat.mfaOn");
  } else if (mfaStatusCache === "off") {
    mfaStatusEl.textContent = i18n.t("admin.stat.mfaOff");
  } else if (mfaStatusCache === "error") {
    mfaStatusEl.textContent = "—";
  }
}

let experiencesCache = [];

async function loadExperiences() {
  const tbody = document.getElementById("experiencesTableBody");
  try {
    experiencesCache = await adminApi.getAllExperiences();
    renderExperiencesTable();
  } catch (error) {
    tbody.innerHTML = "";
    const row = document.createElement("tr");
    row.className = "admin-empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = i18n.t("admin.dashboard.errorLoadingExperiences");
    row.appendChild(cell);
    tbody.appendChild(row);
  }
}

function renderExperiencesTable() {
  const tbody = document.getElementById("experiencesTableBody");
  tbody.innerHTML = "";

  if (experiencesCache.length === 0) {
    const row = document.createElement("tr");
    row.className = "admin-empty-row";
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = i18n.t("admin.dashboard.noExperiences");
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  experiencesCache.forEach((experience) => {
    const row = document.createElement("tr");

    const companyCell = document.createElement("td");
    companyCell.textContent = experience.company;
    const roleCell = document.createElement("td");
    roleCell.textContent = experience.role;
    const periodCell = document.createElement("td");
    periodCell.textContent = experience.period;
    const publishedCell = document.createElement("td");
    publishedCell.textContent = experience.is_published ? i18n.t("admin.dashboard.yes") : i18n.t("admin.dashboard.no");

    const actionsCell = document.createElement("td");
    actionsCell.className = "col-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-outline btn-sm";
    editBtn.textContent = i18n.t("admin.dashboard.edit");
    editBtn.addEventListener("click", () => openExperienceModal(experience));
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-danger btn-sm";
    deleteBtn.textContent = i18n.t("admin.dashboard.delete");
    deleteBtn.addEventListener("click", () => deleteExperience(experience.id, experience.company));
    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(deleteBtn);

    row.appendChild(companyCell);
    row.appendChild(roleCell);
    row.appendChild(periodCell);
    row.appendChild(publishedCell);
    row.appendChild(actionsCell);
    tbody.appendChild(row);
  });
}

function openExperienceModal(experience) {
  clearFormAlert("experienceFormAlert");
  document.getElementById("experienceModalTitle").textContent = experience
    ? i18n.t("admin.dashboard.editExperienceModalTitle")
    : i18n.t("admin.dashboard.newExperienceModalTitle");
  document.getElementById("experienceId").value = experience ? experience.id : "";
  document.getElementById("experienceCompany").value = experience ? experience.company : "";
  document.getElementById("experienceRole").value = experience ? experience.role : "";
  document.getElementById("experiencePeriod").value = experience ? experience.period : "";
  document.getElementById("experienceDescription").value = experience ? experience.description : "";
  document.getElementById("experienceDescriptionEn").value = experience && experience.description_en ? experience.description_en : "";
  document.getElementById("experienceCompanyUrl").value = experience && experience.company_url ? experience.company_url : "";
  document.getElementById("experienceLogoUrl").value = experience && experience.logo_url ? experience.logo_url : "";
  document.getElementById("experienceOrder").value = experience ? experience.display_order : 0;
  document.getElementById("experiencePublished").checked = experience ? experience.is_published : true;
  openModal("experience");
}

async function deleteExperience(id, company) {
  if (!window.confirm(`Excluir a experiência "${company}"? Essa ação não pode ser desfeita.`)) return;
  try {
    await adminApi.deleteExperience(id);
    showGlobalAlert("Experiência excluída.", "success");
    loadExperiences();
  } catch (error) {
    showGlobalAlert(error.message || "Erro ao excluir experiência.", "error");
  }
}

document.getElementById("newExperienceBtn").addEventListener("click", () => openExperienceModal(null));

document.getElementById("experienceForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormAlert("experienceFormAlert");

  const id = document.getElementById("experienceId").value;
  const payload = {
    company: document.getElementById("experienceCompany").value.trim(),
    role: document.getElementById("experienceRole").value.trim(),
    period: document.getElementById("experiencePeriod").value.trim(),
    description: document.getElementById("experienceDescription").value.trim(),
    description_en: document.getElementById("experienceDescriptionEn").value.trim() || null,
    company_url: document.getElementById("experienceCompanyUrl").value.trim() || null,
    logo_url: document.getElementById("experienceLogoUrl").value.trim() || null,
    is_published: document.getElementById("experiencePublished").checked,
    display_order: Number(document.getElementById("experienceOrder").value) || 0,
  };

  const submitBtn = document.getElementById("experienceSubmitBtn");
  submitBtn.disabled = true;

  try {
    if (id) {
      await adminApi.updateExperience(id, payload);
    } else {
      await adminApi.createExperience(payload);
    }
    closeModal("experience");
    showGlobalAlert("Experiência salva com sucesso.", "success");
    loadExperiences();
  } catch (error) {
    showFormAlert("experienceFormAlert", error.message || "Erro ao salvar experiência.");
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
  loadExperiences();
  updateMfaStat();
});