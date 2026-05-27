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

// Mapeo detallado de metadatos para visualización y documentación
const METADATA_MAP = {
  // Arquitetura 2D (Suite Semántica)
  "ARQ-SYS-Config": {
    friendly: "Configurar Suite",
    desc: "Ajuste de capas, unidades, colores y escalas del sistema.",
    group: "Arquitetura 2D",
    doc: "#"
  },
  "ARQ-GRID-Axes": {
    friendly: "Ejes de Rejilla",
    desc: "Crea una rejilla de ejes paramétrica con distancias X/Y.",
    group: "Arquitetura 2D",
    doc: "#"
  },
  "ARQ-GRID-Line": {
    friendly: "Trazar Eje",
    desc: "Dibuja una línea de eje individual y le asocia burbuja.",
    group: "Arquitetura 2D",
    doc: "#"
  },
  "ARQ-WALL-Draw": {
    friendly: "Diseñar Muros",
    desc: "Dibuja muros dobles paralelos con grosor interactivo.",
    group: "Arquitetura 2D",
    doc: "#"
  },
  "ARQ-WALL-FromAxis": {
    friendly: "Muros desde Ejes",
    desc: "Convierte automáticamente líneas de ejes seleccionadas a muros.",
    group: "Arquitetura 2D",
    doc: "#"
  },
  "ARQ-WALL-Thickness": {
    friendly: "Grosor de Muro",
    desc: "Permite cambiar el grosor de las paredes seleccionadas.",
    group: "Arquitetura 2D",
    doc: "#"
  },
  "ARQ-WALL-Trim": {
    friendly: "Limpieza de Muros",
    desc: "Resuelve y limpia intersecciones de muros en T, L o Cruz.",
    group: "Arquitetura 2D",
    doc: "#"
  },
  "ARQ-COL-Insert": {
    friendly: "Insertar Columnas",
    desc: "Coloca columnas en cruces de ejes o de manera libre.",
    group: "Arquitetura 2D",
    doc: "#"
  },
  "ARQ-DOOR-Insert": {
    friendly: "Insertar Puertas",
    desc: "Añade una puerta en un muro rompiendo la pared automáticamente.",
    group: "Arquitetura 2D",
    doc: "#"
  },
  "ARQ-WIN-Insert": {
    friendly: "Insertar Ventanas",
    desc: "Añade una ventana en un muro rompiendo la pared automáticamente.",
    group: "Arquitetura 2D",
    doc: "#"
  },
  "ARQ-WALL-MoveOpening": {
    friendly: "Mover Vanos",
    desc: "Mueve una puerta o ventana reparando la pared atrás de forma interactiva.",
    group: "Arquitetura 2D",
    doc: "#"
  },
  "ARQ-WALL-ResizeOpening": {
    friendly: "Redimensionar Vanos",
    desc: "Permite modificar el ancho de vanos y regenera el corte de muro.",
    group: "Arquitetura 2D",
    doc: "#"
  },
  "ARQ-DIM-Opening": {
    friendly: "Acotado de Vanos",
    desc: "Acota de forma lineal y secuencial muros y vanos indicados.",
    group: "Arquitetura 2D",
    doc: "#"
  },
  "ARQ-DIM-Quick": {
    friendly: "Cota de Habitación",
    desc: "Acotación automática de las distancias interiores de un cuarto.",
    group: "Arquitetura 2D",
    doc: "#"
  },
  "ARQ-SYM-Level": {
    friendly: "Simbología de Nivel",
    desc: "Inserta marcas de nivel de piso con altura editable.",
    group: "Arquitetura 2D",
    doc: "#"
  },

  // Estruturas (Pro)
  "TMD_JOINTS": {
    friendly: "Ligações Metálicas",
    desc: "Gera conexões, soldas e juntas estruturais entre sólidos 3D.",
    group: "Estruturas (Pro)",
    doc: "lc-joints"
  },
  "TMD_BUILD": {
    friendly: "Compilador 3D",
    desc: "Converte linhas-guia (Wires) em sólidos 3D parametrizados.",
    group: "Estruturas (Pro)",
    doc: "lc-build"
  },
  "TMD_Vigas": {
    friendly: "Vigas 3D",
    desc: "Cria e edita vigas estruturais com LDATA parametrizado.",
    group: "Estruturas (Pro)",
    doc: "tmd-vigas"
  },
  "TMD_Wires": {
    friendly: "Linhas Guia (Wires)",
    desc: "Modo livre 3D: traçado contínuo de linhas de referência (eixos).",
    group: "Estruturas (Pro)",
    doc: "tmd-wires"
  },
  "TMD_Teja_TR25": {
    friendly: "Telhas Trapezoidais TR25",
    desc: "Desenha coberturas parametrizadas com telhas TR25.",
    group: "Estruturas (Pro)",
    doc: "tmd-teja-tr25"
  },
  "TejadoMVP": {
    friendly: "Telhados Metálicos",
    desc: "Geração simplificada de telhados e inclinações estruturais.",
    group: "Estruturas (Pro)",
    doc: "tejado-mvp"
  },
  "TMD_Abas": {
    friendly: "Abas Paramétricas",
    desc: "Cria abas metálicas parametrizadas nos perfis estruturais.",
    group: "Estruturas (Pro)",
    doc: "tmd-abas"
  },
  "AbaParam": {
    friendly: "Parâmetros de Aba",
    desc: "Definição de parâmetros estruturais das abas de vigas.",
    group: "Estruturas (Pro)",
    doc: "aba-param"
  },
  "AbaPerfil": {
    friendly: "Perfil de Aba",
    desc: "Configuração geométrica detalhada do perfil das abas.",
    group: "Estruturas (Pro)",
    doc: "aba-perfil"
  },
  "EstruturaMVP": {
    friendly: "Estruturas MVP",
    desc: "Gerador de pórticos e coberturas de galpão.",
    group: "Estruturas (Pro)",
    doc: "estructura-mvp"
  },
  "Gerar_Grelha": {
    friendly: "Gerador de Grelhas",
    desc: "Criação de grelhas estruturais bidirecionais automáticas.",
    group: "Estruturas (Pro)",
    doc: "gerar-grelha"
  },
  "LC_STEEL_DRAW": {
    friendly: "Detalhamento de Aço",
    desc: "Desenho parametrizado de vergalhões e estribos 2D.",
    group: "Estruturas (Pro)",
    doc: "lc-steel-draw"
  },

  // BIM / Coordenação e Edição
  "TMD_Niveis": {
    friendly: "Níveis BIM",
    desc: "Sincronizador e editor global de alturas e referências Z.",
    group: "BIM / Coordenação",
    doc: "tmd-niveis"
  },
  "TMD_Tags": {
    friendly: "Etiquetas BIM",
    desc: "Inserção e controle de tags/metadados nos elementos 3D.",
    group: "BIM / Anotação",
    doc: "tmd-tags"
  },
  "TMD_MATCH": {
    friendly: "Propriedades BIM (Match)",
    desc: "Copia propriedades de LDATA completo de um sólido para outros.",
    group: "BIM / Propriedades",
    doc: "tmd-match"
  },
  "TMD_Align": {
    friendly: "Alinhamento Corel",
    desc: "Alinhamento industrial de elementos estilo Corel.",
    group: "Edição / Layout",
    doc: "tmd-align"
  },
  "TMD_Groups": {
    friendly: "Grupos Estruturais",
    desc: "Organização e agrupamento lógico de vigas e pilares.",
    group: "Edição / Layout",
    doc: "tmd-groups"
  },
  "TMD_FACE_CUT": {
    friendly: "Corte por Face",
    desc: "Corte preciso e chanfro de vigas baseado em planos/faces 3D.",
    group: "Edição / Layout",
    doc: "tmd-face-cut"
  },
  "TMD_SYNC": {
    friendly: "Sincronizador BIM",
    desc: "Saneia ADN, resolve conflitos colineares e reconecta órfãos.",
    group: "Sistema / Core",
    doc: "tmd-sync"
  },

  // Quantidades
  "TMD_BOM": {
    friendly: "Lista de Materiais (BOM)",
    desc: "Gera e exporta listas estruturadas de quantitativos.",
    group: "Quantidades",
    doc: "tmd-bom"
  },
  "TMD_Tablas": {
    friendly: "Tabelas Dinâmicas",
    desc: "Geração automática de tabelas e quantitativos no AutoCAD.",
    group: "Quantidades",
    doc: "tmd-tablas"
  },
  "LC_BOM_EXPORT": {
    friendly: "Exportador BOM",
    desc: "Mapeamento rápido de sólidos para arquivo CSV.",
    group: "Quantidades",
    doc: "lc-bom-export"
  },
  "LC_TAREA": {
    friendly: "Somar Áreas",
    desc: "Cálculo e soma acumulada de áreas de polígonos fechados.",
    group: "Quantidades",
    doc: "lc-tarea"
  },
  "LC_TLEN": {
    friendly: "Somar Comprimentos",
    desc: "Soma rápida de comprimentos de linhas, arcos e polilinhas.",
    group: "Quantidades",
    doc: "lc-tlen"
  },

  // Fabricação
  "TMD_CNC": {
    friendly: "Exportador CNC",
    desc: "Geração de arquivos de corte/furação CNC para fabricação.",
    group: "Fabricação (Pro)",
    doc: "tmd-cnc"
  },

  // Arquitetura
  "AcmMVP": {
    friendly: "Colunas ACM MVP",
    desc: "Modelagem MVP de revestimentos e pilares em ACM.",
    group: "Arquitetura",
    doc: "acm-mvp"
  },
  "AcmTools": {
    friendly: "Ferramentas ACM",
    desc: "Utilitários adicionais para modulação de chapas ACM.",
    group: "Arquitetura",
    doc: "acm-tools"
  },
  "ColumnaACM": {
    friendly: "Colunas ACM",
    desc: "Modelador avançado de colunas redondas e quadradas em ACM.",
    group: "Arquitetura",
    doc: "columna-acm"
  },
  "ColumnaCorintia": {
    friendly: "Coluna Coríntia",
    desc: "Gerador clássico parametrizado de colunas coríntias 3D.",
    group: "Arquitetura",
    doc: "columna-corintia"
  },
  "CortarParedes": {
    friendly: "Cortar Paredes",
    desc: "Ferramenta para abertura de vãos de portas e janelas.",
    group: "Arquitetura",
    doc: "cortar-paredes"
  },
  "ParedeMVP": {
    friendly: "Paredes 3D",
    desc: "Modelador rápido de paredes sólidas parametrizadas.",
    group: "Arquitetura",
    doc: "parede-mvp"
  },
  "PortaMVP": {
    friendly: "Portas 3D",
    desc: "Inserção parametrizada de blocos inteligentes de portas.",
    group: "Arquitetura",
    doc: "porta-mvp"
  },
  "LC_WALL_DRAW": {
    friendly: "Desenho de Paredes",
    desc: "Desenho interativo 2D de paredes com espessura ajustável.",
    group: "Arquitetura",
    doc: "lc-wall-draw"
  },

  // Topografia
  "LC_CUADRO_RUMBOS": {
    friendly: "Quadro de Rumos",
    desc: "Memorial descritivo e tabelas de rumos e azimutes.",
    group: "Topografia",
    doc: "lc-cuadro-rumbos"
  },
  "LC_ZLABEL": {
    friendly: "Etiqueta Z (Cotas)",
    desc: "Identificador dinâmico de coordenadas Z (elevação).",
    group: "Topografia",
    doc: "lc-zlabel"
  },

  // Sistema / Core
  "TMD_Utils": {
    friendly: "Utilitários Core",
    desc: "Funções básicas e utilitários auxiliares de sistema.",
    group: "Sistema / Core",
    doc: "tmd-utils"
  },
  "LC_CLEAN": {
    friendly: "Super Limpeza (Clean)",
    desc: "Auditoria profunda de banco de dados do desenho AutoCAD.",
    group: "Sistema / Core",
    doc: "lc-clean"
  },
  "LC_FLATZ": {
    friendly: "Aplanar Desenho (Flatten)",
    desc: "Projeta todas as entidades selecionadas para elevação Z=0.",
    group: "Sistema / Core",
    doc: "lc-flat-z"
  }
};

// Orden de visualización de los grupos
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
  "Outros"
];

function getMetadata(cmdName) {
  let data = METADATA_MAP[cmdName];
  if (!data) {
    let cleanName = cmdName;
    if (cmdName.startsWith("LC_")) {
      cleanName = cmdName.replace("LC_", "TMD_");
    } else if (cmdName.startsWith("TMD_")) {
      cleanName = cmdName.replace("TMD_", "LC_");
    }
    data = METADATA_MAP[cleanName];
  }
  
  if (data) return data;
  
  // Fallback seguro
  return {
    friendly: cmdName,
    desc: "Comando LispCentral",
    group: cmdName.startsWith("LC_") || cmdName.startsWith("TMD_") ? "Comando Geral" : "Outros",
    doc: "#"
  };
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  initPalette();
  
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
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Executar ${mod.friendly}`);
    
    const icon = GROUP_ICONS[mod.group] || "🔧";
    const docsBtnHtml = mod.doc && mod.doc !== "#" 
      ? `<a class="docs-btn" href="https://lispcentral.web.app/docs/${mod.doc}" target="_blank" onclick="event.stopPropagation();" title="Ver documentação" aria-label="Ver documentação">?</a>`
      : "";
      
    const pinBtnHtml = `<button class="pin-btn pinned" onclick="event.stopPropagation(); togglePin('${mod.name}');" title="Desafixar" aria-label="Desafixar ${mod.friendly}">📌</button>`;
    
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
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        if (e.target === item) {
          e.preventDefault();
          runAutoCADCommand(mod.name);
        }
      }
    });
    listContainer.appendChild(item);
  });
}


async function initPalette() {
  try {
    writeConsoleMessage("\n[LispCentral] Inicializando Command Palette asíncrona...");
    
    // 1. Obtener Índice de comandos desde el servidor
    const indexUrl = `${BASE_ENDPOINT}?apiKey=${apiKey}&hwId=${hwId}&routine=INDEX`;
    const response = await fetch(indexUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const text = await response.text();
    const cmdList = text.split(",").filter(c => c.trim() !== "");

    
    // Crear base de datos de módulos con metadatos estructurados
    modulesData = cmdList.map(cmd => {
      const meta = getMetadata(cmd);
      return {
        name: cmd,
        friendly: meta.friendly,
        desc: meta.desc,
        group: meta.group,
        doc: meta.doc,
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
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", `Executar ${mod.friendly}`);
      
      const isPinned = favorites.includes(mod.name);
      const icon = GROUP_ICONS[mod.group] || "🔧";
      const docsBtnHtml = mod.doc && mod.doc !== "#" 
        ? `<a class="docs-btn" href="https://lispcentral.web.app/docs/${mod.doc}" target="_blank" onclick="event.stopPropagation();" title="Ver documentação" aria-label="Ver documentação">?</a>`
        : "";
        
      const pinBtnHtml = `<button class="pin-btn ${isPinned ? 'pinned' : ''}" onclick="event.stopPropagation(); togglePin('${mod.name}');" title="${isPinned ? 'Desafixar' : 'Fixar no topo'}" aria-label="${isPinned ? 'Desafixar' : 'Fixar'} ${mod.friendly}">📌</button>`;
      
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
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (e.target === item) {
            e.preventDefault();
            runAutoCADCommand(mod.name);
          }
        }
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

  // RUTA LISP: usar evaluateLisp (API nativa para expresiones AutoLISP)
  if (typeof Acad.Editor.evaluateLisp === 'function') {
    Acad.Editor.evaluateLisp(lispCmd);
  } else if (typeof Acad.Editor.executeCommand === 'function') {
    // Fallback: envolver en LISP command-line invocation
    Acad.Editor.executeCommand(lispCmd + "\n");
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
