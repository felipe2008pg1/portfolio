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

/* ===== PROJECTS ===== */
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
  document.getElementById("projectDescriptionEn").value = project && project.description_en ? project.description_en : "";
  document.getElementById("projectStack").value = project ? project.stack : "";
  document.getElementById("projectImageUrl").value = project && project.image_path ? project.image_path : "";
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
    loadProjects();
  } catch (error) {
    showFormAlert("projectFormAlert", error.message || i18n.t("admin.dashboard.errorSaveProject"));
  } finally {
    submitBtn.disabled = false;
  }
});

/* ===== SKILLS ===== */
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

/* ===== MFA ===== */
function showMfaModalAlert(message, type) {
  const el = document.getElementById("mfaModalAlert");
  el.textContent = message;
  el.className = `admin-alert is-visible is-${type}`;
}

async function loadMfaStatus() {
  const statusText = document.getElementById("mfaStatusText");
  const enableBtn = document.getElementById("mfaEnableBtn");
  const disableBtn = document.getElementById("mfaDisableBtn");
  try {
    const result = await adminApi.mfaStatus();
    if (result.enabled) {
      statusText.textContent = "Ativado — sua conta está protegida com um segundo fator.";
      enableBtn.style.display = "none";
      disableBtn.style.display = "inline-flex";
    } else {
      statusText.textContent = "Desativado — recomendado ativar pra maior segurança.";
      enableBtn.style.display = "inline-flex";
      disableBtn.style.display = "none";
    }
  } catch (error) {
    statusText.textContent = "Não foi possível verificar o status do MFA.";
  }
}

function renderMfaSetupStep1(data) {
  const body = document.getElementById("mfaModalBody");
  body.innerHTML = "";

  const p1 = document.createElement("p");
  p1.style.marginBottom = "12px";
  p1.textContent = "Escaneie o QR code com o Google Authenticator, Authy ou similar:";
  body.appendChild(p1);

  const img = document.createElement("img");
  img.src = data.qr_code_base64;
  img.alt = "QR code MFA";
  img.style.display = "block";
  img.style.margin = "0 auto 16px";
  img.style.width = "200px";
  img.style.height = "200px";
  body.appendChild(img);

  const p2 = document.createElement("p");
  p2.style.fontSize = "var(--fs-xs)";
  p2.style.color = "var(--color-text-muted)";
  p2.style.marginBottom = "16px";
  p2.textContent = `Ou digite manualmente: ${data.secret}`;
  body.appendChild(p2);

  const field = document.createElement("div");
  field.className = "form-field";
  const label = document.createElement("label");
  label.textContent = "Digite o código de 6 dígitos gerado pelo app";
  label.setAttribute("for", "mfaSetupCode");
  const input = document.createElement("input");
  input.type = "text";
  input.id = "mfaSetupCode";
  input.maxLength = 6;
  input.placeholder = "123456";
  field.appendChild(label);
  field.appendChild(input);
  body.appendChild(field);

  const actions = document.createElement("div");
  actions.className = "admin-form-actions";
  const confirmBtn = document.createElement("button");
  confirmBtn.className = "btn btn-primary";
  confirmBtn.textContent = "Confirmar e ativar";
  confirmBtn.addEventListener("click", async () => {
    const code = input.value.trim();
    if (!code) return;
    confirmBtn.disabled = true;
    try {
      const result = await adminApi.mfaSetupConfirm(code);
      renderMfaBackupCodes(result.backup_codes);
    } catch (error) {
      showMfaModalAlert(error.message || "Código inválido.", "error");
      confirmBtn.disabled = false;
    }
  });
  actions.appendChild(confirmBtn);
  body.appendChild(actions);
}

function renderMfaBackupCodes(codes) {
  document.getElementById("mfaModalTitle").textContent = "Guarde seus códigos de backup";
  const body = document.getElementById("mfaModalBody");
  body.innerHTML = "";

  const warning = document.createElement("p");
  warning.style.marginBottom = "12px";
  warning.style.color = "var(--color-danger)";
  warning.textContent = "Esses códigos só aparecem uma vez. Guarde em local seguro — cada um funciona uma única vez caso você perca acesso ao app autenticador.";
  body.appendChild(warning);

  const list = document.createElement("div");
  list.style.fontFamily = "var(--font-mono)";
  list.style.background = "var(--color-paper)";
  list.style.border = "1px solid var(--color-border)";
  list.style.borderRadius = "var(--radius-sm)";
  list.style.padding = "16px";
  list.style.marginBottom = "16px";
  list.style.display = "grid";
  list.style.gridTemplateColumns = "1fr 1fr";
  list.style.gap = "8px";
  codes.forEach((code) => {
    const span = document.createElement("span");
    span.textContent = code;
    list.appendChild(span);
  });
  body.appendChild(list);

  const actions = document.createElement("div");
  actions.className = "admin-form-actions";
  const doneBtn = document.createElement("button");
  doneBtn.className = "btn btn-primary";
  doneBtn.textContent = "Já salvei, fechar";
  doneBtn.addEventListener("click", () => {
    closeModal("mfa");
    loadMfaStatus();
    showGlobalAlert("MFA ativado com sucesso.", "success");
  });
  actions.appendChild(doneBtn);
  body.appendChild(actions);
}

document.getElementById("mfaEnableBtn").addEventListener("click", async () => {
  document.getElementById("mfaModalTitle").textContent = "Ativar MFA";
  document.getElementById("mfaModalAlert").className = "admin-alert";
  document.getElementById("mfaModalBody").innerHTML = "<p>Gerando QR code…</p>";
  openModal("mfa");
  try {
    const data = await adminApi.mfaSetupInit();
    renderMfaSetupStep1(data);
  } catch (error) {
    showMfaModalAlert(error.message || "Erro ao iniciar configuração.", "error");
  }
});

document.getElementById("mfaDisableBtn").addEventListener("click", async () => {
  const code = window.prompt("Digite um código do autenticador (ou código de backup) pra confirmar a desativação:");
  if (!code) return;
  try {
    await adminApi.mfaDisable(code);
    showGlobalAlert("MFA desativado.", "success");
    loadMfaStatus();
  } catch (error) {
    showGlobalAlert(error.message || "Código inválido.", "error");
  }
});

/* ===== LOGOUT ===== */
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await adminApi.logout();
  } finally {
    window.location.href = "login.html";
  }
});

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", async () => {
  const authed = await requireAdminSession();
  if (!authed) return;
  loadProjects();
  loadSkills();
  loadMfaStatus();
});