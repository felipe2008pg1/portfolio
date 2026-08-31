let projectsCache = [];
let skillsCache = [];

let globalAlertHideTimer = null;

function showGlobalAlert(message, type) {
  const el = document.getElementById("globalAlert");
  clearTimeout(globalAlertHideTimer);

  el.textContent = message;
  el.className = `admin-alert admin-toast is-${type}`;
  // Força reflow para reiniciar a animação de entrada em toasts consecutivos
  void el.offsetWidth;
  el.classList.add("is-visible");

  globalAlertHideTimer = setTimeout(() => {
    el.classList.remove("is-visible");
  }, 4000);
}

function showFormAlert(elId, message) {
  const el = document.getElementById(elId);
  el.textContent = message;
  el.className = "admin-alert is-visible is-error";
}

function clearFormAlert(elId) {
  document.getElementById(elId).className = "admin-alert";
}

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

function openModal(name) { document.getElementById(`${name}ModalOverlay`).classList.add("is-open"); }
function closeModal(name) { document.getElementById(`${name}ModalOverlay`).classList.remove("is-open"); }

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

setupDirtyTracking("project", "projectForm");
setupDirtyTracking("skill", "skillForm");
setupDirtyTracking("experience", "experienceForm");

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

document.querySelectorAll("[data-close-modal]").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(btn.getAttribute("data-close-modal")));
});

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
  if (!(await confirmAction(i18n.t("admin.confirm.deleteProject").replace("{name}", title)))) return;
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
  resetDirty("skill");
  clearFormAlert("skillFormAlert");
  document.getElementById("skillModalTitle").textContent = skill ? "Editar skill" : "Nova skill";
  document.getElementById("skillId").value = skill ? skill.id : "";
  document.getElementById("skillCategory").value = skill ? skill.category : "";
  document.getElementById("skillName").value = skill ? skill.name : "";
  document.getElementById("skillOrder").value = skill ? skill.display_order : 0;
  openModal("skill");
}

async function deleteSkill(id, name) {
  if (!(await confirmAction(i18n.t("admin.confirm.deleteSkill").replace("{name}", name)))) return;
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
  const totalExperiencesEl = document.getElementById("statTotalExperiences");

  if (totalProjectsEl) totalProjectsEl.textContent = String(projectsCache.length);
  if (publishedEl) {
    const publishedCount = projectsCache.filter((project) => project.is_published).length;
    publishedEl.textContent = String(publishedCount);
  }
  if (totalSkillsEl) totalSkillsEl.textContent = String(skillsCache.length);
  if (totalExperiencesEl) totalExperiencesEl.textContent = String(experiencesCache.length);
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
  renderSecurityPanel();
}

function renderMfaStat() {
  const mfaStatusEl = document.getElementById("statMfaStatus");
  const badge = document.getElementById("topbarMfaBadge");
  const badgeText = document.getElementById("topbarMfaBadgeText");

  if (mfaStatusEl) {
    if (mfaStatusCache === "on") {
      mfaStatusEl.textContent = i18n.t("admin.stat.mfaOn");
    } else if (mfaStatusCache === "off") {
      mfaStatusEl.textContent = i18n.t("admin.stat.mfaOff");
    } else if (mfaStatusCache === "error") {
      mfaStatusEl.textContent = "—";
    }
  }

  if (badge && badgeText) {
    if (mfaStatusCache === "on") {
      badge.className = "admin-mfa-badge is-on";
      badge.title = i18n.t("admin.stat.mfaOn");
      badgeText.textContent = "MFA";
    } else if (mfaStatusCache === "off") {
      badge.className = "admin-mfa-badge is-off";
      badge.title = i18n.t("admin.stat.mfaOff");
      badgeText.textContent = "MFA";
    } else {
      badge.className = "admin-mfa-badge is-off";
      badge.title = "—";
      badgeText.textContent = "MFA";
    }
  }
}

function renderSecurityPanel() {
  const statusText = document.getElementById("mfaStatusText");
  const enableBtn = document.getElementById("mfaEnableBtn");
  const disableBtn = document.getElementById("mfaDisableBtn");
  if (!statusText || !enableBtn || !disableBtn) return;

  if (mfaStatusCache === "on") {
    statusText.textContent = i18n.t("admin.security.enabled");
    enableBtn.style.display = "none";
    disableBtn.style.display = "";
  } else if (mfaStatusCache === "off") {
    statusText.textContent = i18n.t("admin.security.disabled");
    enableBtn.style.display = "";
    disableBtn.style.display = "none";
  } else if (mfaStatusCache === "error") {
    statusText.textContent = i18n.t("admin.security.checkError");
    enableBtn.style.display = "none";
    disableBtn.style.display = "none";
  }
}

function buildMfaField(labelText, value, mono) {
  const wrap = document.createElement("div");
  wrap.style.marginBottom = "var(--space-4)";

  const label = document.createElement("p");
  label.className = "about-fact-label";
  label.textContent = labelText;

  const val = document.createElement("p");
  val.className = "about-fact-value";
  val.textContent = value;
  if (mono) val.style.fontFamily = "var(--font-mono)";
  val.style.wordBreak = "break-all";

  wrap.appendChild(label);
  wrap.appendChild(val);
  return wrap;
}

function startMfaSetup() {
  const enableBtn = document.getElementById("mfaEnableBtn");
  enableBtn.disabled = true;

  adminApi
    .mfaSetupInit()
    .then((data) => {
      document.getElementById("mfaModalTitle").textContent = i18n.t("admin.security.enableBtn");
      clearFormAlert("mfaModalAlert");

      const body = document.getElementById("mfaModalBody");
      body.innerHTML = "";

      const instructions = document.createElement("p");
      instructions.className = "about-fact-value";
      instructions.style.marginBottom = "var(--space-4)";
      instructions.textContent = i18n.t("admin.security.scanQr");
      body.appendChild(instructions);

      const qr = document.createElement("img");
      qr.src = data.qr_code_base64;
      qr.alt = "QR code";
      qr.style.display = "block";
      qr.style.margin = "0 auto var(--space-4)";
      qr.style.maxWidth = "200px";
      body.appendChild(qr);

      body.appendChild(buildMfaField(i18n.t("admin.security.secretLabel"), data.secret, true));

      const form = document.createElement("form");
      form.id = "mfaSetupConfirmForm";

      const input = document.createElement("input");
      input.type = "text";
      input.id = "mfaSetupCode";
      input.className = "form-input";
      input.placeholder = i18n.t("admin.security.codePlaceholder");
      input.maxLength = 6;
      input.autocomplete = "one-time-code";
      input.required = true;
      input.style.marginBottom = "var(--space-3)";

      const submitBtn = document.createElement("button");
      submitBtn.type = "submit";
      submitBtn.className = "btn btn-primary btn-sm";
      submitBtn.textContent = i18n.t("admin.security.confirmBtn");

      form.appendChild(input);
      form.appendChild(submitBtn);
      body.appendChild(form);

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        submitBtn.disabled = true;
        clearFormAlert("mfaModalAlert");
        try {
          const { backup_codes } = await adminApi.mfaSetupConfirm(input.value.trim());
          renderMfaBackupCodes(backup_codes);
          await updateMfaStat();
        } catch (error) {
          showFormAlert("mfaModalAlert", error.message);
        } finally {
          submitBtn.disabled = false;
        }
      });

      openModal("mfa");
    })
    .catch((error) => showGlobalAlert(error.message, "error"))
    .finally(() => {
      enableBtn.disabled = false;
    });
}

function renderMfaBackupCodes(codes) {
  document.getElementById("mfaModalTitle").textContent = i18n.t("admin.security.backupCodesTitle");

  const body = document.getElementById("mfaModalBody");
  body.innerHTML = "";

  const desc = document.createElement("p");
  desc.className = "about-fact-value";
  desc.style.marginBottom = "var(--space-4)";
  desc.textContent = i18n.t("admin.security.backupCodesDesc");
  body.appendChild(desc);

  const list = document.createElement("ul");
  list.style.fontFamily = "var(--font-mono)";
  list.style.marginBottom = "var(--space-4)";
  codes.forEach((code) => {
    const li = document.createElement("li");
    li.textContent = code;
    list.appendChild(li);
  });
  body.appendChild(list);

  const doneBtn = document.createElement("button");
  doneBtn.type = "button";
  doneBtn.className = "btn btn-primary btn-sm";
  doneBtn.textContent = i18n.t("admin.security.doneBtn");
  doneBtn.addEventListener("click", () => closeModal("mfa"));
  body.appendChild(doneBtn);
}

function startMfaDisable() {
  document.getElementById("mfaModalTitle").textContent = i18n.t("admin.security.disableBtn");
  clearFormAlert("mfaModalAlert");

  const body = document.getElementById("mfaModalBody");
  body.innerHTML = "";

  const form = document.createElement("form");
  form.id = "mfaDisableForm";

  const input = document.createElement("input");
  input.type = "text";
  input.id = "mfaDisableCode";
  input.className = "form-input";
  input.placeholder = i18n.t("admin.security.disableCodePlaceholder");
  input.autocomplete = "one-time-code";
  input.required = true;
  input.style.marginBottom = "var(--space-3)";

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "btn btn-danger btn-sm";
  submitBtn.textContent = i18n.t("admin.security.disableBtn");

  form.appendChild(input);
  form.appendChild(submitBtn);
  body.appendChild(form);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submitBtn.disabled = true;
    clearFormAlert("mfaModalAlert");
    try {
      await adminApi.mfaDisable(input.value.trim());
      closeModal("mfa");
      await updateMfaStat();
    } catch (error) {
      showFormAlert("mfaModalAlert", error.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  openModal("mfa");
}

document.getElementById("mfaEnableBtn").addEventListener("click", startMfaSetup);
document.getElementById("mfaDisableBtn").addEventListener("click", startMfaDisable);

let experiencesCache = [];

async function loadExperiences() {
  const tbody = document.getElementById("experiencesTableBody");
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
  document.getElementById("experienceOrder").value = experience ? experience.display_order : 0;
  document.getElementById("experiencePublished").checked = experience ? experience.is_published : true;
  openModal("experience");
}

async function deleteExperience(id, company) {
  if (!(await confirmAction(i18n.t("admin.confirm.deleteExperience").replace("{name}", company)))) return;
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
  loadChatConversations();
  setInterval(loadChatConversations, 6000);
  chatPollTimer = setInterval(pollActiveChatConversation, 5000);
});

// ===== CHAT =====
let chatConversationsCache = [];
let chatActiveConversationId = null;
let chatPollTimer = null;
let chatLastMessageId = 0;

function chatStatusLabel(statusValue) {
  return i18n.t(`admin.dashboard.chatStatus${statusValue.charAt(0).toUpperCase()}${statusValue.slice(1)}`);
}

function chatConversationHeaderLabel(conversationId, statusValue) {
  const label = i18n.t("admin.dashboard.chatConversationLabel").replace("{id}", conversationId);
  return statusValue ? `${label} — ${chatStatusLabel(statusValue)}` : label;
}

function renderChatConversationList() {
  const container = document.getElementById("chatConversationList");
  container.innerHTML = "";

  if (chatConversationsCache.length === 0) {
    const empty = document.createElement("div");
    empty.className = "admin-chat-empty";
    empty.textContent = i18n.t("admin.dashboard.chatNoConversations");
    container.appendChild(empty);
    return;
  }

  chatConversationsCache.forEach((conversation) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "admin-chat-conversation" + (conversation.id === chatActiveConversationId ? " is-active" : "");

    const idRow = document.createElement("div");
    idRow.className = "admin-chat-conversation-id";
    idRow.textContent = i18n.t("admin.dashboard.chatConversationLabel").replace("{id}", conversation.id);

    const metaRow = document.createElement("div");
    metaRow.className = "admin-chat-conversation-meta";

    const date = document.createElement("span");
    const when = conversation.last_message_at || conversation.created_at;
    date.textContent = when ? new Date(when).toLocaleString(i18n.getLang() === "en" ? "en-US" : "pt-BR") : "";

    const badge = document.createElement("span");
    badge.className = `admin-chat-badge status-${conversation.status}`;
    badge.textContent = chatStatusLabel(conversation.status);

    metaRow.appendChild(date);
    metaRow.appendChild(badge);
    item.appendChild(idRow);
    item.appendChild(metaRow);

    item.addEventListener("click", () => selectChatConversation(conversation.id));
    container.appendChild(item);
  });
}

async function loadChatConversations() {
  try {
    chatConversationsCache = await adminApi.getConversations();
    renderChatConversationList();
  } catch (error) {
    // Silent on background refresh; the list simply stays as-is until the next tick.
  }
}

function appendChatBubble(container, message) {
  const bubble = document.createElement("div");
  bubble.className = "admin-chat-bubble admin-chat-bubble-" + message.sender;
  bubble.textContent = message.content; // textContent only — never innerHTML with API data
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function updateChatActionButtons(conversation) {
  const actionsEl = document.getElementById("chatThreadActions");
  const formEl = document.getElementById("chatReplyForm");

  actionsEl.style.display = "flex";
  formEl.style.display = conversation && conversation.status !== "closed" ? "flex" : "none";

  document.getElementById("chatCloseBtn").style.display =
    conversation && conversation.status !== "closed" ? "inline-flex" : "none";
  document.getElementById("chatReopenBtn").style.display =
    conversation && conversation.status === "closed" ? "inline-flex" : "none";
  document.getElementById("chatBlockBtn").style.display =
    conversation && conversation.status !== "blocked" ? "inline-flex" : "none";
}

async function selectChatConversation(conversationId) {
  chatActiveConversationId = conversationId;
  chatLastMessageId = 0;
  renderChatConversationList();

  const conversation = chatConversationsCache.find((c) => c.id === conversationId);
  const messagesEl = document.getElementById("chatThreadMessages");
  const headerEl = document.getElementById("chatThreadHeader");

  messagesEl.innerHTML = "";
  headerEl.textContent = chatConversationHeaderLabel(conversationId, conversation ? conversation.status : "");
  updateChatActionButtons(conversation);

  try {
    const messages = await adminApi.getConversationMessages(conversationId, 0);
    messages.forEach((message) => {
      appendChatBubble(messagesEl, message);
      chatLastMessageId = Math.max(chatLastMessageId, message.id);
    });
  } catch (error) {
    headerEl.textContent = i18n.t("admin.dashboard.chatErrorLoad");
  }
}

async function pollActiveChatConversation() {
  if (!chatActiveConversationId) return;
  try {
    const messages = await adminApi.getConversationMessages(chatActiveConversationId, chatLastMessageId);
    const messagesEl = document.getElementById("chatThreadMessages");
    messages.forEach((message) => {
      appendChatBubble(messagesEl, message);
      chatLastMessageId = Math.max(chatLastMessageId, message.id);
    });
  } catch (error) {
    // Transient polling failure — retried on the next tick.
  }
}

function renderChatSection() {
  renderChatConversationList();
  if (chatActiveConversationId) {
    const conversation = chatConversationsCache.find((c) => c.id === chatActiveConversationId);
    document.getElementById("chatThreadHeader").textContent =
      chatConversationHeaderLabel(chatActiveConversationId, conversation ? conversation.status : "");
  } else {
    document.getElementById("chatThreadHeader").textContent = i18n.t("admin.dashboard.chatSelectConversation");
  }
}
window.renderChatSection = renderChatSection;

async function updateChatConversationStatus(newStatus) {
  if (!chatActiveConversationId) return;
  try {
    await adminApi.updateConversationStatus(chatActiveConversationId, newStatus);
    await loadChatConversations();
    await selectChatConversation(chatActiveConversationId);
  } catch (error) {
    alert(error.message || i18n.t("admin.dashboard.chatErrorStatus"));
  }
}

document.getElementById("chatReplyForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!chatActiveConversationId) return;

  const input = document.getElementById("chatReplyInput");
  const content = input.value.trim();
  if (!content) return;

  const sendBtn = document.getElementById("chatReplySend");
  sendBtn.disabled = true;

  try {
    const message = await adminApi.sendConversationMessage(chatActiveConversationId, content);
    appendChatBubble(document.getElementById("chatThreadMessages"), message);
    chatLastMessageId = Math.max(chatLastMessageId, message.id);
    input.value = "";
  } catch (error) {
    alert(error.message || i18n.t("admin.dashboard.chatErrorSend"));
  } finally {
    sendBtn.disabled = false;
  }
});

document.getElementById("chatBlockBtn").addEventListener("click", () => updateChatConversationStatus("blocked"));
document.getElementById("chatCloseBtn").addEventListener("click", () => updateChatConversationStatus("closed"));
document.getElementById("chatReopenBtn").addEventListener("click", () => updateChatConversationStatus("open"));

document.getElementById("chatDeleteBtn").addEventListener("click", async () => {
  if (!chatActiveConversationId) return;

  const message = i18n.t("admin.dashboard.chatConfirmDelete").replace("{id}", chatActiveConversationId);
  if (!(await confirmAction(message, { confirmLabel: i18n.t("admin.confirm.delete") }))) return;

  const deletedId = chatActiveConversationId;
  try {
    await adminApi.deleteConversation(deletedId);
    chatActiveConversationId = null;
    chatLastMessageId = 0;
    document.getElementById("chatThreadMessages").innerHTML = "";
    document.getElementById("chatThreadActions").style.display = "none";
    document.getElementById("chatReplyForm").style.display = "none";
    document.getElementById("chatThreadHeader").textContent = i18n.t("admin.dashboard.chatSelectConversation");
    await loadChatConversations();
  } catch (error) {
    alert(error.message || i18n.t("admin.dashboard.chatErrorDelete"));
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
  loadChatConversations();
  setInterval(loadChatConversations, 6000);
  chatPollTimer = setInterval(pollActiveChatConversation, 5000);
});