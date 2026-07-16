// Fecha actual
const fecha = new Date();
const fechaISO = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;

// Asignación de la fecha al campo de fecha del formulario
document.getElementById("fecha_elaboracion").value = fechaISO;


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

// Close sidebar when a sidebar link is clicked (mobile behavior)
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
    "formulario_completo_responsive.html?origen=fallo&tipo=informe": {
      title: "Informe de Fallo",
      subtitle: "UPS/ATM",
    },
    "formulario_completo_responsive.html?origen=cambio-bateria&tipo=informe": {
      title: "Informe de Cambio de Batería",
      subtitle: "UPS/ATM",
    },
    "formulario_completo_responsive.html?origen=instalacion&tipo=informe": {
      title: "Informe de Instalación",
      subtitle: "UPS/ATM",
    },
    "formulario_completo_responsive.html?origen=programacion-mantenimiento&tipo=informe":
      {
        title: "Informe de Mantenimiento",
        subtitle: "UPS/ATM",
      },
    "formulario_completo_responsive.html?origen=programacion-correctiva&tipo=informe":
      {
        title: "Informe de Programación Correctiva",
        subtitle: "UPS/ATM",
      },
    "formulario_completo_responsive.html": {
      title: "Informe Técnico",
      subtitle: "UPS/ATM",
    },
  };

  const selection =
    selectionMap[selectionKey] ||
    selectionMap["formulario_completo_responsive.html"];

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

      const outerContainer = parentWrapper ? parentWrapper.parentElement : null;
      currentSubmenu =
        outerContainer && outerContainer.classList.contains("sidebar-submenu")
          ? outerContainer
          : null;
    }
  }

  if (window.innerWidth < 1024) {
    // On small screens we want the sidebar hidden after updating selection
    closeSidebar();
  }
}

function registrarSeleccionFormulario(link) {
  if (!link) return;

  const linkUrl = new URL(link.getAttribute("href"), window.location.href);
  const storedKey = `${linkUrl.pathname.split("/").pop()}${linkUrl.search}`;
  localStorage.setItem("formSelectionKey", storedKey);
}

function toggleSidebarItemMenu(button) {
  const itemName = button.getAttribute("data-item-menu");
  const submenu = document.querySelector(`[data-item-submenu="${itemName}"]`);
  const chevron = button.querySelector(".sidebar-chevron");

  submenu.classList.toggle("open");
  chevron.classList.toggle("open");
}

const AUTH_API_BASE = "https://form.gererlenergie.com";
const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
let authRedirectInProgress = false;

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

document.querySelectorAll("#sidebar a[href]").forEach((link) => {
  link.addEventListener("click", () => registrarSeleccionFormulario(link));
});

// Verificar autenticación al cargar
window.addEventListener("DOMContentLoaded", async () => {
  const user = await asegurarSesionActiva();
  if (!user) return;

  actualizarContextoFormulario();

  // Mostrar info del usuario (si existe el elemento)
  const userInfoEl = document.getElementById("userInfo");
  if (userInfoEl) userInfoEl.textContent = `👤 ${user.nombre}`;

  // Ajustar texto del boton segun rol
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) {
    submitBtn.innerHTML = `<span class="material-symbols-outlined">upload_file</span>${
      user.rol === "admin" ? " Generar y Descargar Informe" : " Guardar informe"
    }`;
  }

  // Mostrar enlace "Mis informes" SOLO si el usuario ES admin
  const sidebarMisInformes = document.getElementById("sidebarMisInformes");
  if (user.rol === "admin" && sidebarMisInformes) {
    sidebarMisInformes.classList.remove("hidden");
    sidebarMisInformes.classList.add("flex");
  }

  const currentSearch = new URL(window.location.href).searchParams.toString();
  if (!currentSearch && !localStorage.getItem("formSelectionKey")) {
    localStorage.removeItem("formSelectionKey");
  }

  // Configurar campos según rol (fecha_revisado y fecha_aprobado)
  configurarCamposPorRol(user.rol);

  // Inicializar sistema de antecedentes con plantillas
  initAntecedentesTemplates();

  // Inicializar selector de actividad
  initActividadSelect();

  // Cargar datos guardados del formulario
  cargarDatosFormulario();

  // Activar autoguardado
  activarAutoguardado();

  // Verificar sesión periódicamente para evitar trabajar con sesión vencida.
  setInterval(async () => {
    const backendUser = await validarSesionBackend();
    if (!backendUser) {
      redirigirALoginPorSesionExpirada();
    }
  }, SESSION_CHECK_INTERVAL_MS);
});

// Configurar campos según rol del usuario
function configurarCamposPorRol(rol) {
  const campoFechaRevisado = document.getElementById("campoFechaRevisado");
  const campoFechaAprobado = document.getElementById("campoFechaAprobado");
  const inputFechaRevisado = document.getElementById("inputFechaRevisado");
  const inputFechaAprobado = document.getElementById("inputFechaAprobado");

  if (rol === "admin") {
    // Admin: mostrar campos y hacerlos requeridos
    campoFechaRevisado.style.display = "flex";
    campoFechaAprobado.style.display = "flex";
    inputFechaRevisado.required = true;
    inputFechaAprobado.required = true;
  } else {
    // Técnico: ocultar campos y establecer valor vacío
    campoFechaRevisado.style.display = "none";
    campoFechaAprobado.style.display = "none";
    inputFechaRevisado.required = false;
    inputFechaAprobado.required = false;
    inputFechaRevisado.value = "";
    inputFechaAprobado.value = "";
  }
}

// Sistema de plantillas para antecedentes (siempre tipo Ticket)
function initAntecedentesTemplates() {
  const atmIdInput = document.getElementById("atmId");
  const localInput = document.getElementById("localNombre");
  const ticketNumeroInput = document.getElementById("ticketNumero");
  const ticketMotivoInput = document.getElementById("ticketMotivo");
  const ticketDescripcionInput = document.getElementById("ticketDescripcion");
  const vistaPrevia = document.getElementById("vistaPrevia");
  const hiddenTextarea = document.getElementById(
    "descripcionAntecedenteHidden",
  );

  // Actualizar vista previa en tiempo real cuando el usuario escribe en cualquier campo
  [
    atmIdInput,
    localInput,
    ticketNumeroInput,
    ticketMotivoInput,
    ticketDescripcionInput,
  ].forEach((input) => {
    input.addEventListener("input", generarTextoAntecedente);
  });

  function generarTextoAntecedente() {
    const atmId = atmIdInput.value.trim();
    const local = localInput.value.trim();
    const ticketNumero = ticketNumeroInput.value.trim();
    const ticketMotivo = ticketMotivoInput.value.trim();
    const ticketDescripcion = ticketDescripcionInput.value.trim();

    // Generar texto: De acuerdo a ticket: Incidente id: [TICKET] - ATM ID = [ID] [LOCAL] - UPS - [MOTIVO], [DESCRIPCION].
    const texto = `De acuerdo a ticket: ${ticketNumero || "[TICKET]"} - ATM ID = ${atmId || "[ID]"} ${local || "[LOCAL]"} - UPS - ${ticketMotivo || "[MOTIVO]"}, ${ticketDescripcion || "[DESCRIPCION]"}.`;

    // Mostrar en vista previa
    vistaPrevia.textContent = texto;

    // Guardar en textarea oculto para enviar al backend
    hiddenTextarea.value = texto;
  }

  // Generar vista previa inicial
  generarTextoAntecedente();
}

// Función para obtener la actividad según el origen real de navegación
function obtenerActividadPorOrigen() {
  const currentUrl = new URL(window.location.href);
  const storedSelectionKey = localStorage.getItem("formSelectionKey");
  let origen = currentUrl.searchParams.get("origen");

  if (!origen && storedSelectionKey) {
    try {
      origen = new URL(
        storedSelectionKey,
        window.location.href,
      ).searchParams.get("origen");
    } catch (_) {
      origen = null;
    }
  }

  const mapeoActividades = {
    fallo: "Fallo ATM",
    "cambio-bateria": "Cambio de batería",
    instalacion: "Por programación",
    "programacion-mantenimiento": "Por programación",
    "programacion-correctiva": "Por programación",
  };

  return mapeoActividades[origen] || null;
}

// Sistema de selector de actividad (bloqueado por origen)
function initActividadSelect() {
  const selectActividad = document.getElementById("selectActividad");
  if (!selectActividad) return;

  const actividadBloqueada = obtenerActividadPorOrigen();

  if (actividadBloqueada) {
    // Bloquear el select y asignar el valor
    selectActividad.value = actividadBloqueada;
    selectActividad.disabled = true;
    selectActividad.classList.add("bg-slate-100", "cursor-not-allowed");

    // Crear input hidden para enviar el valor al backend
    let inputHidden = document.getElementById("actividadOrigen");
    if (!inputHidden) {
      inputHidden = document.createElement("input");
      inputHidden.type = "hidden";
      inputHidden.id = "actividadOrigen";
      inputHidden.name = "nombre_actividad";
      inputHidden.value = actividadBloqueada;
      selectActividad.parentElement.appendChild(inputHidden);
    }
  } else {
    selectActividad.disabled = false;
    selectActividad.classList.remove("bg-slate-100", "cursor-not-allowed");

    const inputHidden = document.getElementById("actividadOrigen");
    if (inputHidden) {
      inputHidden.remove();
    }
  }
}

// Autoguardado: guardar datos del formulario en localStorage
function guardarDatosFormulario() {
  const form = document.getElementById("informeForm");
  const formData = new FormData(form);
  const data = {};

  // Guardar todos los campos de texto
  for (let [key, value] of formData.entries()) {
    // No guardar archivos (solo texto)
    if (typeof value === "string") {
      data[key] = value;
    }
  }

  localStorage.setItem("formDraft", JSON.stringify(data));
}

// Cargar datos del formulario desde localStorage
function cargarDatosFormulario() {
  const savedData = localStorage.getItem("formDraft");
  if (!savedData) return;

  try {
    const data = JSON.parse(savedData);
    const form = document.getElementById("informeForm");

    // Restaurar valores de campos de texto
    Object.keys(data).forEach((fieldName) => {
      if (fieldName === "fecha_elaboracion") return;
      const field = form.elements[fieldName];
      if (field && data[fieldName]) {
        // Manejar diferentes tipos de campo
        if (field.type === "checkbox" || field.type === "radio") {
          field.checked = data[fieldName] === "on" || data[fieldName] === true;
        } else if (fieldName !== "nombre_actividad") {
          // No restaurar nombre_actividad si está bloqueada por origen
          field.value = data[fieldName];
        }
      }
    });
  } catch (error) {
    console.error("Error cargando borrador:", error);
  }
}

// Activar autoguardado en tiempo real
function activarAutoguardado() {
  const form = document.getElementById("informeForm");
  let saveTimer;

  // Escuchar cambios en inputs y textareas
  form.addEventListener("input", (e) => {
    // Evitar guardar demasiado rápido (debounce)
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      guardarDatosFormulario();
    }, 1000); // Guardar 1 segundo después de que deje de escribir
  });

  // También guardar cuando cambian los selects
  form.addEventListener("change", () => {
    guardarDatosFormulario();
  });
}

// Limpiar borrador del formulario
function limpiarBorrador() {
  localStorage.removeItem("formDraft");
}

// Manejar logout desde sidebar
document.getElementById("sidebarLogoutBtn").addEventListener("click", () => {
  if (confirm("¿Seguro que deseas cerrar sesión?")) {
    localStorage.removeItem("user");
    window.location.href = "login.html";
  }
});

// ═══════════════════════════════════════════════════════════════
// Sistema de Drag & Drop para fotos
// ═══════════════════════════════════════════════════════════════
let activeDropZoneContext = null;
const dropZoneContexts = [];

function initDropZones() {
  // Seleccionar todos los inputs de tipo file que aceptan imágenes
  const fileInputs = document.querySelectorAll(
    'input[type="file"][accept*="image"]',
  );
  const isMobile =
    /Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  fileInputs.forEach((input) => {
    // Solo procesar si no ha sido convertido ya
    if (input.closest(".drop-zone")) return;

    // Crear el contenedor drop-zone
    const dropZone = document.createElement("div");
    dropZone.className = "drop-zone";

    // Crear contenido placeholder
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

    // Crear preview de imagen
    const preview = document.createElement("img");
    preview.className = "drop-zone-preview";
    preview.alt = "Preview";

    // Crear indicador de nombre de archivo
    const filename = document.createElement("span");
    filename.className = "drop-zone-filename";

    // Crear botón de remover
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "drop-zone-remove";
    removeBtn.innerHTML = "×";
    removeBtn.title = "Quitar imagen";

    // Insertar el drop-zone antes del input
    input.parentNode.insertBefore(dropZone, input);

    // Mover el input dentro del drop-zone
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

    // Eventos de drag & drop
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
      // Solo quitar la clase si realmente salimos del drop-zone
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
          // Asignar el archivo al input
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;

          // Mostrar preview
          showPreview(dropZone, file, preview, filename);
        } else {
          alert("Por favor, arrastra solo archivos de imagen.");
        }
      }
    });

    // Evento cuando se selecciona archivo manualmente
    input.addEventListener("change", () => {
      if (input.files.length > 0) {
        showPreview(dropZone, input.files[0], preview, filename);
      } else {
        clearPreview(dropZone, preview, filename);
      }
    });

    // Evento para remover imagen
    removeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.value = "";
      clearPreview(dropZone, preview, filename);
    });

    // En móvil: conectar botones de cámara y archivos al input oculto
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

  // Si no hay una zona activa, usamos la primera zona vacía.
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

// Inicializar drop zones cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  initDropZones();
  document.addEventListener("paste", handlePasteImage);
});
// ═══════════════════════════════════════════════════════════════

// Handle form submission
document.getElementById("informeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  let btn, originalText;

  try {
    btn = document.getElementById("submitBtn");
    originalText = btn.innerHTML;

    const requiredFields = e.target.querySelectorAll('[required]');
    const emptyRequired = Array.from(requiredFields).filter(f => !f.value || (f.type === 'checkbox' && !f.checked));
    const emptyImages = emptyRequired.filter(f => f.type === 'file');
    const emptyOthers = emptyRequired.filter(f => f.type !== 'file');

    if (emptyImages.length > 0) {
      const imageLabels = emptyImages.map(f => {
        const parent = f.closest('.flex-col') || f.closest('.p-4') || f.parentElement;
        const label = parent?.querySelector('label')?.textContent?.replace('*', '').trim();
        return label || f.name;
      });
      alert(`❌ Faltan las siguientes imágenes:\n• ${imageLabels.join('\n• ')}`);
      const el = emptyImages[0];
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

    if (emptyOthers.length > 0) {
      const el = emptyOthers[0];
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

    if (!confirm('¿Estás seguro de generar el informe?')) {
      return;
    }

    btn.disabled = true;
    btn.innerHTML =
      '<span class="material-symbols-outlined animate-spin">progress_activity</span> Generando...';

    const formData = new FormData(e.target);
    const user = JSON.parse(localStorage.getItem("user") || "null");

    // Conectar al backend en puerto 3000
    const apiUrl = `https://form.gererlenergie.com/api/informes/crear`;
    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (response.status === 401 || response.status === 403) {
      redirigirALoginPorSesionExpirada();
      return;
    }

    if (!response.ok) {
      let errorMessage = "No se pudo generar el informe";
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch (_) {
        // Ignorar si no hay JSON
      }
      alert(`❌ Error: ${errorMessage}`);
      return;
    }

    const contentType = response.headers.get("content-type") || "";
    if (
      contentType.includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      )
    ) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const titulo = document.querySelector('[name="nombre_actividad"]')?.value || 'Sin_titulo';
      const sanitized = titulo.replace(/\s+/g, '_').replace(/[^\w\-_áéíóúñüÁÉÍÓÚÑÜ]/g, '');
      a.download = `${sanitized}_${fechaISO}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert("✅ Informe generado y descargado");
    } else {
      await response.json();
      alert(
        "✅ Informe guardado. Un administrador puede descargarlo desde Mis informes.",
      );
    }

    // Limpiar borrador guardado
    limpiarBorrador();

    // Optionally reset form: e.target.reset();
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Error de conexión al servidor");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});
