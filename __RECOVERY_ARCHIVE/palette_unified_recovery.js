// ==========================================
// LispCentral - Unified Palette Logic
// ==========================================

// Configuración de Módulos (Simulación de DB o JSON local)
const modulesData = [
  { name: "ARQ-WALL-Draw", friendly: "Dibujar Pared", desc: "Dibuja paredes 3D paramétricas", group: "Arquitectura", status: "pending", doc: "arq-wall-draw", tags: ["arq", "pared", "muro", "3d"] },
  { name: "ARQ-DOOR-Insert", friendly: "Insertar Puerta", desc: "Inserta puertas en muros", group: "Arquitectura", status: "pending", doc: "arq-door-insert", tags: ["puerta", "abertura", "arq"] },
  { name: "ARQ-WIN-Insert", friendly: "Insertar Ventana", desc: "Inserta ventanas en muros", group: "Arquitectura", status: "pending", doc: "arq-win-insert", tags: ["ventana", "vidrio", "arq"] },
  { name: "LC_STEEL_DRAW", friendly: "Dibujar Acero", desc: "Perfiles estructurales metálicos", group: "Estructura", status: "pending", doc: "steel-draw", tags: ["acero", "metal", "perfil", "viga"] },
  { name: "Gerar_Grelha", friendly: "Generar Grilla", desc: "Crea grilla estructural", group: "Estructura", status: "pending", doc: "gerar-grelha", tags: ["ejes", "grilla", "estructura"] },
  { name: "LC_BOM_EXPORT", friendly: "Exportar BOM", desc: "Exporta lista de materiales a Excel", group: "Documentacion", status: "pending", doc: "bom-export", tags: ["bom", "excel", "cantidades", "tabla"] },
  { name: "LC_CUADRO_RUMBOS", friendly: "Cuadro Rumbos", desc: "Genera cuadro de rumbos y distancias", group: "Topografia", status: "pending", doc: "cuadro-rumbos", tags: ["topo", "rumbos", "distancias", "lote"] },
  { name: "LC_CLEAN", friendly: "Limpiar Dibujo", desc: "Purga y audita el archivo", group: "Utilidades", status: "pending", doc: "#", tags: ["limpiar", "purge", "audit", "fix"] }
];

const GROUP_ICONS = {
  "Arquitectura": "🏠",
  "Estructura": "🏗️",
  "Documentacion": "📊",
  "Topografia": "🌍",
  "Utilidades": "⚙️"
};

let favorites = JSON.parse(localStorage.getItem('lispcentral_favorites') || '[]');
let searchTags = [];

// ==========================================
// 1. EVENT HUB: Escuchar Cambios de Contexto
// ==========================================
window.addEventListener("lc_context_changed", (e) => {
    console.log("[LispCentral] Cambio de documento detectado. Refrescando contexto de la paleta...");
    // El Event Hub inyecta este evento cuando el usuario cambia de pestaña.
    // Aquí podríamos recargar los datos del dibujo activo.
});

// ==========================================
// 2. ZERO DOC FIX: Manejo de Promesas de AutoCAD
// ==========================================
function executeCommandWorker(cmd) {
    if (typeof Acad === 'undefined') {
        console.warn("Acad API no encontrada. Entorno web simulado. Comando:", cmd);
        return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        Acad.Editor.executeCommand(cmd).then(resolve).catch(err => {
            // Error 2 significa que no hay documentos abiertos (Zero Doc State)
            if (err === 2) {
                console.warn(`[LispCentral] Comando ignorado: No hay dibujo activo (${err})`);
                alert("No hay ningún dibujo abierto para ejecutar el comando.");
                resolve(); 
            } else {
                reject(err);
            }
        });
    });
}

function runAutoCADCommand(cmdName) {
    console.log(`[LispCentral] Ejecutando: ${cmdName}`);
    // Usamos el ejecutor de LISP asíncrono puente
    executeCommandWorker(`(c:run-or-load "${cmdName}")\n`).catch(e => console.error(e));
}

// ==========================================
// 3. RENDERIZADO Y RIBBON WRAPPERS
// ==========================================
function renderModules() {
  const container = document.getElementById("modulesList");
  container.innerHTML = "";
  
  const groups = {};
  modulesData.forEach(mod => {
    if (!groups[mod.group]) groups[mod.group] = [];
    groups[mod.group].push(mod);
  });
  
  const sortedGroupNames = Object.keys(groups).sort();
  
  sortedGroupNames.forEach(groupName => {
    const list = groups[groupName];
    const groupId = groupName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    
    // Wrapper dinámico para el Modo Ribbon
    const ribbonPanel = document.createElement("div");
    ribbonPanel.className = "ribbon-panel";
    ribbonPanel.id = `ribbon-panel-${groupId}`;
    
    const header = document.createElement("div");
    header.className = "group-header";
    header.id = `group-header-${groupId}`;
    header.innerHTML = `
      <span>${groupName}</span>
      <span class="group-count" id="group-count-${groupId}">${list.length}</span>
    `;
    ribbonPanel.appendChild(header);
    
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
        ? `<a class="docs-btn" href="https://lispcentral.web.app/docs/${mod.doc}" target="_blank" onclick="event.stopPropagation();" title="Ver documentación">?</a>`
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
      
      item.addEventListener("click", () => runAutoCADCommand(mod.name));
      groupContainer.appendChild(item);
    });
    
    ribbonPanel.appendChild(groupContainer);
    container.appendChild(ribbonPanel);
  });
}

function renderFavorites() {
  const section = document.getElementById("favoritesSection");
  const listContainer = document.getElementById("favoritesList");
  if (!listContainer || !section) return;
  
  listContainer.innerHTML = "";
  const pinnedMods = modulesData.filter(mod => favorites.includes(mod.name));
  
  if (pinnedMods.length === 0) {
    section.classList.add("hidden");
    return;
  }
  
  section.classList.remove("hidden");
  
  pinnedMods.forEach(mod => {
    const item = document.createElement("div");
    item.className = `module-item ${mod.status}`;
    item.id = `fav-${mod.name}`;
    item.title = mod.desc;
    
    const icon = mod.svgIcon ? mod.svgIcon : (GROUP_ICONS[mod.group] || "🔧");
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
      </div>
    `;
    item.addEventListener("click", () => runAutoCADCommand(mod.name));
    listContainer.appendChild(item);
  });
}

function togglePin(cmdName) {
  const index = favorites.indexOf(cmdName);
  if (index === -1) {
    favorites.push(cmdName);
  } else {
    favorites.splice(index, 1);
  }
  localStorage.setItem('lispcentral_favorites', JSON.stringify(favorites));
  renderFavorites();
  renderModules();
}

function filterModules() {
  const searchInput = document.getElementById("searchInput");
  const currentInputText = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const inputKeywords = currentInputText.split(/\\s+/).filter(k => k !== "");
  const activeKeywords = [...searchTags, ...inputKeywords];
  
  const groups = {};
  modulesData.forEach(mod => {
    if (!groups[mod.group]) groups[mod.group] = [];
    groups[mod.group].push(mod);
  });
  
  Object.keys(groups).forEach(groupName => {
    const list = groups[groupName];
    const groupId = groupName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const ribbonPanel = document.getElementById(`ribbon-panel-${groupId}`);
    
    let visibleCount = 0;
    
    list.forEach(mod => {
      const item = document.getElementById(`mod-${mod.name}`);
      if (!item) return;
      
      let matchesAll = true;
      for (const kw of activeKeywords) {
        const match = mod.name.toLowerCase().includes(kw) || 
                      mod.friendly.toLowerCase().includes(kw) || 
                      mod.desc.toLowerCase().includes(kw) || 
                      mod.group.toLowerCase().includes(kw);
        if (!match) { matchesAll = false; break; }
      }
      
      if (matchesAll) {
        item.style.display = "flex";
        visibleCount++;
      } else {
        item.style.display = "none";
      }
    });
    
    if (visibleCount === 0) {
      if (ribbonPanel) ribbonPanel.classList.add("hidden");
    } else {
      if (ribbonPanel) {
        ribbonPanel.classList.remove("hidden");
        const countBadge = document.getElementById(`group-count-${groupId}`);
        if (countBadge) countBadge.innerText = visibleCount;
      }
    }
  });
}

function setupEvents() {
  document.getElementById("searchInput").addEventListener("input", filterModules);
}

window.onload = () => {
  renderFavorites();
  renderModules();
  setupEvents();
  setTimeout(() => {
    document.getElementById("syncStatus").style.display = "none";
  }, 1000);
};
