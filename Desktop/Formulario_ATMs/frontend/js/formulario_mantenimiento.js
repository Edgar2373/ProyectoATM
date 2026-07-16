// Fecha actual
const fecha = new Date();
const fechaISO = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

// Asignación de la fecha al campo de fecha del formulario
document.getElementById("fecha_mop_m").value = fechaISO;

// Funciones del Sidebar
function openSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  sidebar.classList.remove("-translate-x-full");
  overlay.classList.remove("hidden");
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  sidebar.classList.add("-translate-x-full");
  overlay.classList.add("hidden");
}

function toggleSidebarMenu(button) {
  const menuName = button.getAttribute("data-menu");
  const submenu = document.querySelector(`[data-submenu="${menuName}"]`);
  const chevron = button.querySelector(".sidebar-chevron");
  submenu.classList.toggle("open");
  chevron.classList.toggle("open");
}

function toggleSidebarItemMenu(button) {
  const itemName = button.getAttribute("data-item-menu");
  const submenu = document.querySelector(`[data-item-submenu="${itemName}"]`);
  const chevron = button.querySelector(".sidebar-chevron");
  submenu.classList.toggle("open");
  chevron.classList.toggle("open");
}

document
  .querySelectorAll("#sidebar a")
  .forEach((l) => l.addEventListener("click", closeSidebar));

function actualizarContextoFormulario() {
  const headerTitle = document.getElementById("formHeaderTitle");
  const headerSubtitle = document.getElementById("formHeaderSubtitle");
  const currentUrl = new URL(window.location.href);
  const currentPath = currentUrl.pathname.split("/").pop();
  const currentSearch = currentUrl.searchParams.toString();
  const selectionKey = currentSearch
    ? `${currentPath}?${currentSearch}`
    : currentPath;

  const selectionMap = {
    "formulario_mop_mantenimiento_preventivo.html": {
      title: "MOP Mantenimiento Preventivo",
      subtitle: "Procedimiento de Mantenimiento Preventivo (MOP)",
    },
  };

  const selection =
    selectionMap[selectionKey] ||
    selectionMap["formulario_mop_mantenimiento_preventivo.html"];
  if (headerTitle) headerTitle.textContent = selection.title;
  if (headerSubtitle) headerSubtitle.textContent = selection.subtitle;
  document.title = `${selection.title} - ATM/UPS`;

  const sidebarLinks = Array.from(
    document.querySelectorAll("#sidebar a[href]"),
  );
  sidebarLinks.forEach((link) => {
    link.classList.remove(
      "bg-slate-100",
      "dark:bg-slate-800",
      "text-primary",
      "font-semibold",
    );
  });

  const selectedLink =
    sidebarLinks.find((link) => {
      const linkUrl = new URL(link.getAttribute("href"), window.location.href);
      const linkSearch = linkUrl.searchParams.toString();
      return (
        linkUrl.pathname.split("/").pop() === currentPath &&
        linkSearch === currentSearch
      );
    }) ||
    sidebarLinks.find((link) => {
      const linkUrl = new URL(link.getAttribute("href"), window.location.href);
      return linkUrl.pathname.split("/").pop() === currentPath;
    });

  if (selectedLink) {
    selectedLink.classList.add(
      "bg-slate-100",
      "dark:bg-slate-800",
      "text-primary",
      "font-semibold",
    );
    let currentSubmenu = selectedLink.closest(".sidebar-submenu");
    while (currentSubmenu) {
      currentSubmenu.classList.add("open");
      const parentWrapper = currentSubmenu.parentElement;
      const parentButton = parentWrapper
        ? parentWrapper.querySelector(
            ":scope > button.sidebar-item-btn, :scope > button.sidebar-menu-btn",
          )
        : null;
      if (parentButton) {
        parentButton.classList.add("active");
        const chevron = parentButton.querySelector(".sidebar-chevron");
        if (chevron) chevron.classList.add("open");
      }
      currentSubmenu = parentWrapper
        ? parentWrapper.closest(".sidebar-submenu")
        : null;
    }
  }

  if (window.innerWidth < 1024) {
    closeSidebar();
  }
}

function redirigirALoginPorSesionExpirada() {
  if (authRedirectInProgress) return;
  authRedirectInProgress = true;
  localStorage.removeItem("user");
  alert("Tu sesión expiró. Inicia sesión nuevamente.");
  window.location.href = "login.html";
}

async function validarSesionBackend() {
  try {
    const response = await fetch(`${AUTH_API_BASE}/api/auth/me`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.user || null;
  } catch (_) {
    return null;
  }
}

async function asegurarSesionActiva() {
  const localUser = JSON.parse(localStorage.getItem("user") || "null");
  if (!localUser) {
    window.location.href = "login.html";
    return null;
  }
  const backendUser = await validarSesionBackend();
  if (!backendUser) {
    redirigirALoginPorSesionExpirada();
    return null;
  }
  const normalizedUser = {
    id: backendUser.id,
    nombre: backendUser.nombre || localUser.nombre || "",
    rol: backendUser.rol,
  };
  localStorage.setItem("user", JSON.stringify(normalizedUser));
  return normalizedUser;
}

const AUTH_API_BASE = "https://form.gererlenergie.com";
const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
let authRedirectInProgress = false;

window.addEventListener("DOMContentLoaded", async () => {
  const user = await asegurarSesionActiva();
  if (!user) return;

  actualizarContextoFormulario();

  const userInfoEl = document.getElementById("userInfo");
  if (userInfoEl) userInfoEl.textContent = `👤 ${user.nombre}`;

  const sidebarMisInformes = document.getElementById("sidebarMisInformes");
  if (user.rol === "admin" && sidebarMisInformes) {
    sidebarMisInformes.classList.remove("hidden");
    sidebarMisInformes.classList.add("flex");
  }

  cargarDatosFormulario();
  activarAutoguardado();
  initTecnicoSelect();

  setInterval(async () => {
    const backendUser = await validarSesionBackend();
    if (!backendUser) {
      redirigirALoginPorSesionExpirada();
    }
  }, SESSION_CHECK_INTERVAL_MS);
});

function initTecnicoSelect() {
  const selectTecnico = document.getElementById("selectTecnico");
  const dniInput = document.getElementById("dniTecnico");
  selectTecnico.addEventListener("change", () => {
    const selectedOption = selectTecnico.options[selectTecnico.selectedIndex];
    const dni = selectedOption.dataset.dni || "";
    dniInput.value = dni;
  });
}

function guardarDatosFormulario() {
  const form = document.getElementById("mopForm");
  const formData = new FormData(form);
  const data = {};
  for (let [key, value] of formData.entries()) {
    if (!key.startsWith("firma")) {
      data[key] = value;
    }
  }
  localStorage.setItem("mopFormDraftMant", JSON.stringify(data));
}

function cargarDatosFormulario() {
  const savedData = localStorage.getItem("mopFormDraftMant");
  if (!savedData) return;
  try {
    const data = JSON.parse(savedData);
    for (let [key, value] of Object.entries(data)) {
      if (key === "fecha_mop_m") continue;
      const field = document.querySelector(`[name="${key}"]`);
      if (field && value) {
        if (field.type === "checkbox") {
          field.checked = value === "on";
        } else {
          field.value = value;
        }
      }
    }
    const selectTecnico = document.getElementById("selectTecnico");
    if (selectTecnico && selectTecnico.value) {
      selectTecnico.dispatchEvent(new Event("change"));
    }
  } catch (error) {
    console.error("Error cargando borrador:", error);
  }
}

function activarAutoguardado() {
  const form = document.getElementById("mopForm");
  let saveTimer;
  form.addEventListener("input", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      guardarDatosFormulario();
    }, 1000);
  });
  form.addEventListener("change", () => {
    guardarDatosFormulario();
  });
}

document.getElementById("sidebarLogoutBtn").addEventListener("click", () => {
  if (confirm("¿Seguro que deseas cerrar sesión?")) {
    localStorage.removeItem("user");
    window.location.href = "login.html";
  }
});

// Sistema de Drag & Drop para fotos
let activeDropZoneContext = null;
const dropZoneContexts = [];

function initDropZones() {
  const fileInputs = document.querySelectorAll(
    'input[type="file"][accept*="image"]',
  );
  const isMobile =
    /Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  fileInputs.forEach((input) => {
    if (input.closest(".drop-zone")) return;

    const dropZone = document.createElement("div");
    dropZone.className = "drop-zone";

    const placeholder = document.createElement("div");
    placeholder.className = "drop-zone-placeholder";

    if (isMobile) {
      placeholder.innerHTML = `
              <span class="material-symbols-outlined drop-zone-icon">add_photo_alternate</span>
              <p class="drop-zone-text"><strong>Seleccionar imagen</strong></p>
              <div class="drop-zone-mobile-buttons">
                <button type="button" class="drop-zone-btn drop-zone-btn-camera" title="Tomar foto">
                  <span class="material-symbols-outlined" style="font-size:1.25rem;">photo_camera</span> Cámara
                </button>
                <button type="button" class="drop-zone-btn drop-zone-btn-gallery" title="Seleccionar de archivos">
                  <span class="material-symbols-outlined" style="font-size:1.25rem;">photo_library</span> Archivos
                </button>
              </div>
            `;
      input.style.display = "none";
    } else {
      placeholder.innerHTML = `
              <span class="material-symbols-outlined drop-zone-icon">cloud_upload</span>
              <p class="drop-zone-text"><strong>Arrastra una imagen aquí</strong><br>haz clic para seleccionar o pega con Ctrl + V</p>
            `;
    }

    const preview = document.createElement("img");
    preview.className = "drop-zone-preview";
    preview.alt = "Preview";

    const filename = document.createElement("span");
    filename.className = "drop-zone-filename";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "drop-zone-remove";
    removeBtn.innerHTML = "×";
    removeBtn.title = "Quitar imagen";

    input.parentNode.insertBefore(dropZone, input);

    dropZone.appendChild(placeholder);
    dropZone.appendChild(preview);
    dropZone.appendChild(filename);
    dropZone.appendChild(removeBtn);
    dropZone.appendChild(input);

    const context = { dropZone, input, preview, filename };
    dropZoneContexts.push(context);

    const setAsActiveDropZone = () => {
      activeDropZoneContext = context;
    };

    dropZone.addEventListener("click", setAsActiveDropZone);
    dropZone.addEventListener("focusin", setAsActiveDropZone);
    input.addEventListener("click", setAsActiveDropZone);
    input.addEventListener("focus", setAsActiveDropZone);

    dropZone.addEventListener("dragenter", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove("dragover");
      }
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("dragover");

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("image/")) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          showPreview(dropZone, file, preview, filename);
        } else {
          alert("Por favor, arrastra solo archivos de imagen.");
        }
      }
    });

    input.addEventListener("change", () => {
      if (input.files.length > 0) {
        showPreview(dropZone, input.files[0], preview, filename);
      } else {
        clearPreview(dropZone, preview, filename);
      }
    });

    removeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.value = "";
      clearPreview(dropZone, preview, filename);
    });

    if (isMobile) {
      const cameraBtn = dropZone.querySelector(".drop-zone-btn-camera");
      const galleryBtn = dropZone.querySelector(".drop-zone-btn-gallery");

      const stopProp = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };

      cameraBtn.addEventListener("click", (e) => {
        stopProp(e);
        input.removeAttribute("capture");
        input.setAttribute("capture", "environment");
        input.click();
      });

      galleryBtn.addEventListener("click", (e) => {
        stopProp(e);
        input.removeAttribute("capture");
        input.click();
      });
    }
  });

  if (!activeDropZoneContext && dropZoneContexts.length > 0) {
    activeDropZoneContext = dropZoneContexts[0];
  }
}

function getFirstEmptyDropZoneContext() {
  return (
    dropZoneContexts.find(
      (ctx) => !ctx.input.files || ctx.input.files.length === 0,
    ) || null
  );
}

function getImageFromClipboard(clipboardData) {
  if (!clipboardData || !clipboardData.items) return null;
  const imageItem = Array.from(clipboardData.items).find((item) => {
    return item.kind === "file" && item.type.startsWith("image/");
  });
  return imageItem ? imageItem.getAsFile() : null;
}

function assignFileToInput(input, file) {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
}

function handlePasteImage(e) {
  const imageFile = getImageFromClipboard(e.clipboardData);
  if (!imageFile) return;
  const targetContext = activeDropZoneContext || getFirstEmptyDropZoneContext();
  if (!targetContext) return;
  e.preventDefault();
  assignFileToInput(targetContext.input, imageFile);
  showPreview(
    targetContext.dropZone,
    imageFile,
    targetContext.preview,
    targetContext.filename,
  );
}

function showPreview(dropZone, file, previewEl, filenameEl) {
  const reader = new FileReader();
  reader.onload = (e) => {
    previewEl.src = e.target.result;
    dropZone.classList.add("has-file");
  };
  reader.readAsDataURL(file);
  filenameEl.textContent = file.name;
}

function clearPreview(dropZone, previewEl, filenameEl) {
  previewEl.src = "";
  filenameEl.textContent = "";
  dropZone.classList.remove("has-file");
}

document.addEventListener("DOMContentLoaded", () => {
  initDropZones();
  document.addEventListener("paste", handlePasteImage);
});

// Submit
document.getElementById("mopForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  let btn, originalText;

  try {
    btn = document.getElementById("submitBtn");
    originalText = btn.innerHTML;

    const form = document.getElementById('mopForm');
    const formElements = form.querySelectorAll('input[type="checkbox"]');
    const pasoCheckboxes = [];
    for (let i = 0; i < formElements.length; i++) {
      const el = formElements[i];
      if (el.name && el.name.startsWith('paso')) {
        pasoCheckboxes.push(el);
      }
    }
    if (pasoCheckboxes.length > 0) {
      const uncheckedPasos = pasoCheckboxes.filter(cb => !cb.checked);
      if (uncheckedPasos.length > 0) {
        alert('Debes marcar todos los pasos del procedimiento (faltan ' + uncheckedPasos.length + ' de ' + pasoCheckboxes.length + ')');
        return;
      }
    }

    const requiredFields = e.target.querySelectorAll('[required]');
    const emptyRequired = Array.from(requiredFields).filter(f => !f.value || (f.type === 'checkbox' && !f.checked));
    if (emptyRequired.length > 0) {
      const el = emptyRequired[0];
      el.style.boxShadow = '0 0 0 3px red';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
      const rm = () => { el.style.boxShadow = ''; };
      el.addEventListener('focus', rm, { once: true });
      el.addEventListener('input', rm, { once: true });
      el.addEventListener('change', rm, { once: true });
      setTimeout(rm, 4000);
      return;
    }

    btn.disabled = true;
    btn.innerHTML =
      '<span class="material-symbols-outlined animate-spin">progress_activity</span> Generando...';

    const formData = new FormData(e.target);
    const origen = new URLSearchParams(window.location.search).get('origen') || '';
    formData.append('origen', origen);
    const response = await fetch(
      "https://form.gererlenergie.com/api/informes/crearMantenimiento",
      {
        method: "POST",
        body: formData,
        credentials: "include",
      },
    );

    if (response.status === 401 || response.status === 403) {
      redirigirALoginPorSesionExpirada();
      return;
    }

    let data;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = {
        error: `El servidor respondió con ${response.status} (${response.statusText})`,
      };
    }

    if (response.ok) {
      const downloadLink = document.createElement("a");
      downloadLink.href = `https://form.gererlenergie.com/api/mops-mantenimiento/descargar/${data.informeId}`;
      const prefijo = 'MOP_Mantenimiento_Preventivo';
      const titulo = document.querySelector('[name="titulo_mop_m"]')?.value || 'Sin_titulo';
      const sanitized = titulo.replace(/\s+/g, '_').replace(/[^\w\-_áéíóúñüÁÉÍÓÚÑÜ]/g, '');
      downloadLink.download = `${sanitized}_${fechaISO}_${prefijo}.docx`;
      downloadLink.click();

      alert(
        "✅ MOP Mantenimiento Preventivo generado y descargado exitosamente",
      );
      localStorage.removeItem("mopFormDraftMant");
      btn.innerHTML =
        '<span class="material-symbols-outlined">check_circle</span> ¡Completado!';
      setTimeout(() => {
        window.location.href = "formulario_mop_mantenimiento_preventivo.html";
      }, 1500);
    } else {
      alert(
        "❌ Error " +
          response.status +
          ": " +
          (data.message || data.error || "Error desconocido"),
      );
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Error de conexión al servidor: " + error.message);
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});
