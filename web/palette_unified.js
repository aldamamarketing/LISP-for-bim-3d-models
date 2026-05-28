// LISPCENTRAL - PALETTE CONTROLLER (palette_unified.js)
let modulesData = []; // Caché de módulos cargados
let favorites = JSON.parse(localStorage.getItem('lisp_central_favorites') || '[]');
let searchTags = [];

const GROUP_ICONS = {
  "Estruturas (Pro)": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="1"/><line x1="2" y1="6" x2="14" y2="6"/><line x1="2" y1="10" x2="14" y2="10"/><line x1="6" y1="2" x2="6" y2="14"/><line x1="10" y1="2" x2="10" y2="14"/></svg>`,
  "BIM / Coordenação": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 4.5L8 1.5L2 4.5L8 7.5L14 4.5Z"/><path d="M2 11.5L8 14.5L14 11.5"/><path d="M2 8L8 11L14 8"/></svg>`,
  "BIM / Anotação": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 4.5L8 1.5L2 4.5L8 7.5L14 4.5Z"/><path d="M2 11.5L8 14.5L14 11.5"/><path d="M2 8L8 11L14 8"/></svg>`,
  "BIM / Propriedades": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 4.5L8 1.5L2 4.5L8 7.5L14 4.5Z"/><path d="M2 11.5L8 14.5L14 11.5"/><path d="M2 8L8 11L14 8"/></svg>`,
  "Quantidades": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="13" x2="3" y2="3"/><line x1="3" y1="13" x2="13" y2="13"/><rect x="5" y="7" width="2" height="6" fill="currentColor"/><rect x="9" y="4" width="2" height="9" fill="currentColor"/></svg>`,
  "Fabricação (Pro)": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/></svg>`,
  "Arquitetura": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 14V7l6-4 6 4v7H2z"/><path d="M6 14V10h4v4h-4z"/></svg>`,
  "Arquitetura 2D": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 14V7l6-4 6 4v7H2z"/><path d="M6 14V10h4v4h-4z"/></svg>`,
  "Topografia": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 2v12M2 8h12"/></svg>`,
  "Sistema / Core": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 13l-3-3 3-3M11 13l3-3-3-3M8 4l-2 8"/></svg>`,
  "Comando Geral": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 13l-3-3 3-3M11 13l3-3-3-3M8 4l-2 8"/></svg>`,
  "Outros": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="7"/><path d="M8 4v4l2.5 1.5"/></svg>`
};


// Obtener parámetros de la URL
const urlParams = new URLSearchParams(window.location.search);
const apiKey = urlParams.get('key') || 'lc_key_S5ggQl1Gk4f3';
const hwId = urlParams.get('hwid') || 'unknown';

// Endpoints del Servidor
const BASE_ENDPOINT = "https://getroutine-wgpjjgorxa-uc.a.run.app/getRoutine";

// (Metadatos antiguos eliminados. Ahora todo viene de Firestore)
const GROUP_ORDER = [
  "Arquitetura 2D",
  "Estruturas (Pro)",
  "BIM / Coordenação",
  "BIM / Anotação",
  "BIM / Propriedades",
  "Quantidades",
  "Fabricação (Pro)",
  "Arquitetura",
  "Topografia",
  "Sistema / Core",
  "Comando Geral",
  "Custom Tools",
  "Outros"
];

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  initPalette();
  
  // Escuchar el evento global de Cambio de Documento (Event Hub IPC)
  window.addEventListener("lc_context_changed", () => {
    console.log("[LispCentral] Cambio de documento detectado. Refrescando contexto...");
    // Aquí podemos añadir lógica para vaciar la selección o refrescar el estado
    // de las propiedades para no mezclar datos del Dibujo A con el Dibujo B.
  });
  
  // Buscador Spotlight con Chips estilo Google Ads
  const searchInput = document.getElementById("searchInput");
  
  searchInput.addEventListener("input", () => {
    filterModules();
  });
  
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === ",") {
      e.preventDefault();
      const val = searchInput.value.trim().replace(/,/g, "");
      if (val !== "") {
        if (!searchTags.includes(val.toLowerCase())) {
          searchTags.push(val.toLowerCase());
          renderChips();
          searchInput.value = "";
          filterModules();
        }
      }
    } else if (e.key === "Backspace" && searchInput.value === "" && searchTags.length > 0) {
      searchTags.pop();
      renderChips();
      filterModules();
    }
  });
});

function renderChips() {
  const container = document.getElementById("chipsContainer");
  if (!container) return;
  container.innerHTML = "";
  searchTags.forEach(tag => {
    const chip = document.createElement("div");
    chip.className = "search-chip";
    chip.onclick = () => removeTag(tag);
    chip.innerHTML = `
      <span>${tag}</span>
      <span class="search-chip-close">&times;</span>
    `;
    container.appendChild(chip);
  });
}

function removeTag(tag) {
  searchTags = searchTags.filter(t => t !== tag);
  renderChips();
  filterModules();
}

function togglePin(cmdName) {
  const index = favorites.indexOf(cmdName);
  if (index === -1) {
    favorites.push(cmdName);
  } else {
    favorites.splice(index, 1);
  }
  localStorage.setItem('lisp_central_favorites', JSON.stringify(favorites));
  renderFavorites();
  renderModules();
}

function renderFavorites() {
  const section = document.getElementById("favoritesSection");
  const listContainer = document.getElementById("favoritesList");
  if (!listContainer || !section) return;
  
  listContainer.innerHTML = "";
  const pinnedMods = modulesData.filter(mod => favorites.includes(mod.name));
  
  if (pinnedMods.length === 0) {
    section.style.display = "none";
    return;
  }
  
  section.style.display = "block";
  
  pinnedMods.forEach(mod => {
    const item = document.createElement("div");
    item.className = `module-item ${mod.status}`;
    item.id = `fav-${mod.name}`;
    item.title = mod.desc;
    
    const icon = mod.svgIcon ? mod.svgIcon : (GROUP_ICONS[mod.group] || "🔧");
    const docsBtnHtml = mod.doc && mod.doc !== "#" 
      ? `<a class="docs-btn" href="https://lispcentral.web.app/docs/${mod.doc}" target="_blank" onclick="event.stopPropagation();" title="Ver documentação">?</a>`
      : "";
      
    const pinBtnHtml = `<button class="pin-btn pinned" onclick="event.stopPropagation(); togglePin('${mod.name}');" title="Desafixar">📌</button>`;
    
    item.innerHTML = `
      <div class="module-info-col">
        <div class="module-name-wrapper">
          <span class="module-icon-container">${icon}</span>
          <span class="module-name">${mod.name}</span>
        </div>
        <span class="module-friendly-name">${mod.friendly}</span>
      </div>
      <div class="module-actions-col">
        ${pinBtnHtml}
        ${docsBtnHtml}
      </div>
    `;
    
    item.addEventListener("click", () => {
      runAutoCADCommand(mod.name);
    });
    listContainer.appendChild(item);
  });
}


async function initPalette() {
  try {
    writeConsoleMessage("\n[LispCentral] Inicializando Command Palette asíncrona...");
    
    // 1. Obtener Índice dinámico de comandos desde el servidor SaaS (con cache busting)
    const indexUrl = `${BASE_ENDPOINT}?apiKey=${apiKey}&hwId=${hwId}&routine=INDEX&t=${Date.now()}`;
    const response = await fetch(indexUrl, { cache: "no-store" });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const cmdList = await response.json();
    
    // Crear base de datos de módulos con metadatos estructurados
    modulesData = cmdList.map(cmd => {
      return {
        name: cmd.name,
        friendly: cmd.friendly,
        desc: cmd.desc,
        group: cmd.group,
        doc: cmd.doc || "#",
        svgIcon: cmd.svgIcon || "",
        status: "pending" // pending, loading, success, error
      };
    });
    
    renderModules();
    renderFavorites();
    
    // 2. Comandos Fantasmas ja foram injetados nativamente.
    // O download agora é feito sob demanda (JIT) via LC:run-or-load.
    // syncModulesSequentially();
    
    // Atualiza a interface visualmente para "Pronto" instantaneamente
    document.getElementById("progressVal").innerText = "JIT PRONTO";
    document.getElementById("progressBar").style.width = "100%";
    setTimeout(() => {
      const statusPanel = document.querySelector(".status-panel");
      if (statusPanel) statusPanel.classList.add("hidden");
    }, 1500);
  } catch (err) {
    console.error("Erro ao inicializar paleta:", err);
    writeConsoleMessage(`\n[❌] LispCentral: Erro de conexao: ${err.message}`);
    document.getElementById("progressVal").innerText = "ERRO";
    document.getElementById("progressVal").style.color = "var(--error-color)";
  }
}

// Renderizado jerárquico agrupado en HTML
function renderModules() {
  const container = document.getElementById("modulesList");
  container.innerHTML = "";
  
  // Agrupar módulos
  const groups = {};
  modulesData.forEach(mod => {
    if (!groups[mod.group]) {
      groups[mod.group] = [];
    }
    groups[mod.group].push(mod);
  });
  
  // Ordenar grupos según GROUP_ORDER
  const sortedGroupNames = Object.keys(groups).sort((a, b) => {
    let indexA = GROUP_ORDER.indexOf(a);
    let indexB = GROUP_ORDER.indexOf(b);
    if (indexA === -1) indexA = 99;
    if (indexB === -1) indexB = 99;
    return indexA - indexB;
  });
  
  sortedGroupNames.forEach(groupName => {
    const list = groups[groupName];
    const groupId = groupName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    
    // Crear cabecera de grupo
    const header = document.createElement("div");
    header.className = "group-header";
    header.id = `group-header-${groupId}`;
    header.innerHTML = `
      <span>${groupName}</span>
      <span class="group-count" id="group-count-${groupId}">${list.length}</span>
    `;
    container.appendChild(header);
    
    // Contenedor de comandos del grupo
    const groupContainer = document.createElement("div");
    groupContainer.className = "group-container";
    groupContainer.id = `group-container-${groupId}`;
    
    list.forEach(mod => {
      const item = document.createElement("div");
      item.className = `module-item ${mod.status}`;
      item.id = `mod-${mod.name}`;
      item.title = mod.desc;
      
      const isPinned = favorites.includes(mod.name);
      const icon = mod.svgIcon ? mod.svgIcon : (GROUP_ICONS[mod.group] || "🔧");
      const docsBtnHtml = mod.doc && mod.doc !== "#" 
        ? `<a class="docs-btn" href="https://lispcentral.web.app/docs/${mod.doc}" target="_blank" onclick="event.stopPropagation();" title="Ver documentação">?</a>`
        : "";
        
      const pinBtnHtml = `<button class="pin-btn ${isPinned ? 'pinned' : ''}" onclick="event.stopPropagation(); togglePin('${mod.name}');" title="${isPinned ? 'Desafixar' : 'Fixar no topo'}">📌</button>`;
      
      item.innerHTML = `
        <div class="module-info-col">
          <div class="module-name-wrapper">
            <span class="module-icon-container">${icon}</span>
            <span class="module-name">${mod.name}</span>
          </div>
          <span class="module-friendly-name">${mod.friendly}</span>
        </div>
        <div class="module-actions-col">
          ${pinBtnHtml}
          ${docsBtnHtml}
        </div>
      `;
      
      // Al hacer clic, se ejecuta c:run-or-load que asegura la carga en RAM y ejecuta
      item.addEventListener("click", () => {
        runAutoCADCommand(mod.name);
      });
      
      groupContainer.appendChild(item);
    });
    
    container.appendChild(groupContainer);
  });
}

// Filtrado de comandos Spotlight
function filterModules() {
  const searchInput = document.getElementById("searchInput");
  const currentInputText = searchInput ? searchInput.value.toLowerCase().trim() : "";
  
  // Consolidar palabras clave: chips activos + palabras en el input
  const inputKeywords = currentInputText.split(/\s+/).filter(k => k !== "");
  const activeKeywords = [...searchTags, ...inputKeywords];
  
  // Agrupamos módulos para verificar visibilidad por grupos
  const groups = {};
  modulesData.forEach(mod => {
    if (!groups[mod.group]) {
      groups[mod.group] = [];
    }
    groups[mod.group].push(mod);
  });
  
  Object.keys(groups).forEach(groupName => {
    const list = groups[groupName];
    const groupId = groupName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const header = document.getElementById(`group-header-${groupId}`);
    const container = document.getElementById(`group-container-${groupId}`);
    
    let visibleCount = 0;
    
    list.forEach(mod => {
      const item = document.getElementById(`mod-${mod.name}`);
      if (!item) return;
      
      // Comprobar que coincida con TODAS las palabras clave (AND)
      let matchesAll = true;
      
      for (const kw of activeKeywords) {
        const nameMatch = mod.name.toLowerCase().includes(kw);
        const friendlyMatch = mod.friendly.toLowerCase().includes(kw);
        const descMatch = mod.desc.toLowerCase().includes(kw);
        const groupMatch = mod.group.toLowerCase().includes(kw);
        
        if (!(nameMatch || friendlyMatch || descMatch || groupMatch)) {
          matchesAll = false;
          break;
        }
      }
      
      if (matchesAll) {
        item.style.display = "flex";
        visibleCount++;
      } else {
        item.style.display = "none";
      }
    });
    
    // Ocultar cabeceras vacías
    if (visibleCount === 0) {
      if (header) header.style.display = "none";
      if (container) container.style.display = "none";
    } else {
      if (header) {
        header.style.display = "flex";
        const countBadge = document.getElementById(`group-count-${groupId}`);
        if (countBadge) countBadge.innerText = visibleCount;
      }
      if (container) container.style.display = "grid";
    }
  });
}


// Inter-Process Communication (IPC): Carga una rutina en AutoCAD mediante LISP y sondea USERS1
function loadRoutineViaLisp(name) {
  return new Promise((resolve, reject) => {
    if (typeof Acad === 'undefined' || !Acad.Editor || !Acad.Editor.getSystemVariable) {
      // Simulación de carga asíncrona fuera de AutoCAD (entorno web)
      setTimeout(resolve, 150);
      return;
    }
    
    // 1. Limpiar la variable USERS1
    Acad.Editor.setSystemVariable("USERS1", "").then(() => {
      // 2. Invocar la función nativa LISP de descarga y evaluación en RAM
      Acad.Editor.executeCommand(`(LC:load-remote-routine "${name}")`);
      
      // 3. Sondeo (Polling) periódico cada 100ms de USERS1
      let attempts = 0;
      const maxAttempts = 100; // Timeout de 10 segundos
      const interval = setInterval(() => {
        attempts++;
        
        Acad.Editor.getSystemVariable("USERS1").then((val) => {
          if (val === `${name}:success`) {
            clearInterval(interval);
            resolve();
          } else if (val === `${name}:error`) {
            clearInterval(interval);
            reject(new Error(`Falha no LISP ao carregar ${name}`));
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error(`Timeout ao carregar ${name}`));
          }
        }).catch((err) => {
          // Ignorar errores de acceso temporal y continuar
        });
      }, 100);
      
    }).catch(err => {
      reject(err);
    });
  });
}

// Descarga secuencial para evitar carreras de datos en USERS1
async function syncModulesSequentially() {
  const total = modulesData.length;
  let loaded = 0;
  
  for (const mod of modulesData) {
    try {
      updateModuleStatus(mod.name, "loading");
      
      // Carga secuencial segura por IPC
      await loadRoutineViaLisp(mod.name);
      
      updateModuleStatus(mod.name, "success");
      loaded++;
      updateProgressBar(loaded, total);
    } catch (err) {
      console.error(`Erro ao sincronizar ${mod.name}:`, err);
      updateModuleStatus(mod.name, "error");
      loaded++;
      updateProgressBar(loaded, total);
    }
  }
  
  writeConsoleMessage(`\n[✔] LispCentral Command Palette: ${loaded} de ${total} módulos sincronizados na RAM.`);
}

function updateModuleStatus(name, status) {
  const mod = modulesData.find(m => m.name === name);
  if (mod) {
    mod.status = status;
    const elements = [
      document.getElementById(`mod-${name}`),
      document.getElementById(`fav-${name}`)
    ];
    elements.forEach(item => {
      if (item) {
        item.className = `module-item ${status}`;
      }
    });
  }
}

function updateProgressBar(loaded, total) {
  const percentage = Math.round((loaded / total) * 100);
  document.getElementById("progressVal").innerText = `${percentage}%`;
  document.getElementById("progressBar").style.width = `${percentage}%`;
  
  if (percentage === 100) {
    document.getElementById("progressVal").innerText = "PRONTO";
    document.getElementById("progressVal").style.color = "var(--success-color)";
    
    // Ocultar barra de progreso tras 1.5 segundos con animación CSS
    setTimeout(() => {
      const statusPanel = document.querySelector(".status-panel");
      if (statusPanel) {
        statusPanel.classList.add("hidden");
      }
    }, 1500);
  }
}

function runAutoCADCommand(cmdName) {
  const lispCmd = `(LC:run-or-load "${cmdName}")`;
  
  if (typeof Acad === 'undefined' || !Acad.Editor) {
    console.log(`[AutoCAD Command Sim] Executando: ${lispCmd}`);
    return;
  }

  const handleError = (err) => {
    // Código 2 de AutoCAD JS API suele significar "No Document" o estado inválido
    if (err === 2 || err === "2") {
      alert("⚠️ No hay ningún dibujo activo.\nPor favor, abre o crea un dibujo nuevo antes de ejecutar comandos.");
    } else {
      console.warn("[TMD Palette] Error ejecutando comando LISP:", err);
    }
  };

  // RUTA LISP: usar evaluateLisp (API nativa para expresiones AutoLISP)
  if (typeof Acad.Editor.evaluateLisp === 'function') {
    const res = Acad.Editor.evaluateLisp(lispCmd);
    if (res && res.then) {
      res.then(() => {}, handleError);
    }
  } else if (typeof Acad.Editor.executeCommand === 'function') {
    // Fallback: envolver en LISP command-line invocation
    const res = Acad.Editor.executeCommand(lispCmd + "\n");
    if (res && res.then) {
      res.then(() => {}, handleError);
    }
  } else {
    console.error("[TMD Palette] No hay método disponible para ejecutar LISP");
  }
}

function writeConsoleMessage(msg) {
  console.log(msg);
  if (typeof Acad !== 'undefined' && Acad.Editor) {
    // Acad.Editor.writeMessage DOES NOT EXIST in JS API.
    // To print to AutoCAD console, we execute a LISP princ.
    // Escaping newlines and quotes to prevent LISP syntax errors.
    const safeMsg = msg.replace(/\n/g, "\\n").replace(/"/g, '\\"');
    if (typeof Acad.Editor.evaluateLisp === 'function') {
      Acad.Editor.evaluateLisp(`(princ "${safeMsg}")(princ)`);
    } else if (typeof Acad.Editor.executeCommand === 'function') {
      Acad.Editor.executeCommand(`(princ "${safeMsg}")(princ)\n`);
    }
  }
}
