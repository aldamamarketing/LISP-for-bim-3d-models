// LISPCENTRAL - PROPERTIES PANEL CONTROLLER (properties_unified.js)
let currentActiveCommand = "";
let pollingInterval = null;

// Mapeo de IDs de inputs de HTML a Variables Globales AutoLISP
const LISP_VAR_MAP = {
  // ARQ-SYS-Config
  "cfg_scale": { varName: "ARQ_SYS_Config_scale", type: "string" },
  "cfg_units": { varName: "ARQ_SYS_Config_units", type: "string" },
  "cfg_layer_wall": { varName: "ARQ_SYS_Config_layer_wall", type: "string" },
  "cfg_layer_opening": { varName: "ARQ_SYS_Config_layer_opening", type: "string" },
  // ARQ-GRID-Axes
  "grid_dist_x": { varName: "ARQ_GRID_Axes_dist_x", type: "string" },
  "grid_dist_y": { varName: "ARQ_GRID_Axes_dist_y", type: "string" },
  "grid_bubble_radius": { varName: "ARQ_GRID_Axes_bubble_radius", type: "number" },
  "grid_text_height": { varName: "ARQ_GRID_Axes_text_height", type: "number" },
  // ARQ-GRID-Line
  "grid_line_label": { varName: "ARQ_GRID_Line_label", type: "string" },
  "grid_line_side": { varName: "ARQ_GRID_Line_side", type: "string" },
  // ARQ-WALL-Draw
  "wall_draw_thickness": { varName: "ARQ_WALL_Draw_thickness", type: "number" },
  "wall_draw_justify": { varName: "ARQ_WALL_Draw_justify", type: "string" },
  // ARQ-WALL-FromAxis
  "wall_axis_thickness": { varName: "ARQ_WALL_FromAxis_thickness", type: "number" },
  "wall_axis_delete_source": { varName: "ARQ_WALL_FromAxis_delete_source", type: "boolean" },
  // ARQ-WALL-Thickness
  "wall_mod_thickness": { varName: "ARQ_WALL_Thickness_new_thickness", type: "number" },
  // ARQ-WALL-Trim
  "wall_trim_mode": { varName: "ARQ_WALL_Trim_mode", type: "string" },
  // ARQ-COL-Insert
  "col_section_type": { varName: "ARQ_COL_Insert_section_type", type: "string" },
  "col_dim_x": { varName: "ARQ_COL_Insert_dim_x", type: "number" },
  "col_dim_y": { varName: "ARQ_COL_Insert_dim_y", type: "number" },
  "col_rotation": { varName: "ARQ_COL_Insert_rotation", type: "number" },
  // ARQ-DOOR-Insert
  "door_width": { varName: "ARQ_DOOR_Insert_width", type: "number" },
  "door_height": { varName: "ARQ_DOOR_Insert_height", type: "number" },
  "door_type": { varName: "ARQ_DOOR_Insert_type", type: "string" },
  // ARQ-WIN-Insert
  "win_width": { varName: "ARQ_WIN_Insert_width", type: "number" },
  "win_height": { varName: "ARQ_WIN_Insert_height", type: "number" },
  "win_sill": { varName: "ARQ_WIN_Insert_sill", type: "number" },
  // ARQ-WALL-MoveOpening
  "move_offset_mode": { varName: "ARQ_WALL_MoveOpening_mode", type: "string" },
  "move_distance": { varName: "ARQ_WALL_MoveOpening_distance", type: "number" },
  // ARQ-WALL-ResizeOpening
  "resize_new_width": { varName: "ARQ_WALL_ResizeOpening_new_width", type: "number" },
  // ARQ-DIM-Opening
  "dim_open_style": { varName: "ARQ_DIM_Opening_style", type: "string" },
  "dim_open_offset": { varName: "ARQ_DIM_Opening_offset", type: "number" },
  // ARQ-DIM-Quick
  "dim_quick_style": { varName: "ARQ_DIM_Quick_style", type: "string" },
  // ARQ-SYM-Level
  "level_value": { varName: "ARQ_SYM_Level_value", type: "string" },
  "level_symbol_type": { varName: "ARQ_SYM_Level_symbol_type", type: "string" },
  "level_scale": { varName: "ARQ_SYM_Level_scale", type: "number" }
};

document.addEventListener("DOMContentLoaded", () => {
  loadSavedProperties();
  setupEventListeners();
  syncAllPropertiesToAutoCAD();
  
  // Iniciar sondeo automático del estado de AutoCAD
  toggleAutoPolling();
});

// Cargar propiedades persistentes de localStorage
function loadSavedProperties() {
  Object.keys(LISP_VAR_MAP).forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    
    const savedVal = localStorage.getItem(`lisp_prop_${id}`);
    if (savedVal !== null) {
      if (input.type === "checkbox") {
        input.checked = (savedVal === "true");
      } else {
        input.value = savedVal;
      }
    }
  });
  
  // Lógica particular de visualización condicionada de campos
  handleConditionalUI();
}

// Configurar los manejadores de eventos
function setupEventListeners() {
  // Selector manual de comando
  const commandSelector = document.getElementById("commandSelector");
  commandSelector.addEventListener("change", (e) => {
    const val = e.target.value;
    switchToCommand(val);
    
    // Si el usuario cambia manualmente, desactivar la autodetectación para no ser interrumpido
    if (val !== "") {
      document.getElementById("autoDetectCheckbox").checked = false;
      toggleAutoPolling();
    }
  });

  // Checkbox de autodetectación
  document.getElementById("autoDetectCheckbox").addEventListener("change", () => {
    toggleAutoPolling();
  });

  // Manejo de cambios en cualquier input de propiedades
  Object.keys(LISP_VAR_MAP).forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener("input", () => {
      saveAndSyncProperty(id, input);
    });

    input.addEventListener("change", () => {
      saveAndSyncProperty(id, input);
      handleConditionalUI();
    });
  });
}

// Lógica de visualización condicionada de campos
function handleConditionalUI() {
  // ARQ-COL-Insert: Ocultar Largo Y si la sección es circular
  const colSectionType = document.getElementById("col_section_type");
  const colDimYGroup = document.getElementById("col_dim_y_group");
  if (colSectionType && colDimYGroup) {
    colDimYGroup.style.display = (colSectionType.value === "circle") ? "none" : "flex";
  }

  // ARQ-WALL-MoveOpening: Mostrar distancia solo si el modo es "distance"
  const moveOffsetMode = document.getElementById("move_offset_mode");
  const moveDistanceGroup = document.getElementById("move_distance_group");
  if (moveOffsetMode && moveDistanceGroup) {
    moveDistanceGroup.style.display = (moveOffsetMode.value === "distance") ? "flex" : "none";
  }
}

// Guardar y sincronizar una propiedad individual
function saveAndSyncProperty(id, input) {
  let val;
  if (input.type === "checkbox") {
    val = input.checked;
  } else {
    val = input.value;
  }
  
  localStorage.setItem(`lisp_prop_${id}`, val);
  syncPropertyToAutoCAD(id, val);
}

// Enviar una propiedad específica a AutoCAD mediante AutoLISP
function syncPropertyToAutoCAD(id, val) {
  const mapping = LISP_VAR_MAP[id];
  if (!mapping) return;

  let lispVal;
  if (mapping.type === "number") {
    lispVal = parseFloat(val);
    if (isNaN(lispVal)) return;
  } else if (mapping.type === "boolean") {
    lispVal = val ? "1" : "0";
  } else {
    // Escapar comillas para evitar vulnerabilidades de sintaxis LISP
    const cleanStr = String(val).replace(/"/g, '\\"');
    lispVal = `"${cleanStr}"`;
  }

  const lispExpression = `(setq ${mapping.varName} ${lispVal})`;
  
  if (typeof Acad !== 'undefined' && Acad.Editor && typeof Acad.Editor.evaluateLisp === 'function') {
    Acad.Editor.evaluateLisp(lispExpression).then(() => {
      showToast();
    }).catch(err => {
      console.error(`Erro ao sincronizar variável ${mapping.varName}:`, err);
    });
  } else {
    console.log(`[AutoCAD Sim] Executando: ${lispExpression}`);
  }
}

// Sincronizar todas las propiedades de una sola vez (inicialización)
function syncAllPropertiesToAutoCAD() {
  if (typeof Acad === 'undefined' || !Acad.Editor || typeof Acad.Editor.evaluateLisp !== 'function') {
    return;
  }

  let lispBlock = "(progn ";
  Object.keys(LISP_VAR_MAP).forEach(id => {
    const input = document.getElementById(id);
    const mapping = LISP_VAR_MAP[id];
    if (!input || !mapping) return;

    let val = input.type === "checkbox" ? input.checked : input.value;
    let lispVal;
    if (mapping.type === "number") {
      lispVal = parseFloat(val);
      if (isNaN(lispVal)) return;
    } else if (mapping.type === "boolean") {
      lispVal = val ? "1" : "0";
    } else {
      const cleanStr = String(val).replace(/"/g, '\\"');
      lispVal = `"${cleanStr}"`;
    }
    lispBlock += `\n  (setq ${mapping.varName} ${lispVal})`;
  });
  lispBlock += "\n  (princ)\n)";

  Acad.Editor.evaluateLisp(lispBlock).catch(err => {
    console.error("Erro ao sincronizar lote de propriedades:", err);
  });
}

// Alternar el sondeo periódico del AutoCAD activo
function toggleAutoPolling() {
  const autoDetect = document.getElementById("autoDetectCheckbox").checked;
  
  if (autoDetect) {
    if (!pollingInterval) {
      pollingInterval = setInterval(pollActiveCommand, 250);
    }
  } else {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }
}

// Sondear AutoCAD para comprobar el comando activo
function pollActiveCommand() {
  if (typeof Acad === 'undefined' || !Acad.Editor || !Acad.Editor.getSystemVariable) {
    return;
  }

  Acad.Editor.getSystemVariable("USERS1").then((val) => {
    if (val && val.endsWith(":active")) {
      const cmd = val.split(":")[0];
      if (cmd !== currentActiveCommand) {
        switchToCommand(cmd);
      }
    } else if (!val || val === "" || val.endsWith(":success") || val.endsWith(":error")) {
      // Si USERS1 está vacío o completó, limpiar el formulario si estuviese activo
      if (currentActiveCommand !== "") {
        switchToCommand("");
      }
    }
  }).catch(err => {
    // Silenciar errores temporales de polling durante comandos interactivos
  });
}

// Cambiar la UI para mostrar el formulario del comando especificado
function switchToCommand(cmdName) {
  currentActiveCommand = cmdName;
  
  // Actualizar el selector visual
  const selector = document.getElementById("commandSelector");
  if (selector.value !== cmdName) {
    selector.value = cmdName;
  }

  // Ocultar todos los formularios
  const forms = document.querySelectorAll(".cmd-form");
  forms.forEach(form => form.classList.remove("active"));

  const emptyState = document.getElementById("emptyState");

  if (cmdName && document.getElementById(`form-${cmdName}`)) {
    emptyState.style.display = "none";
    document.getElementById(`form-${cmdName}`).classList.add("active");
  } else {
    emptyState.style.display = "flex";
  }
}

// Mostrar notificación Toast
let toastTimeout = null;
function showToast() {
  const toast = document.getElementById("syncToast");
  if (!toast) return;

  toast.classList.add("show");
  
  if (toastTimeout) clearTimeout(toastTimeout);
  
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 1200);
}
