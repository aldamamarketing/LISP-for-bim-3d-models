import React, { useState, useEffect, useCallback, useMemo } from "react";
import PaletteDropdownMenu from "./PaletteDropdownMenu";
import MultiFilter from "./MultiFilter";
import { executeInAutoCAD } from "../utils/autocadBridge";

const API_BASE = "https://getroutine-wgpjjgorxa-uc.a.run.app/getRoutine";

const GROUP_ICONS = {
  "Estruturas (Pro)": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="1"/><line x1="2" y1="6" x2="14" y2="6"/><line x1="2" y1="10" x2="14" y2="10"/><line x1="6" y1="2" x2="6" y2="14"/><line x1="10" y1="2" x2="10" y2="14"/></svg>`,
  "BIM / Coordenação": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 4.5L8 1.5L2 4.5L8 7.5L14 4.5Z"/><path d="M2 11.5L8 14.5L14 11.5"/><path d="M2 8L8 11L14 8"/></svg>`,
  "BIM / Anotação": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 4.5L8 1.5L2 4.5L8 7.5L14 4.5Z"/><path d="M2 11.5L8 14.5L14 11.5"/><path d="M2 8L8 11L14 8"/></svg>`,
  "BIM / Propriedades": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 4.5L8 1.5L2 4.5L8 7.5L14 4.5Z"/><path d="M2 11.5L8 14.5L14 11.5"/><path d="M2 8L8 11L14 8"/></svg>`,
  Quantidades: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="13" x2="3" y2="3"/><line x1="3" y1="13" x2="13" y2="13"/><rect x="5" y="7" width="2" height="6" fill="currentColor"/><rect x="9" y="4" width="2" height="9" fill="currentColor"/></svg>`,
  "Fabricação (Pro)": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/></svg>`,
  Arquitetura: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 14V7l6-4 6 4v7H2z"/><path d="M6 14V10h4v4h-4z"/></svg>`,
  "Arquitetura 2D": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 14V7l6-4 6 4v7H2z"/><path d="M6 14V10h4v4h-4z"/></svg>`,
  Topografia: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 2v12M2 8h12"/></svg>`,
  "Sistema / Core": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 13l-3-3 3-3M11 13l3-3-3-3M8 4l-2 8"/></svg>`,
  "Comando Geral": `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 13l-3-3 3-3M11 13l3-3-3-3M8 4l-2 8"/></svg>`,
  Outros: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="7"/><path d="M8 4v4l2.5 1.5"/></svg>`,
};

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
  "Outros",
];

const SvgIcon = ({ svgString, fallback }) => {
  const iconHtml = svgString || fallback;
  return (
    <span
      style={{
        width: "32px",
        height: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--tmd-orange)",
        backgroundColor: "rgba(242,109,33,0.1)",
        border: "1px solid rgba(242,109,33,0.3)",
        borderRadius: "4px",
        padding: "4px",
      }}
      dangerouslySetInnerHTML={{ __html: iconHtml }}
    />
  );
};

export default function LispCommandPalette() {
  console.log("[LispCommandPalette] Inicializando componente...");
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Get credentials from URL
  const urlParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const token = urlParams.get("token") || "";
  const hwid = urlParams.get("hwId") || urlParams.get("hwid") || "";
  // TODO: Remove/disable all console logs before moving to final production environment
  console.log("[LispCommandPalette] URL Params capturados:", {
    token: token ? "OK" : "MISSING",
    hwid: hwid ? hwid.slice(0, 6) + "..." : "MISSING",
  });

  const fetchCommands = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}?token=${encodeURIComponent(token)}&hwId=${encodeURIComponent(hwid)}&routine=INDEX`;
      const maskedUrl = `${API_BASE}?token=${token ? encodeURIComponent(token.slice(0, 12) + "...") : ""}&hwId=${hwid ? encodeURIComponent(hwid.slice(0, 6) + "...") : ""}&routine=INDEX`;
      console.log("[LispCommandPalette] Fetching from:", maskedUrl);
      const response = await fetch(url);
      console.log(
        "[LispCommandPalette] Fetch response status:",
        response.status,
      );
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const data = await response.json();
      console.log(
        "[LispCommandPalette] Comandos recebidos:",
        Array.isArray(data) ? data.length : 0,
      );
      setCommands(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching commands:", err);
      setError("Falha ao carregar funções LISP. Verifique a conexão.");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("lisp_central_favorites");
      if (stored) setFavorites(JSON.parse(stored));
    } catch {
      /* ignore */
    }

    fetchCommands();
  }, [fetchCommands]);

  const togglePin = (cmdName, e) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(cmdName)
        ? prev.filter((p) => p !== cmdName)
        : [...prev, cmdName];
      try {
        localStorage.setItem("lisp_central_favorites", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleRunCommand = (cmdName) => {
    // Usa LC:run-or-load para garantizar carga JIT desde la nube
    executeInAutoCAD(cmdName);
  };

  // Filter and group
  const filteredCmds = useMemo(() => {
    const lowerFilters = activeFilters.map((tag) => tag.toLowerCase());
    return commands.filter((cmd) => {
      if (activeFilters.length === 0) return true;
      const searchableText =
        `${cmd.name || ""} ${cmd.friendly || ""} ${cmd.desc || ""} ${cmd.group || ""}`.toLowerCase();
      // Must match at least ONE tag (OR logic)
      return lowerFilters.some((tag) => searchableText.includes(tag));
    });
  }, [commands, activeFilters]);

  const grouped = {};
  filteredCmds.forEach((cmd) => {
    const g = cmd.group || "Outros";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(cmd);
  });

  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    let iA = GROUP_ORDER.indexOf(a);
    let iB = GROUP_ORDER.indexOf(b);
    if (iA === -1) iA = 99;
    if (iB === -1) iB = 99;
    return iA - iB;
  });

  return (
    <div
      style={{
        backgroundColor: "#181818",
        color: "#fff",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header & Search Container (Max Width to prevent over-stretching) */}
      <div style={{ margin: "0 auto", width: "100%", maxWidth: "600px" }}>
        <div
          style={{
            padding: "8px 10px",
            backgroundColor: "#111",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "2px solid var(--tmd-orange)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <PaletteDropdownMenu myId="commands" />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: "bold",
                color: "var(--tmd-orange)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              LispCentral Comandos
            </span>
          </div>
          <button
            onClick={() => {
              fetchCommands();
              executeInAutoCAD("LC_SYNC");
            }}
            style={{
              background: "transparent",
              border: "1px solid #444",
              color: "#aaa",
              borderRadius: "4px",
              cursor: "pointer",
              padding: "3px 8px",
              fontSize: "0.7rem",
            }}
            title="Atualizar comandos"
          >
            Sync
          </button>
        </div>

        <div style={{ padding: "8px" }}>
          <MultiFilter
            storageKey="lc_active_filters_cmd"
            placeholder="Procurar função..."
            onFilterChange={setActiveFilters}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#666" }}>
            <div
              style={{
                width: "24px",
                height: "24px",
                border: "2px solid rgba(242,109,33,0.3)",
                borderTop: "2px solid var(--tmd-orange)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 10px",
              }}
            ></div>
            Carregando Funções...
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#e74c3c",
              fontSize: "0.85rem",
            }}
          >
            {error}
            <button
              onClick={fetchCommands}
              style={{
                display: "block",
                margin: "10px auto",
                padding: "6px 16px",
                backgroundColor: "var(--tmd-orange)",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div>
            {/* Favorites Section */}
            {favorites.length > 0 && activeFilters.length === 0 && (
              <div style={{ marginBottom: "15px" }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#888",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    fontWeight: "bold",
                  }}
                >
                  📌 Favoritos
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(75px, 1fr))",
                    gap: "6px",
                  }}
                >
                  {commands
                    .filter((c) => favorites.includes(c.name))
                    .map((cmd) => (
                      <CommandItem
                        key={`fav-${cmd.name}`}
                        cmd={cmd}
                        isPinned={true}
                        togglePin={togglePin}
                        onRun={handleRunCommand}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Grouped Commands */}
            {sortedGroups.map((group) => (
              <div key={group} style={{ marginBottom: "12px" }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#888",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    fontWeight: "bold",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{group}</span>
                  <span>{grouped[group].length}</span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(75px, 1fr))",
                    gap: "6px",
                  }}
                >
                  {grouped[group].map((cmd) => (
                    <CommandItem
                      key={`cmd-${cmd.name}`}
                      cmd={cmd}
                      isPinned={favorites.includes(cmd.name)}
                      togglePin={togglePin}
                      onRun={handleRunCommand}
                    />
                  ))}
                </div>
              </div>
            ))}

            {filteredCmds.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px",
                  color: "#666",
                  fontSize: "0.85rem",
                }}
              >
                Nenhuma função encontrada.
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .cmd-item svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .cmd-item {
          background-color: #222;
          border: 1px solid #333;
          border-radius: 4px;
          padding: 8px 6px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          transition: all 0.15s;
          position: relative;
          text-align: center;
          min-height: 85px;
        }
        .cmd-item:hover {
          background-color: #2a2a2a;
          border-color: var(--tmd-orange);
        }
      `}</style>
    </div>
  );
}

function CommandItem({ cmd, isPinned, togglePin, onRun }) {
  return (
    <div className="cmd-item" onClick={() => onRun(cmd.name)} title={cmd.desc}>
      <button
        onClick={(e) => togglePin(cmd.name, e)}
        style={{
          position: "absolute",
          top: "4px",
          right: "4px",
          background: "none",
          border: "none",
          cursor: "pointer",
          opacity: isPinned ? 1 : 0.3,
          color: isPinned ? "var(--tmd-orange)" : "#fff",
          fontSize: "0.7rem",
        }}
        title={isPinned ? "Desafixar" : "Fixar no topo"}
      >
        📌
      </button>

      {cmd.doc && cmd.doc !== "#" && (
        <a
          href={`https://lispcentral.web.app/docs/${cmd.doc}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "4px",
            left: "4px",
            background: "#333",
            color: "#fff",
            textDecoration: "none",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.6rem",
          }}
          title="Ver documentação"
        >
          ?
        </a>
      )}

      <div style={{ marginTop: "8px", marginBottom: "4px" }}>
        <SvgIcon
          svgString={cmd.svgIcon}
          fallback={GROUP_ICONS[cmd.group] || GROUP_ICONS["Outros"]}
        />
      </div>

      <div style={{ width: "100%" }}>
        <div
          style={{
            fontWeight: "bold",
            fontSize: "0.75rem",
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {cmd.name}
        </div>
        <div
          style={{
            fontSize: "0.65rem",
            color: "#aaa",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {cmd.friendly || cmd.desc}
        </div>
      </div>
    </div>
  );
}
