import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { showToast } from "../Toast";
import { useDashboard } from "./DashboardContext";

export default function SuitesGroupsCard() {
  const {
    userData,
    suites,
    setSuites,
    groups,
    setGroups,
    commands,
    tenantLisps,
  } = useDashboard();

  // Files state (Left Pool)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [bulkAssignGroupId, setBulkAssignGroupId] = useState("");

  // Group Assignments
  const [groupAssignments, setGroupAssignments] = useState([]);
  const [draggedFileIds, setDraggedFileIds] = useState([]);

  // Modals state
  const [showSuiteModal, setShowSuiteModal] = useState(false);
  const [editSuiteData, setEditSuiteData] = useState({});
  const [editingGroupId, setEditingGroupId] = useState(null);

  const tenantSlug = userData?.id?.split("-").pop() || "user";

  // Load group assignments
  useEffect(() => {
    const loadAssignments = async () => {
      if (groups.length === 0) return;
      try {
        const groupIds = groups.map((g) => g.id);
        const chunks = [];
        for (let i = 0; i < groupIds.length; i += 10) {
          chunks.push(groupIds.slice(i, i + 10));
        }

        let allAssignments = [];
        for (const chunk of chunks) {
          const q = query(
            collection(db, "groupFiles"),
            where("groupId", "in", chunk),
          );
          const snap = await getDocs(q);
          allAssignments = [
            ...allAssignments,
            ...snap.docs.map((d) => ({ id: d.id, ...d.data() })),
          ];
        }
        setGroupAssignments(allAssignments);
      } catch (e) {
        console.warn("Could not load assignments", e);
      }
    };
    loadAssignments();
  }, [groups]);

  // --- SUITE LOGIC ---
  const handleAddSuite = () => {
    setEditSuiteData({
      name: "",
      description: "",
      visibility: "private",
      storeCategory: "",
      compatibility: "",
      supportedVersions: "",
      authorName: userData.name || "",
      price: 0,
      isNew: true,
    });
    setShowSuiteModal(true);
  };

  const handleEditSuite = (suite) => {
    setEditSuiteData({ ...suite, isNew: false });
    setShowSuiteModal(true);
  };

  const handleSaveSuite = async () => {
    if (!editSuiteData.name) return;
    try {
      const suiteId = editSuiteData.isNew
        ? `SUITE-${tenantSlug}-${editSuiteData.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}-${Date.now()}`
        : editSuiteData.id;

      const suiteGroups = groups.filter((g) => g.suiteId === suiteId);
      let cmdCount = 0;
      suiteGroups.forEach((g) => {
        cmdCount += groupAssignments.filter((a) => a.groupId === g.id).length;
      });

      const suiteMeta = {
        tenantId: userData.id,
        name: editSuiteData.name,
        description: editSuiteData.description || "",
        visibility: editSuiteData.visibility,
        storeCategory: editSuiteData.storeCategory || "",
        compatibility: editSuiteData.compatibility || "",
        supportedVersions: editSuiteData.supportedVersions || "",
        authorName: editSuiteData.authorName || "",
        price: Number(editSuiteData.price) || 0,
        sortOrder: editSuiteData.sortOrder || 0,
        commandCount: cmdCount,
      };

      if (editSuiteData.visibility === "link" && !editSuiteData.shareToken) {
        suiteMeta.shareToken = Math.random().toString(36).substring(2, 15);
      } else if (editSuiteData.visibility === "link") {
        suiteMeta.shareToken = editSuiteData.shareToken;
      }

      await setDoc(doc(db, "suites", suiteId), suiteMeta, { merge: true });

      if (editSuiteData.isNew)
        setSuites([...suites, { id: suiteId, ...suiteMeta }]);
      else
        setSuites(
          suites.map((s) => (s.id === suiteId ? { ...s, ...suiteMeta } : s)),
        );

      setShowSuiteModal(false);
      showToast("Suite salva.", "success");
    } catch (e) {
      showToast("Erro ao salvar suite.", "error");
    }
  };

  const handleDeleteSuite = async (id) => {
    if (!confirm("Excluir esta Suite e todos os seus Grupos?")) return;
    try {
      await deleteDoc(doc(db, "suites", id));
      setSuites(suites.filter((s) => s.id !== id));
      showToast("Suite excluída.", "success");
    } catch (e) {
      showToast("Erro ao excluir.", "error");
    }
  };

  const handleUpdateSuiteVisibility = async (suiteId, visibility) => {
    try {
      const updates = { visibility };
      if (visibility === "link") {
        const currentSuite = suites.find((s) => s.id === suiteId);
        if (!currentSuite.shareToken) {
          updates.shareToken = Math.random().toString(36).substring(2, 15);
        }
      }
      await updateDoc(doc(db, "suites", suiteId), updates);
      setSuites(
        suites.map((s) => (s.id === suiteId ? { ...s, ...updates } : s)),
      );
    } catch (e) {
      showToast("Erro.", "error");
    }
  };

  // --- GROUP LOGIC ---
  const handleAddGroup = async (suiteId) => {
    try {
      const newId = `GRP-${tenantSlug}-${Date.now()}`;
      const newGroup = {
        tenantId: userData.id,
        suiteId,
        name: "Novo Grupo",
        description: "",
        sortOrder: groups.filter((g) => g.suiteId === suiteId).length,
      };
      await setDoc(doc(db, "groups", newId), newGroup);
      setGroups([...groups, { id: newId, ...newGroup }]);
      setEditingGroupId(newId);
    } catch (e) {
      showToast("Erro ao criar grupo.", "error");
    }
  };

  const handleUpdateGroup = async (groupId, field, value) => {
    try {
      await updateDoc(doc(db, "groups", groupId), { [field]: value });
      setGroups(
        groups.map((g) => (g.id === groupId ? { ...g, [field]: value } : g)),
      );
    } catch (e) {
      showToast("Erro.", "error");
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!confirm("Excluir este Grupo?")) return;
    try {
      await deleteDoc(doc(db, "groups", id));
      setGroups(groups.filter((g) => g.id !== id));
      showToast("Grupo excluído.", "success");
    } catch (e) {
      showToast("Erro.", "error");
    }
  };

  // --- DRAG & DROP LOGIC ---
  const handleDragStart = (e, fileId) => {
    let idsToDrag = [fileId];
    if (selectedFileIds.includes(fileId)) {
      idsToDrag = [...selectedFileIds];
    }

    setDraggedFileIds(idsToDrag);
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData("text/plain", JSON.stringify(idsToDrag));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = async (e, groupId) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    let fileIds = [];
    try {
      fileIds = JSON.parse(data);
    } catch (err) {
      return;
    }

    assignFilesToGroup(fileIds, groupId);
  };

  const handleDropOnSuite = async (e, suiteId) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    let fileIds = [];
    try {
      fileIds = JSON.parse(data);
    } catch (err) {
      return;
    }

    let targetGroup = groups.find(
      (g) => g.suiteId === suiteId && g.name === "General",
    );
    if (!targetGroup) {
      targetGroup = groups.find((g) => g.suiteId === suiteId);
    }

    let groupId;
    if (!targetGroup) {
      groupId = `GRP-${tenantSlug}-${Date.now()}`;
      const newGroup = {
        tenantId: userData.id,
        suiteId,
        name: "General",
        description: "",
        sortOrder: 0,
      };
      await setDoc(doc(db, "groups", groupId), newGroup);
      setGroups((prev) => [...prev, { id: groupId, ...newGroup }]);
    } else {
      groupId = targetGroup.id;
    }

    assignFilesToGroup(fileIds, groupId);
  };

  const assignFilesToGroup = async (fileIds, groupId) => {
    if (fileIds.length === 0 || !groupId) return;
    try {
      let count = 0;
      let newAssignments = [];
      for (const fileId of fileIds) {
        if (
          !groupAssignments.find(
            (a) => a.groupId === groupId && a.fileId === fileId,
          )
        ) {
          const gfileId = `GFILE-${groupId}-${fileId}`;
          const assignment = { groupId, fileId, sortOrder: 0 };
          await setDoc(doc(db, "groupFiles", gfileId), assignment);
          newAssignments.push({ id: gfileId, ...assignment });
          count++;
        }
      }
      setGroupAssignments([...groupAssignments, ...newAssignments]);
      if (count > 0) showToast(`${count} arquivos atribuídos!`, "success");
      setSelectedFileIds([]);
      setBulkAssignGroupId("");
    } catch (err) {
      showToast("Erro ao atribuir arquivos.", "error");
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await deleteDoc(doc(db, "groupFiles", assignmentId));
      setGroupAssignments(
        groupAssignments.filter((a) => a.id !== assignmentId),
      );
    } catch (err) {
      showToast("Erro ao remover arquivo.", "error");
    }
  };

  const filteredFiles = tenantLisps.filter((f) =>
    f.originalName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleSelectAllFiles = (e) => {
    if (e.target.checked) setSelectedFileIds(filteredFiles.map((f) => f.id));
    else setSelectedFileIds([]);
  };

  const toggleSelectFile = (id) => {
    if (selectedFileIds.includes(id))
      setSelectedFileIds(selectedFileIds.filter((i) => i !== id));
    else setSelectedFileIds([...selectedFileIds, id]);
  };

  return (
    <div className="tab-enter">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[85vh]">
        {/* PANEL 1: FILES POOL (LEFT) */}
        <div className="flex flex-col h-full bg-surface border border-outline-variant rounded-md overflow-hidden">
          <div className="p-3 border-b border-outline-variant bg-surface-container-low flex flex-col gap-2">
            <h3 className="m-0 text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                description
              </span>{" "}
              Pool de Arquivos
            </h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar archivo LSP..."
                className="w-full bg-surface border border-outline-variant rounded text-xs text-on-surface py-1.5 pl-8 pr-3 focus:outline-none focus:border-primary-container"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* BULK ASSIGN ACTION */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                onChange={toggleSelectAllFiles}
                checked={
                  filteredFiles.length > 0 &&
                  selectedFileIds.length === filteredFiles.length
                }
                className="rounded border-outline-variant bg-surface"
                title="Selecionar Todos"
              />
              {selectedFileIds.length > 0 && (
                <div className="flex flex-1 gap-1">
                  <select
                    className="flex-1 bg-surface border border-outline-variant rounded text-on-surface text-xs py-1 px-1 focus:border-primary-container"
                    value={bulkAssignGroupId}
                    onChange={(e) => setBulkAssignGroupId(e.target.value)}
                  >
                    <option value="">
                      Atribuir {selectedFileIds.length} a...
                    </option>
                    {suites.map((s) => (
                      <optgroup key={s.id} label={s.name}>
                        {groups
                          .filter((g) => g.suiteId === s.id)
                          .map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  <button
                    className="bg-primary-container text-white px-2 py-1 rounded text-xs font-bold"
                    onClick={() =>
                      assignFilesToGroup(selectedFileIds, bulkAssignGroupId)
                    }
                    disabled={!bulkAssignGroupId}
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <tbody>
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td className="py-4 text-center text-xs text-on-surface-variant">
                      Nenhum arquivo encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file) => {
                    const fileCommands = commands.filter(
                      (c) => c.lispFileId === file.id,
                    );
                    return (
                      <tr
                        key={file.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, file.id)}
                        className={`border-b border-outline-variant hover:bg-surface-container cursor-grab active:cursor-grabbing transition-colors ${selectedFileIds.includes(file.id) ? "bg-surface-container-high" : ""}`}
                      >
                        <td
                          className="py-2 pl-3 w-[30px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFileIds.includes(file.id)}
                            onChange={() => toggleSelectFile(file.id)}
                            className="rounded border-outline-variant bg-surface"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[20px] text-secondary">
                              description
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-on-surface truncate">
                                {file.originalName}
                              </div>
                              <div className="text-[10px] text-on-surface-variant truncate">
                                {fileCommands.length} comandos internos
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-[14px] text-on-surface-variant opacity-30 cursor-grab">
                              drag_indicator
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL 2: SUITES & GROUPS TREE (RIGHT) */}
        <div className="md:col-span-2 flex flex-col h-full bg-surface border border-outline-variant rounded-md overflow-hidden">
          <div className="p-3 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
            <h3 className="m-0 text-sm font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                account_tree
              </span>{" "}
              Árvore de Suites & Grupos
            </h3>
            <button
              className="btn bg-primary-container text-white text-xs py-1.5 px-3 flex items-center gap-1 font-bold"
              onClick={handleAddSuite}
            >
              <span className="material-symbols-outlined text-[16px]">add</span>{" "}
              Nova Suite
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <tbody>
                {suites.length === 0 && (
                  <tr>
                    <td className="py-8 text-center text-xs text-on-surface-variant">
                      Nenhuma Suite criada.
                    </td>
                  </tr>
                )}

                {suites.map((suite) => {
                  const suiteGroups = groups.filter(
                    (g) => g.suiteId === suite.id,
                  );
                  return (
                    <React.Fragment key={suite.id}>
                      {/* SUITE ROW */}
                      <tr
                        className="border-b border-outline-variant bg-surface-container-low hover:bg-surface-container-high transition-colors group/suite"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnSuite(e, suite.id)}
                        title="Arrastra comandos aquí para añadirlos a esta Suite (se agruparán en General)"
                      >
                        <td className="py-2 pl-3 pr-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[18px] text-primary-container">
                                folder_open
                              </span>
                              <div>
                                <div className="font-bold text-on-surface text-sm">
                                  {suite.name}
                                </div>
                                {suite.description && (
                                  <div className="text-xs text-on-surface-variant mt-0.5">
                                    {suite.description}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <select
                                className="bg-surface border border-outline-variant rounded text-on-surface-variant text-[11px] py-1 px-1 focus:border-primary-container"
                                value={suite.visibility}
                                onChange={(e) =>
                                  handleUpdateSuiteVisibility(
                                    suite.id,
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="private">🔒 Privado</option>
                                <option value="link">🔗 Link</option>
                                <option value="store">🏪 Store</option>
                              </select>

                              <div className="flex gap-1 opacity-0 group-hover/suite:opacity-100 transition-opacity">
                                <button
                                  className="w-6 h-6 rounded text-on-surface-variant hover:text-white hover:bg-surface-container-highest flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                                  title="Editar Suite"
                                  aria-label="Editar Suite"
                                  onClick={() => handleEditSuite(suite)}
                                >
                                  <span
                                    className="material-symbols-outlined text-[14px]"
                                    aria-hidden="true"
                                  >
                                    edit
                                  </span>
                                </button>
                                <button
                                  className="w-6 h-6 rounded text-on-surface-variant hover:text-white hover:bg-surface-container-highest flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                                  title="Adicionar Grupo"
                                  aria-label="Adicionar Grupo"
                                  onClick={() => handleAddGroup(suite.id)}
                                >
                                  <span
                                    className="material-symbols-outlined text-[14px]"
                                    aria-hidden="true"
                                  >
                                    create_new_folder
                                  </span>
                                </button>
                                <button
                                  className="w-6 h-6 rounded text-on-surface-variant hover:text-error hover:bg-error/10 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
                                  title="Excluir Suite"
                                  aria-label="Excluir Suite"
                                  onClick={() => handleDeleteSuite(suite.id)}
                                >
                                  <span
                                    className="material-symbols-outlined text-[14px]"
                                    aria-hidden="true"
                                  >
                                    delete
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* GROUPS (DROPZONES) */}
                      {suiteGroups.map((group) => {
                        const groupCmdAssignments = groupAssignments.filter(
                          (a) => a.groupId === group.id,
                        );
                        return (
                          <tr
                            key={group.id}
                            className="border-b border-outline-variant bg-surface hover:bg-surface-container transition-colors group/dropzone"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, group.id)}
                          >
                            <td className="py-2 pl-8 pr-2">
                              <div className="flex items-start gap-2">
                                <span className="text-on-surface-variant">
                                  └
                                </span>
                                <div className="flex-1">
                                  <div className="flex justify-between items-center mb-1">
                                    {editingGroupId === group.id ? (
                                      <input
                                        autoFocus
                                        type="text"
                                        className="bg-surface border border-primary-container rounded text-on-surface font-bold text-xs px-2 py-0.5 focus:outline-none"
                                        value={group.name}
                                        onChange={(e) =>
                                          handleUpdateGroup(
                                            group.id,
                                            "name",
                                            e.target.value,
                                          )
                                        }
                                        onBlur={() => setEditingGroupId(null)}
                                        onKeyDown={(e) =>
                                          e.key === "Enter" &&
                                          setEditingGroupId(null)
                                        }
                                      />
                                    ) : (
                                      <div
                                        className="font-bold text-on-surface text-xs cursor-text hover:text-primary-container transition-colors"
                                        onClick={() =>
                                          setEditingGroupId(group.id)
                                        }
                                      >
                                        {group.name}
                                      </div>
                                    )}
                                    <button
                                      className="w-5 h-5 rounded text-on-surface-variant hover:text-error hover:bg-error/10 flex items-center justify-center opacity-0 group-hover/dropzone:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
                                      onClick={() =>
                                        handleDeleteGroup(group.id)
                                      }
                                      title="Excluir Grupo"
                                      aria-label="Excluir Grupo"
                                    >
                                      <span
                                        className="material-symbols-outlined text-[14px]"
                                        aria-hidden="true"
                                      >
                                        delete
                                      </span>
                                    </button>
                                  </div>

                                  {/* DROPZONE AREA */}
                                  <div className="min-h-[40px] flex flex-wrap gap-1.5 p-1.5 bg-surface-container-lowest border border-dashed border-outline-variant rounded relative">
                                    {groupCmdAssignments.length === 0 && (
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="text-[10px] text-on-surface-variant/50">
                                          Solte arquivos LISP aqui
                                        </div>
                                      </div>
                                    )}
                                    {groupCmdAssignments.map((assignment) => {
                                      const file = tenantLisps.find(
                                        (c) => c.id === assignment.fileId,
                                      );
                                      if (!file) return null;
                                      return (
                                        <div
                                          key={assignment.id}
                                          className="bg-surface-container-high border border-outline-variant rounded-full flex items-center gap-1.5 pr-1.5 h-6 group/chip shadow-sm relative z-10 hover:bg-surface-container-highest transition-colors cursor-default"
                                        >
                                          <div className="w-6 h-6 flex items-center justify-center bg-surface-container-highest rounded-l-full border-r border-outline-variant">
                                            <span className="material-symbols-outlined text-[12px] opacity-80 text-secondary">
                                              description
                                            </span>
                                          </div>
                                          <span className="text-[10px] font-bold text-on-surface max-w-[120px] truncate">
                                            {file.originalName}
                                          </span>
                                          <button
                                            className="w-3.5 h-3.5 flex items-center justify-center text-on-surface-variant hover:text-error opacity-0 group-hover/chip:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
                                            onClick={() =>
                                              handleRemoveAssignment(
                                                assignment.id,
                                              )
                                            }
                                            aria-label="Remover arquivo"
                                          >
                                            <span
                                              className="material-symbols-outlined text-[10px]"
                                              aria-hidden="true"
                                            >
                                              close
                                            </span>
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SUITE MODAL */}
      {showSuiteModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl w-full max-w-[500px] p-6 shadow-2xl">
            <h3 className="mt-0 mb-4 text-xl text-on-surface">
              {editSuiteData.isNew ? "Criar Nova Suite" : "Editar Suite"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-1">
                  Nome da Suite
                </label>
                <input
                  type="text"
                  className="w-full bg-surface border border-outline-variant rounded p-2 text-on-surface"
                  value={editSuiteData.name}
                  onChange={(e) =>
                    setEditSuiteData({ ...editSuiteData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-1">
                  Descrição
                </label>
                <textarea
                  className="w-full bg-surface border border-outline-variant rounded p-2 text-on-surface resize-none h-20"
                  value={editSuiteData.description}
                  onChange={(e) =>
                    setEditSuiteData({
                      ...editSuiteData,
                      description: e.target.value,
                    })
                  }
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-2">
                  Visibilidade
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer text-on-surface">
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={editSuiteData.visibility === "private"}
                      onChange={() =>
                        setEditSuiteData({
                          ...editSuiteData,
                          visibility: "private",
                        })
                      }
                    />{" "}
                    Privado
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer text-on-surface">
                    <input
                      type="radio"
                      name="visibility"
                      value="link"
                      checked={editSuiteData.visibility === "link"}
                      onChange={() =>
                        setEditSuiteData({
                          ...editSuiteData,
                          visibility: "link",
                        })
                      }
                    />{" "}
                    Link (Oculto)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer text-on-surface">
                    <input
                      type="radio"
                      name="visibility"
                      value="store"
                      checked={editSuiteData.visibility === "store"}
                      onChange={() =>
                        setEditSuiteData({
                          ...editSuiteData,
                          visibility: "store",
                        })
                      }
                    />{" "}
                    Public Store
                  </label>
                </div>
              </div>

              {editSuiteData.visibility === "store" && (
                <div className="p-4 bg-primary-container/10 border border-primary-container/30 rounded space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-primary-container mb-1">
                        Categoría
                      </label>
                      <input
                        list="store-categories"
                        className="w-full bg-surface border border-outline-variant rounded p-2 text-on-surface text-sm focus:border-primary-container focus:outline-none"
                        value={editSuiteData.storeCategory}
                        onChange={(e) =>
                          setEditSuiteData({
                            ...editSuiteData,
                            storeCategory: e.target.value,
                          })
                        }
                        placeholder="Seleccione o escriba una nueva..."
                      />
                      <datalist id="store-categories">
                        <option value="Arquitectura" />
                        <option value="Ingeniería Civil" />
                        <option value="Topografía y Cartografía" />
                        <option value="Estructuras" />
                        <option value="Instalaciones (MEP)" />
                        <option value="Productividad y Dibujo" />
                        <option value="Cantidades y Presupuestos" />
                        <option value="Urbanismo y Paisajismo" />
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-primary-container mb-1">
                        Plataforma
                      </label>
                      <select
                        className="w-full bg-surface border border-outline-variant rounded p-2 text-on-surface text-sm"
                        value={editSuiteData.compatibility}
                        onChange={(e) =>
                          setEditSuiteData({
                            ...editSuiteData,
                            compatibility: e.target.value,
                          })
                        }
                      >
                        <option value="">Selecione...</option>
                        <option value="universal">
                          Universal (Cualquier CAD)
                        </option>
                        <option value="autocad">AutoCAD Clásico</option>
                        <option value="civil3d">Civil 3D</option>
                        <option value="autocad_vertical">
                          AutoCAD Architecture / MEP
                        </option>
                        <option value="bricscad">BricsCAD</option>
                        <option value="zwcad">ZWCAD</option>
                        <option value="gstarcad">GstarCAD</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-primary-container mb-1">
                        Versiones Soportadas
                      </label>
                      <select
                        className="w-full bg-surface border border-outline-variant rounded p-2 text-on-surface text-sm"
                        value={editSuiteData.supportedVersions}
                        onChange={(e) =>
                          setEditSuiteData({
                            ...editSuiteData,
                            supportedVersions: e.target.value,
                          })
                        }
                      >
                        <option value="">Selecione...</option>
                        <option value="all">Todas las Versiones</option>
                        <option value="2025+">2025 o superior</option>
                        <option value="2021-2024">2021 - 2024</option>
                        <option value="2018-2020">2018 - 2020</option>
                        <option value="2013-2017">2013 - 2017</option>
                        <option value="legacy">Legacy (2012 o anterior)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-primary-container mb-1">
                        Preço (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full bg-surface border border-outline-variant rounded p-2 text-on-surface text-sm"
                        value={
                          editSuiteData.price !== undefined
                            ? editSuiteData.price
                            : 0
                        }
                        onChange={(e) =>
                          setEditSuiteData({
                            ...editSuiteData,
                            price: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-primary-container mb-1">
                      Autor / Empresa
                    </label>
                    <input
                      type="text"
                      className="w-full bg-surface border border-outline-variant rounded p-2 text-on-surface text-sm"
                      value={editSuiteData.authorName}
                      onChange={(e) =>
                        setEditSuiteData({
                          ...editSuiteData,
                          authorName: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 text-sm text-on-surface-variant hover:text-white"
                onClick={() => setShowSuiteModal(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 text-sm bg-primary-container text-white font-bold rounded hover:bg-[#e66000]"
                onClick={handleSaveSuite}
              >
                Salvar Suite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
