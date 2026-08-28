let projectsCache = [];
let skillsCache = [];
let experiencesCache = [];
let mfaEnabledCache = null;

/* =====================================================
   ALERTS / TOAST
===================================================== */

let globalAlertHideTimer = null;

function showGlobalAlert(message, type) {
  const el = document.getElementById("globalAlert");
  if (!el) return;

  clearTimeout(globalAlertHideTimer);
  el.textContent = message;
  el.className = `admin-alert admin-toast is-${type}`;
  void el.offsetWidth;
  el.classList.add("is-visible");

  globalAlertHideTimer = setTimeout(() => {
    el.classList.remove("is-visible");
  }, 4000);
}

function showFormAlert(elId, message) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message;
  el.className = "admin-alert is-visible is-error";
}

function clearFormAlert(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = "admin-alert";
}

/* =====================================================
   MODALS
===================================================== */

function openModal(name) {
  const modal = document.getElementById(`${name}ModalOverlay`);
  if (modal) modal.classList.add("is-open");
}

function closeModal(name) {
  const modal = document.getElementById(`${name}ModalOverlay`);
  if (modal) modal.classList.remove("is-open");
}

const dirtyForms = {};

function setupDirtyTracking(name, formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  dirtyForms[name] = false;

  form.addEventListener("input", () => {
    dirtyForms[name] = true;
    const dot = document.getElementById(`${name}DirtyDot`);
    if (dot) dot.classList.add("is-visible");
  });

  form.addEventListener("submit", () => resetDirty(name));
}

function resetDirty(name) {
  dirtyForms[name] = false;
  const dot = document.getElementById(`${name}DirtyDot`);
  if (dot) dot.classList.remove("is-visible");
}

async function requestCloseModal(name) {
  if (dirtyForms[name]) {
    const confirmed = await confirmAction(i18n.t("admin.confirm.unsavedChanges"), {
      confirmLabel: i18n.t("admin.confirm.closeAnyway"),
    });
    if (!confirmed) return;
  }
  closeModal(name);
}

function confirmAction(message, options = {}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirmModalOverlay");
    const titleEl = document.getElementById("confirmModalTitle");
    const messageEl = document.getElementById("confirmModalMessage");
    const cancelBtn = document.getElementById("confirmModalCancel");
    const confirmBtn = document.getElementById("confirmModalConfirm");

    titleEl.textContent = options.title || i18n.t("admin.confirm.title");
    cancelBtn.textContent = i18n.t("admin.confirm.cancel");
    confirmBtn.textContent = options.confirmLabel || i18n.t("admin.confirm.delete");
    messageEl.textContent = message;
    openModal("confirm");

    function cleanup(result) {
      overlay.classList.remove("is-open");
      cancelBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
      overlay.removeEventListener("click", onOverlayClick);
      resolve(result);
    }

    function onCancel() { cleanup(false); }
    function onConfirm() { cleanup(true); }
    function onOverlayClick(event) {
      if (event.target === overlay) cleanup(false);
    }

    cancelBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
    overlay.addEventListener("click", onOverlayClick);
  });
}

setupDirtyTracking("project", "projectForm");
setupDirtyTracking("skill", "skillForm");
setupDirtyTracking("experience", "experienceForm");

document.querySelectorAll("[data-close-modal]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const name = btn.getAttribute("data-close-modal");
    if (Object.prototype.hasOwnProperty.call(dirtyForms, name)) {
      requestCloseModal(name);
    } else {
      closeModal(name);
    }
  });
});

/* =====================================================
   SKELETON
===================================================== */

function renderTableSkeleton(tbody, colSpan, rows = 4) {
  tbody.innerHTML = "";
  for (let i = 0; i < rows; i++) {
    const row = document.createElement("tr");
    row.className = "admin-skeleton-row";
    const cell = document.createElement("td");
    cell.colSpan = colSpan;
    const bar = document.createElement("div");
    bar.className = "skeleton skeleton-line";
    bar.style.width = `${70 - i * 8}%`;
    cell.appendChild(bar);
    row.appendChild(cell);
    tbody.appendChild(row);
  }
}

/* =====================================================
   PROJECTS
===================================================== */

async function loadProjects() {
  const tbody = document.getElementById("projectsTableBody");
  renderTableSkeleton(tbody, 4);

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
    publishedCell.textContent = project.is_published
      ? i18n.t("admin.dashboard.yes")
      : i18n.t("admin.dashboard.no");

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
  resetDirty("project");
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
  const message = i18n.t("admin.dashboard.confirmDeleteProject").replace("{name}", title);
  if (!(await confirmAction(message))) return;

  try {
    await adminApi.deleteProject(id);
    showGlobalAlert(i18n.t("admin.dashboard.projectDeleted"), "success");
    await loadProjects();
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
    showGlobalAlert(i18n.t("admin.dashboard.projectSaved"), "success");
    await loadProjects();
  } catch (error) {
    showFormAlert("projectFormAlert", error.message || i18n.t("admin.dashboard.errorSaveProject"));
  } finally {
    submitBtn.disabled = false;
  }
});

/* =====================================================
   SKILLS
===================================================== */

async function loadSkills() {
  const tbody = document.getElementById("skillsTableBody");
  renderTableSkeleton(tbody, 4);

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
  resetDirty("skill");
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
  const message = i18n.t("admin.dashboard.confirmDeleteSkill").replace("{name}", name);
  if (!(await confirmAction(message))) return;

  try {
    await adminApi.deleteSkill(id);
    showGlobalAlert(i18n.t("admin.dashboard.skillDeleted"), "success");
    await loadSkills();
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
    await loadSkills();
  } catch (error) {
    showFormAlert("skillFormAlert", error.message || i18n.t("admin.dashboard.errorSaveSkill"));
  } finally {
    submitBtn.disabled = false;
  }
});

/* =====================================================
   EXPERIENCES
===================================================== */

async function loadExperiences() {
  const tbody = document.getElementById("experiencesTableBody");
  if (!tbody) return;
  renderTableSkeleton(tbody, 5);

  try {
    experiencesCache = await adminApi.getAllExperiences();
    renderExperiencesTable();
    updateStats();
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
  if (!tbody) return;
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
    publishedCell.textContent = experience.is_published
      ? i18n.t("admin.dashboard.yes")
      : i18n.t("admin.dashboard.no");

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
  resetDirty("experience");
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
  document.getElementById("experiencePublished").checked = experience ? experience.is_published : true;
  document.getElementById("experienceOrder").value = experience ? experience.display_order : 0;

  openModal("experience");
}

async function deleteExperience(id, company) {
  const message = i18n.t("admin.dashboard.confirmDeleteExperience").replace("{name}", company);
  if (!(await confirmAction(message))) return;

  try {
    await adminApi.deleteExperience(id);
    showGlobalAlert(i18n.t("admin.dashboard.experienceDeleted"), "success");
    await loadExperiences();
  } catch (error) {
    showGlobalAlert(error.message || i18n.t("admin.dashboard.errorDeleteExperience"), "error");
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
    display_order: parseInt(document.getElementById("experienceOrder").value, 10) || 0,
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
    showGlobalAlert(i18n.t("admin.dashboard.experienceSaved"), "success");
    await loadExperiences();
  } catch (error) {
    showFormAlert("experienceFormAlert", error.message || i18n.t("admin.dashboard.errorSaveExperience"));
  } finally {
    submitBtn.disabled = false;
  }
});

/* =====================================================
   STATS
===================================================== */

function updateStats() {
  const totalProjects = document.getElementById("statTotalProjects");
  const published = document.getElementById("statPublished");
  const totalSkills = document.getElementById("statTotalSkills");
  const totalExperiences = document.getElementById("statTotalExperiences");

  if (totalProjects) totalProjects.textContent = String(projectsCache.length);
  if (published) published.textContent = String(projectsCache.filter((p) => p.is_published).length);
  if (totalSkills) totalSkills.textContent = String(skillsCache.length);
  if (totalExperiences) totalExperiences.textContent = String(experiencesCache.length);
}

async function updateMfaStat() {
  try {
    const { enabled } = await adminApi.getMfaStatus();
    mfaEnabledCache = enabled;
  } catch (error) {
    mfaEnabledCache = null;
  }
  renderMfaStat();
}

function renderMfaStat() {
  const mfaStat = document.getElementById("statMfaStatus");
  const badge = document.getElementById("topbarMfaBadge");
  const badgeText = document.getElementById("topbarMfaBadgeText");

  const label = mfaEnabledCache === true
    ? i18n.t("admin.stat.mfaOn")
    : mfaEnabledCache === false
    ? i18n.t("admin.stat.mfaOff")
    : "—";

  if (mfaStat) mfaStat.textContent = label;

  if (badge && badgeText) {
    badge.className = `admin-mfa-badge ${mfaEnabledCache ? "is-on" : "is-off"}`;
    badge.title = label;
    badgeText.textContent = "MFA";
  }
}

window.renderMfaStat = renderMfaStat;

/* =====================================================
   LOGOUT
===================================================== */

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await adminApi.logout();
  } finally {
    window.location.href = "login.html";
  }
});

/* =====================================================
   INITIALIZATION
===================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  const authed = await requireAdminSession();
  if (!authed) return;

  await loadProjects();
  await loadSkills();
  await loadExperiences();
  await updateMfaStat();
});