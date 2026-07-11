import React, { useState } from "react";
import { db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function EditMetadataModal({ hatch, onClose, onSaved }) {
  const [name, setName] = useState(hatch.name || "");
  const [category, setCategory] = useState(hatch.category || "");
  const [description, setDescription] = useState(hatch.description || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, "pat_library", hatch.id);
      await updateDoc(docRef, {
        name,
        category,
        description,
      });
      onSaved({ ...hatch, name, category, description });
      onClose();
    } catch (e) {
      alert("Error al guardar: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="modal-title"
          style={{ margin: "0 0 15px 0", color: "var(--tmd-orange)" }}
        >
          Editar Metadatos
        </h3>

        <label htmlFor="edit-hatch-name" style={labelStyle}>
          Nombre del Patrón
        </label>
        <input
          id="edit-hatch-name"
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label htmlFor="edit-hatch-category" style={labelStyle}>
          Categoría
        </label>
        <input
          id="edit-hatch-category"
          style={inputStyle}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <label htmlFor="edit-hatch-description" style={labelStyle}>
          Descripción
        </label>
        <textarea
          id="edit-hatch-description"
          style={{ ...inputStyle, height: "60px" }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button style={btnCancelStyle} onClick={onClose}>
            Cancelar
          </button>
          <button style={btnSaveStyle} onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000,
};

const modalStyle = {
  backgroundColor: "#1e293b",
  padding: "20px",
  borderRadius: "8px",
  width: "400px",
  border: "1px solid #334155",
  display: "flex",
  flexDirection: "column",
};

const labelStyle = {
  fontSize: "0.8rem",
  color: "#94a3b8",
  marginBottom: "5px",
  marginTop: "10px",
};

const inputStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #475569",
  borderRadius: "4px",
  color: "#fff",
  padding: "8px",
  fontSize: "0.9rem",
};

const btnCancelStyle = {
  flex: 1,
  padding: "8px",
  backgroundColor: "#334155",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

const btnSaveStyle = {
  flex: 1,
  padding: "8px",
  backgroundColor: "var(--tmd-orange)",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "bold",
};
