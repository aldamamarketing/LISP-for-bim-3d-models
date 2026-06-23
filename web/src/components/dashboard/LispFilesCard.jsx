import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, deleteObject } from "firebase/storage";
import { showToast } from "../Toast";
import { useTranslation } from "../../i18n/useTranslation";
import { useDashboard } from "./DashboardContext";
import BlurInput from "../ui/BlurInput";

function parseLispCommands(fileContent) {
  const regex = /\(defun\s+c:([A-Za-z0-9_-]+)/gi;
  const commands = [];
  let match;

  while ((match = regex.exec(fileContent)) !== null) {
    commands.push({
      commandName: match[1].toUpperCase(),
      friendlyName: match[1],
      description: "",
      svgIcon: "",
    });
  }
  return commands;
}

export default function LispFilesCard() {
  const { t } = useTranslation();
  const {
    userData,
    tenantLisps,
    setTenantLisps,
    commands,
    setCommands,
    suites,
    setSuites,
    groups,
    setGroups,
    isUploading,
    setIsUploading,
  } = useDashboard();

  const [draftFiles, setDraftFiles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedFileIds, setExpandedFileIds] = useState([]);

  // Modals for icon selection
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [activeCommandId, setActiveCommandId] = useState(null);
  const [dropdownOpenFor, setDropdownOpenFor] = useState(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files).filter((f) =>
      f.name.toLowerCase().endsWith(".lsp"),
    );
    if (files.length === 0) return;

    const newDrafts = [];
    for (const file of files) {
      const content = await file.text();
      const detectedCommands = parseLispCommands(content);

      newDrafts.push({
        fileObj: file,
        originalName: file.name,
        lispId: file.name.replace(".lsp", "").replace(/[^a-zA-Z0-9_-]/g, "_"),
        detectedCommands,
      });
    }

    setDraftFiles([...draftFiles, ...newDrafts]);
  };

  const removeDraft = (index) => {
    setDraftFiles(draftFiles.filter((_, i) => i !== index));
  };

  const submitAllDrafts = async () => {
    if (draftFiles.length === 0) return;
    setIsUploading(true);

    try {
      const { storage } = await import("../../firebase");
      const newUploaded = [];
      const newCommands = [];

      const tenantSlug =
        userData.slug || userData.email?.split("@")[0] || "user";

      for (const draft of draftFiles) {
        const storagePath = `tenants/${userData.id}/lisps/${draft.originalName}`;
        const fileRef = ref(storage, storagePath);

        await uploadBytes(fileRef, draft.fileObj);

        const fileMeta = {
          lispId: draft.lispId,
          tenantId: userData.id,
          originalName: draft.originalName,
          storagePath: storagePath,
          commandCount: draft.detectedCommands.length,
          uploadedAt: new Date().toISOString(),
        };

        const fileId = `FILE-${tenantSlug}-${draft.lispId}`;
        await setDoc(doc(db, "lispFiles", fileId), fileMeta);
        newUploaded.push({ id: fileId, ...fileMeta });

        for (const cmd of draft.detectedCommands) {
          const cmdId = `CMD-${tenantSlug}-${cmd.commandName}`;
          const cmdMeta = {
            lispFileId: fileId,
            tenantId: userData.id,
            commandName: cmd.commandName,
            friendlyName: cmd.friendlyName,
            svgIcon: cmd.svgIcon,
            description: cmd.description,
          };
          await setDoc(doc(db, "commands", cmdId), cmdMeta);
          newCommands.push({ id: cmdId, ...cmdMeta });
        }
      }

      setTenantLisps([...tenantLisps, ...newUploaded]);
      setCommands([...commands, ...newCommands]);
      setDraftFiles([]);
      showToast("Upload concluído com sucesso!", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro durante o upload.", "error");
    }
    setIsUploading(false);
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(tenantLisps.map((l) => l.id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id))
      setSelectedIds(selectedIds.filter((i) => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const toggleExpand = (id) => {
    if (expandedFileIds.includes(id))
      setExpandedFileIds(expandedFileIds.filter((i) => i !== id));
    else setExpandedFileIds([...expandedFileIds, id]);
  };

  const checkFileInPaidActiveSuite = async (fileId) => {
    try {
      const gfSnap = await getDocs(
        query(collection(db, "groupFiles"), where("fileId", "==", fileId)),
      );
      if (gfSnap.empty) return false;

      for (const gfDoc of gfSnap.docs) {
        const groupId = gfDoc.data().groupId;
        const groupSnap = await getDocs(
          query(collection(db, "groups"), where("__name__", "==", groupId)),
        );
        if (!groupSnap.empty) {
          const suiteId = groupSnap.docs[0].data().suiteId;
          const suiteSnap = await getDocs(
            query(collection(db, "suites"), where("__name__", "==", suiteId)),
          );
          if (!suiteSnap.empty) {
            const suiteData = suiteSnap.docs[0].data();
            if (
              suiteData.visibility === "store" &&
              suiteData.price > 0 &&
              suiteData.status !== "deprecated" &&
              suiteData.status !== "archived"
            ) {
              const subSnap = await getDocs(
                query(
                  collection(db, "subscriptions"),
                  where("suiteId", "==", suiteId),
                  where("status", "==", "active"),
                ),
              );
              if (!subSnap.empty) return true;
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    for (const id of selectedIds) {
      const isInPaidSuite = await checkFileInPaidActiveSuite(id);
      if (isInPaidSuite) {
        showToast(
          "Alguns arquivos pertencem a suites pagas ativas. Deprecie a suite primeiro.",
          "error",
        );
        return;
      }
    }

    if (
      !confirm(
        `Excluir ${selectedIds.length} arquivos selecionados? Isso também apagará os comandos relacionados.`,
      )
    )
      return;

    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, "lispFiles", id));
      }
      setTenantLisps(tenantLisps.filter((l) => !selectedIds.includes(l.id)));
      setSelectedIds([]);
      showToast(
        "Arquivos excluídos. A limpeza ocorrerá em background.",
        "success",
      );
    } catch (err) {
      console.error(err);
      showToast("Erro ao excluir arquivos.", "error");
    }
  };

  const handleCommandUpdate = async (cmdId, field, value) => {
    try {
      await updateDoc(doc(db, "commands", cmdId), { [field]: value });
      setCommands(
        commands.map((c) => (c.id === cmdId ? { ...c, [field]: value } : c)),
      );
    } catch (e) {
      showToast("Erro ao salvar.", "error");
    }
  };

  const processIconFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        if (file.type === "image/svg+xml") {
          // Simple sanitization for SVG
          let sanitized = result.replace(
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            "",
          );
          // Make sure width/height is flexible
          sanitized = sanitized
            .replace(/width="[^"]*"/, 'width="100%"')
            .replace(/height="[^"]*"/, 'height="100%"');
          resolve(sanitized);
        } else if (file.type.startsWith("image/")) {
          // Resize PNG/JPEG to 32x32 using Canvas
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, 32, 32);
            resolve(canvas.toDataURL("image/png"));
          };
          img.onerror = () => reject("Error loading image");
          img.src = result;
        } else {
          reject("Invalid file type");
        }
      };
      reader.onerror = () => reject("Error reading file");
      if (file.type === "image/svg+xml") reader.readAsText(file);
      else reader.readAsDataURL(file);
    });
  };

  const handleIconUpload = async (e, cmdId) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const processedIcon = await processIconFile(file);

      // Update command
      await handleCommandUpdate(cmdId, "svgIcon", processedIcon);
      setDropdownOpenFor(null);

      // Save to user's favorites
      const favId = `FAV-${userData.id}-${Date.now()}`;
      await setDoc(doc(db, "publicAssets", favId), {
        type: "favorite",
        tenantId: userData.id,
        content: processedIcon,
        createdAt: new Date().toISOString(),
      });
      showToast("Ícone salvo e adicionado aos Favoritos!", "success");
    } catch (error) {
      console.error(error);
      showToast("Erro ao processar imagem.", "error");
    }
  };

  return (
    <div className="tab-enter card pb-32">
      <h3 className="mt-0 mb-4 flex justify-between items-center">
        Arquivos & Comandos LISP
        <div>
          <input
            type="file"
            multiple
            accept=".lsp, text/plain, application/octet-stream"
            id="bulkUpload"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            className="btn text-sm py-1.5 px-3"
            onClick={() => document.getElementById("bulkUpload").click()}
          >
            <span className="material-symbols-outlined text-[16px] mr-1">
              upload_file
            </span>{" "}
            Subir LISPs
          </button>
        </div>
      </h3>

      {/* DRAFTS */}
      {draftFiles.length > 0 && (
        <div className="mb-8 p-4 border border-primary-container/30 bg-primary-container/5 rounded-lg">
          <h4 className="text-primary-container text-sm font-bold mb-3">
            Revisão de Upload ({draftFiles.length})
          </h4>
          <div className="space-y-3">
            {draftFiles.map((draft, i) => (
              <div
                key={i}
                className="flex items-start justify-between bg-surface p-3 rounded border border-outline-variant"
              >
                <div>
                  <div className="font-code-sm text-on-surface font-bold">
                    {draft.originalName}
                  </div>
                  <div className="text-xs text-on-surface-variant mt-1">
                    Comandos detectados:{" "}
                    {draft.detectedCommands
                      .map((c) => c.commandName)
                      .join(", ") || "Nenhum"}
                  </div>
                </div>
                <button
                  className="text-error hover:text-white"
                  onClick={() => removeDraft(i)}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    delete
                  </span>
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              className="btn bg-primary-container text-white text-sm"
              onClick={submitAllDrafts}
              disabled={isUploading}
            >
              {isUploading ? "Processando..." : "Confirmar e Salvar Tudo"}
            </button>
          </div>
        </div>
      )}

      {/* BULK ACTIONS BAR */}
      {selectedIds.length > 0 && (
        <div className="bg-surface-container-high border border-outline-variant border-b-0 rounded-t-lg p-2 flex items-center justify-between sticky top-0 z-10">
          <span className="text-sm font-bold text-primary-container px-2">
            {selectedIds.length} selecionados
          </span>
          <div className="flex items-center gap-4">
            <button
              className="text-error hover:bg-error/10 px-3 py-1 rounded text-sm font-bold transition-colors"
              onClick={handleBulkDelete}
            >
              Excluir
            </button>
          </div>
        </div>
      )}

      {/* DENSE TABLE */}
      <div
        className={`overflow-x-auto border border-outline-variant ${selectedIds.length > 0 ? "rounded-b-lg border-t-0" : "rounded-lg"} bg-surface`}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant text-label-md font-label-md text-on-secondary-container bg-surface-container-low">
              <th className="py-2 pl-4 font-normal w-[40px]">
                <input
                  type="checkbox"
                  onChange={toggleSelectAll}
                  checked={
                    tenantLisps.length > 0 &&
                    selectedIds.length === tenantLisps.length
                  }
                  className="rounded border-outline-variant bg-surface checked:bg-primary-container"
                />
              </th>
              <th className="py-2 font-normal">
                Arquivo LISP / Comandos Extraídos
              </th>
              <th className="py-2 font-normal w-[200px]">Data Upload</th>
            </tr>
          </thead>
          <tbody>
            {tenantLisps.map((lisp) => {
              const fileCommands = commands.filter(
                (c) => c.lispFileId === lisp.id,
              );
              const isExpanded = expandedFileIds.includes(lisp.id);

              return (
                <React.Fragment key={lisp.id}>
                  {/* PARENT ROW (FILE) */}
                  <tr
                    className="border-b border-outline-variant hover:bg-surface-container-high transition-colors cursor-pointer"
                    onClick={() => toggleExpand(lisp.id)}
                  >
                    <td
                      className="py-3 pl-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(lisp.id)}
                        onChange={() => toggleSelect(lisp.id)}
                        className="rounded border-outline-variant bg-surface checked:bg-primary-container"
                      />
                    </td>
                    <td className="py-3 text-on-surface">
                      <div className="flex items-center gap-2">
                        <span
                          className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        >
                          chevron_right
                        </span>
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          description
                        </span>
                        <span className="font-code-sm font-bold text-sm">
                          {lisp.originalName}
                        </span>
                        <span className="px-2 py-0.5 bg-surface-container rounded-full text-[10px] font-bold text-on-surface-variant ml-2">
                          {fileCommands.length} cmds
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-on-surface-variant text-sm">
                      {new Date(lisp.uploadedAt).toLocaleDateString()}
                    </td>
                  </tr>

                  {/* CHILD ROWS (COMMANDS) */}
                  {isExpanded &&
                    fileCommands.map((cmd) => {
                      return (
                        <tr
                          key={cmd.id}
                          className="border-b border-surface-container bg-surface-container-lowest hover:bg-surface-container transition-colors"
                        >
                          <td className="py-2 pl-4"></td>
                          <td colSpan="2" className="py-2 pr-4">
                            <div className="flex items-center gap-4 pl-10">
                              <span className="text-on-surface-variant/50">
                                └
                              </span>

                              {/* ICON DROPDOWN TRIGGER */}
                              <div className="relative">
                                <button
                                  className="w-8 h-8 bg-surface-container-highest border border-surface-variant rounded flex items-center justify-center text-primary-container hover:border-primary-container transition-colors"
                                  onClick={() =>
                                    setDropdownOpenFor(
                                      dropdownOpenFor === cmd.id
                                        ? null
                                        : cmd.id,
                                    )
                                  }
                                  title="Alterar Ícone"
                                >
                                  {cmd.svgIcon ? (
                                    cmd.svgIcon.startsWith("data:image") ? (
                                      <img
                                        src={cmd.svgIcon}
                                        alt="icon"
                                        className="w-full h-full object-contain p-1 rounded"
                                      />
                                    ) : (
                                      <div
                                        dangerouslySetInnerHTML={{
                                          __html: cmd.svgIcon,
                                        }}
                                        className="w-5 h-5 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                                      />
                                    )
                                  ) : (
                                    <span className="material-symbols-outlined text-[16px] opacity-50">
                                      image
                                    </span>
                                  )}
                                </button>

                                {/* DROPDOWN MENU */}
                                {dropdownOpenFor === cmd.id && (
                                  <div className="absolute top-10 left-0 w-48 bg-surface border border-outline-variant rounded-lg shadow-xl z-50 py-1">
                                    <label className="flex items-center gap-2 px-4 py-2 hover:bg-surface-container cursor-pointer text-sm text-on-surface-variant hover:text-on-surface">
                                      <span className="material-symbols-outlined text-[16px]">
                                        upload
                                      </span>{" "}
                                      Subir Arquivo (SVG/PNG/JPG)
                                      <input
                                        type="file"
                                        accept=".svg,.png,.jpg,.jpeg"
                                        className="hidden"
                                        onChange={(e) =>
                                          handleIconUpload(e, cmd.id)
                                        }
                                      />
                                    </label>
                                    <button
                                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-surface-container text-left text-sm text-on-surface-variant hover:text-on-surface"
                                      onClick={() => {
                                        setActiveCommandId(cmd.id);
                                        setShowFavoritesModal(true);
                                        setDropdownOpenFor(null);
                                      }}
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        star
                                      </span>{" "}
                                      Meus Favoritos
                                    </button>
                                    <button
                                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-surface-container text-left text-sm text-on-surface-variant hover:text-on-surface"
                                      onClick={() => {
                                        setActiveCommandId(cmd.id);
                                        setShowGalleryModal(true);
                                        setDropdownOpenFor(null);
                                      }}
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        storefront
                                      </span>{" "}
                                      Galeria Pública
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div
                                className="font-code-sm text-on-surface text-xs w-[120px] font-bold opacity-80 truncate"
                                title={cmd.commandName}
                              >
                                {cmd.commandName}
                              </div>

                              {/* FRIENDLY NAME & DESCRIPTION INPUTS */}
                              <BlurInput
                                className="flex-1 bg-transparent border-b border-transparent hover:border-outline focus:border-primary-container rounded-none text-on-surface text-sm px-1 py-1 focus:outline-none transition-colors"
                                value={cmd.friendlyName}
                                onSave={(val) =>
                                  handleCommandUpdate(
                                    cmd.id,
                                    "friendlyName",
                                    val,
                                  )
                                }
                                placeholder="Nome amigável na Paleta"
                              />

                              <BlurInput
                                className="flex-1 bg-transparent border-b border-transparent hover:border-outline focus:border-primary-container rounded-none text-on-surface text-sm px-1 py-1 focus:outline-none transition-colors ml-4"
                                value={cmd.description}
                                onSave={(val) =>
                                  handleCommandUpdate(
                                    cmd.id,
                                    "description",
                                    val,
                                  )
                                }
                                placeholder="Descrição do comando"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })}
            {tenantLisps.length === 0 && (
              <tr>
                <td
                  colSpan="3"
                  className="py-8 text-center text-on-surface-variant"
                >
                  Nenhum arquivo LISP carregado. Arraste arquivos aqui ou clique
                  no botão acima.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODALS PLACEHOLDERS */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-[600px] p-6 shadow-2xl">
            <h3 className="mt-0 mb-4 text-xl flex justify-between items-center">
              Galeria Pública de Íconos
              <button
                className="text-on-surface-variant hover:text-white"
                onClick={() => setShowGalleryModal(false)}
                aria-label="Fechar"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </h3>
            <div className="h-64 flex items-center justify-center border border-dashed border-[#262626] rounded text-on-surface-variant text-sm">
              [Galeria em desenvolvimento. Aqui aparecerão íconos públicos.]
            </div>
          </div>
        </div>
      )}

      {showFavoritesModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-[600px] p-6 shadow-2xl">
            <h3 className="mt-0 mb-4 text-xl flex justify-between items-center">
              Meus Íconos Favoritos
              <button
                className="text-on-surface-variant hover:text-white"
                onClick={() => setShowFavoritesModal(false)}
                aria-label="Fechar"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </h3>
            <div className="h-64 flex items-center justify-center border border-dashed border-[#262626] rounded text-on-surface-variant text-sm">
              [Aqui aparecerão os íconos salvos em "Minha Coleção".]
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
