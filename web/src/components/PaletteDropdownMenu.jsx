import React, { useState, useRef, useEffect } from "react";
import {
  executeInAutoCAD,
  closePaletteInAutoCAD,
} from "../utils/autocadBridge";
import { usePalettePresence } from "../utils/usePalettePresence";

export default function PaletteDropdownMenu({ myId }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Hook que mantiene el latido y nos dice cuáles paletas están vivas
  const activePalettes = usePalettePresence(myId);

  const palettes = [
    {
      id: "commands",
      label: "LispCentral Commands",
      acadName: "Command Palette",
      openCmd: "(C:LC_PALETTE) ",
    },
    {
      id: "saas",
      label: "LispCentral Standards",
      acadName: "SaaS Palette",
      openCmd: "(C:TEST_SAAS_PALETTE) ",
    },
    {
      id: "resources",
      label: "LispCentral Hatches",
      acadName: "Resource Palette",
      openCmd: "(C:LC_RESOURCES) ",
    },
    {
      id: "properties",
      label: "LispCentral Properties",
      acadName: "LispCentral Propiedades",
      openCmd: "(C:LC_PROP) ",
    },
  ];

  // Cerrar si se clickea fuera del menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (palette) => {
    const isCurrentlyActive = activePalettes.includes(palette.id);

    // Si la paleta destino es la propia paleta en la que estoy
    if (palette.id === myId) {
      // Solo podemos cerrarnos a nosotros mismos
      if (isCurrentlyActive) {
        closePaletteInAutoCAD(palette.acadName);
      }
      setIsOpen(false);
      return;
    }

    if (isCurrentlyActive) {
      // Estaba abierta, la cerramos
      closePaletteInAutoCAD(palette.acadName);
    } else {
      // Estaba cerrada, la abrimos
      executeInAutoCAD(palette.openCmd);
    }
    setIsOpen(false);
  };

  return (
    <div
      ref={menuRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      {/* Botón Menu / Hamburguesa */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        style={{
          background: "transparent",
          border: "none",
          color: "#aaa",
          cursor: "pointer",
          padding: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Opciones de Paleta"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "4px",
            backgroundColor: "#222",
            border: "1px solid #333",
            borderRadius: "4px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            minWidth: "200px",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            padding: "4px 0",
          }}
        >
          {palettes.map((p) => {
            const isActive = activePalettes.includes(p.id);
            return (
              <button
                key={p.id}
                role="menuitemcheckbox"
                aria-checked={isActive}
                onClick={() => handleToggle(p)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  textAlign: "left",
                  padding: "8px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "0.8rem",
                  gap: "8px",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#333")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                {/* Icono de Check (simulando UI nativa) */}
                <span
                  style={{
                    display: "inline-block",
                    width: "16px",
                    color: "var(--tmd-orange)",
                    fontWeight: "bold",
                  }}
                >
                  {isActive ? "✔" : ""}
                </span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
