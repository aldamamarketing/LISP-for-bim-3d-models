import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, deleteObject } from 'firebase/storage';
import { showToast } from '../Toast';
import { useTranslation } from '../../i18n/useTranslation';
import { useDashboard } from './DashboardContext';

export default function LispManagerTab() {
  const { t } = useTranslation();
  const { 
    userData, 
    tenantLisps, setTenantLisps, 
    draftLisps, setDraftLisps, 
    isUploading, setIsUploading 
  } = useDashboard();

  const [editingLispId, setEditingLispId] = useState(null);
  const [editLispData, setEditLispData] = useState({});

  const uniqueSuites = [...new Set([...tenantLisps.map(l => l.suite), ...draftLisps.map(d => d.suite)])].filter(Boolean);
  const uniqueGroups = [...new Set([...tenantLisps.map(l => l.group), ...draftLisps.map(d => d.group)])].filter(Boolean);

  const sortedLisps = [...tenantLisps].sort((a, b) => {
    const suiteComp = (a.suite || '').localeCompare(b.suite || '');
    if (suiteComp !== 0) return suiteComp;
    const groupComp = (a.group || '').localeCompare(b.group || '');
    if (groupComp !== 0) return groupComp;
    return (a.friendlyName || '').localeCompare(b.friendlyName || '');
  });

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.lsp'));
    if (files.length === 0) return;
    
    const newDrafts = files.map(file => ({
      fileObj: file,
      originalName: file.name,
      lispId: file.name.replace('.lsp', '').replace(/[^a-zA-Z0-9_-]/g, '_'),
      friendlyName: file.name.replace('.lsp', ''),
      suite: 'core',
      group: 'Custom Tools',
      svgIcon: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 13l-3-3 3-3M11 13l3-3-3-3M8 4l-2 8"/></svg>'
    }));
    
    setDraftLisps([...draftLisps, ...newDrafts]);
  };

  const handleSvgUpload = (e, index, isDraft) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const svgCode = ev.target.result;
      if (isDraft) {
        updateDraft(index, 'svgIcon', svgCode);
      } else {
        setEditLispData({ ...editLispData, svgIcon: svgCode });
      }
    };
    reader.readAsText(file);
  };

  const updateDraft = (index, field, value) => {
    const updated = [...draftLisps];
    updated[index][field] = value;
    setDraftLisps(updated);
  };

  const removeDraft = (index) => {
    setDraftLisps(draftLisps.filter((_, i) => i !== index));
  };

  const submitAllDrafts = async () => {
    if (draftLisps.length === 0) return;
    setIsUploading(true);
    
    try {
      const { storage } = await import('../../firebase');
      const newUploaded = [];

      for (const draft of draftLisps) {
        const storagePath = `tenants/${userData.id}/lisps/${draft.originalName}`;
        const fileRef = ref(storage, storagePath);
        
        await uploadBytes(fileRef, draft.fileObj);
        
        const fileMeta = {
          lispId: draft.lispId,
          tenantId: userData.id,
          originalName: draft.originalName,
          storagePath: storagePath,
          friendlyName: draft.friendlyName,
          description: draft.friendlyName,
          group: draft.group,
          suite: draft.suite,
          svgIcon: draft.svgIcon,
          uploadedAt: new Date().toISOString()
        };
        
        const semanticId = `lisp_${userData.id}_${draft.lispId}`;
        await setDoc(doc(db, 'lispFiles', semanticId), fileMeta);
        newUploaded.push({ id: semanticId, ...fileMeta });
      }
      
      setTenantLisps([...tenantLisps, ...newUploaded]);
      setDraftLisps([]);
      showToast('Upload concluído com sucesso!', 'success');
    } catch(err) {
      console.error(err);
      showToast('Erro durante o upload.', 'error');
    }
    setIsUploading(false);
  };

  const handleEditClick = (lisp) => {
    setEditingLispId(lisp.id);
    setEditLispData({ ...lisp });
  };

  const handleCancelEdit = () => {
    setEditingLispId(null);
    setEditLispData({});
  };

  const handleSaveEdit = async () => {
    if (!editingLispId) return;
    try {
      const { id, originalName, storagePath, tenantId, lispId, uploadedAt, ...updatableFields } = editLispData;
      await updateDoc(doc(db, 'lispFiles', editingLispId), updatableFields);
      
      setTenantLisps(tenantLisps.map(l => l.id === editingLispId ? { ...l, ...updatableFields } : l));
      setEditingLispId(null);
    } catch(e) {
      console.error('Erro ao salvar', e);
      showToast('Erro ao salvar as edições.', 'error');
    }
  };

  const handleDeleteLisp = async (lisp) => {
    if(!confirm(`Excluir '${lisp.originalName}' permanentemente?`)) return;
    try {
      const { storage } = await import('../../firebase');
      await deleteObject(ref(storage, lisp.storagePath)).catch(e => console.warn(e));
      await deleteDoc(doc(db, 'lispFiles', lisp.id));
      setTenantLisps(tenantLisps.filter(l => l.id !== lisp.id));
    } catch(err) { showToast('Erro ao excluir.', 'error'); }
  };

  return (
    <div className="tab-enter card" style={{ marginBottom: '20px', overflowX: 'auto' }}>
      <h3 style={{ marginTop: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {t('dashboard.lisp.workspace')}
        <div>
          <input type="file" multiple accept=".lsp" id="bulkUpload" style={{ display: 'none' }} onChange={handleFileSelect} />
          <button className="btn" onClick={() => document.getElementById('bulkUpload').click()} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
            {t('dashboard.lisp.addLisps')}
          </button>
        </div>
      </h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 0 }}>
        {t('dashboard.lisp.desc')}
      </p>

      {/* Datalists for Autocomplete */}
      <datalist id="suite-list">
        <option value="core" />
        <option value="structures_pro" />
        <option value="architecture" />
        {uniqueSuites.map(s => <option key={s} value={s} />)}
      </datalist>
      <datalist id="group-list">
        <option value="Custom Tools" />
        {uniqueGroups.map(g => <option key={g} value={g} />)}
      </datalist>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#262626] text-label-md font-label-md text-on-secondary-container">
            <th className="pb-3 pl-4 font-normal w-[90px]">Ícone SVG</th>
            <th className="pb-3 font-normal w-[250px]">Arquivo / Amigável</th>
            <th className="pb-3 font-normal w-[130px]">Suite</th>
            <th className="pb-3 font-normal w-[130px]">Grupo</th>
            <th className="pb-3 pr-4 text-right font-normal w-[150px]">Ações</th>
          </tr>
        </thead>
        <tbody>
          
          {/* DRAFTS SECTION */}
          {draftLisps.map((draft, i) => (
            <tr key={'draft-'+i} className="border-b border-[#262626] bg-primary-container/5 hover:bg-[#1a1c1c] transition-colors group">
              <td className="py-4 pl-4">
                <div className="flex gap-2 items-center">
                  <div className="w-8 h-8 bg-white/5 rounded flex items-center justify-center text-primary-container" dangerouslySetInnerHTML={{ __html: draft.svgIcon || '' }} />
                  <input type="file" accept=".svg" id={`svg-upload-draft-${i}`} className="hidden" onChange={(e) => handleSvgUpload(e, i, true)} />
                  <button className="text-on-secondary-container hover:text-primary transition-colors" onClick={() => document.getElementById(`svg-upload-draft-${i}`).click()} title="Upload SVG"><span className="material-symbols-outlined text-[18px]">folder_open</span></button>
                </div>
                <input type="text" value={draft.svgIcon} onChange={e => updateDraft(i, 'svgIcon', e.target.value)} className="w-full mt-2 bg-[#0A0A0A] border border-[#262626] rounded text-[#888] text-[10px] p-1 font-mono" placeholder="<svg..." />
              </td>
              <td className="py-4 text-white">
                <div className="flex flex-col gap-1 pr-2">
                  <span className="font-bold font-code-sm text-code-sm">{draft.originalName}</span>
                  <input type="text" value={draft.friendlyName} onChange={e => updateDraft(i, 'friendlyName', e.target.value)} className="w-full bg-[#141414] border border-primary-container/30 rounded text-white text-sm p-1.5 focus:border-primary-container focus:outline-none" placeholder="Nome amigável" />
                </div>
              </td>
              <td className="py-4 pr-2">
                <input list="suite-list" value={draft.suite} onChange={e => updateDraft(i, 'suite', e.target.value)} className="w-full bg-[#141414] border border-[#262626] rounded text-white text-sm p-1.5 focus:border-primary-container focus:outline-none" />
              </td>
              <td className="py-4 pr-2">
                <input list="group-list" value={draft.group} onChange={e => updateDraft(i, 'group', e.target.value)} className="w-full bg-[#141414] border border-[#262626] rounded text-white text-sm p-1.5 focus:border-primary-container focus:outline-none" />
              </td>
              <td className="py-4 pr-4 text-right">
                <span className="text-[11px] text-primary-container block mb-1">{t('dashboard.lisp.awaitingUpload')}</span>
                <button className="text-on-secondary-container hover:text-error transition-colors" onClick={() => removeDraft(i)}><span className="material-symbols-outlined text-[18px]">delete</span></button>
              </td>
            </tr>
          ))}
          
          {/* EXISTING LISPS SECTION */}
          {sortedLisps.map(lisp => {
            const isEditing = editingLispId === lisp.id;
            
            if (isEditing) {
              return (
                <tr key={lisp.id} className="border-b border-[#262626] bg-white/5 hover:bg-[#1a1c1c] transition-colors group">
                  <td className="py-4 pl-4">
                    <div className="flex gap-2 items-center">
                      <div className="w-8 h-8 bg-white/5 rounded flex items-center justify-center text-primary-container" dangerouslySetInnerHTML={{ __html: editLispData.svgIcon || '' }} />
                      <input type="file" accept=".svg" id={`svg-upload-edit-${lisp.id}`} className="hidden" onChange={(e) => handleSvgUpload(e, null, false)} />
                      <button className="text-on-secondary-container hover:text-primary transition-colors" onClick={() => document.getElementById(`svg-upload-edit-${lisp.id}`).click()} title="Upload SVG"><span className="material-symbols-outlined text-[18px]">folder_open</span></button>
                    </div>
                    <input type="text" value={editLispData.svgIcon} onChange={e => setEditLispData({...editLispData, svgIcon: e.target.value})} className="w-full mt-2 bg-[#0A0A0A] border border-primary-container/50 rounded text-[#888] text-[10px] p-1 font-mono" placeholder="<svg..." />
                  </td>
                  <td className="py-4 text-white">
                    <div className="flex flex-col gap-1 pr-2">
                      <span className="font-bold font-code-sm text-code-sm">{lisp.originalName}</span>
                      <input type="text" value={editLispData.friendlyName} onChange={e => setEditLispData({...editLispData, friendlyName: e.target.value})} className="w-full bg-[#141414] border border-primary-container/50 rounded text-white text-sm p-1.5 focus:border-primary-container focus:outline-none" placeholder="Nome amigável" />
                    </div>
                  </td>
                  <td className="py-4 pr-2">
                    <input list="suite-list" value={editLispData.suite} onChange={e => setEditLispData({...editLispData, suite: e.target.value})} className="w-full bg-[#141414] border border-primary-container/50 rounded text-white text-sm p-1.5 focus:border-primary-container focus:outline-none" />
                  </td>
                  <td className="py-4 pr-2">
                    <input list="group-list" value={editLispData.group} onChange={e => setEditLispData({...editLispData, group: e.target.value})} className="w-full bg-[#141414] border border-primary-container/50 rounded text-white text-sm p-1.5 focus:border-primary-container focus:outline-none" />
                  </td>
                  <td className="py-4 pr-4 text-right">
                    <button className="bg-primary-container text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-[#e66000] transition-colors mb-1 shadow-sm w-full" onClick={handleSaveEdit}>Salvar</button>
                    <button className="bg-transparent border border-[#262626] text-on-secondary-container hover:text-white px-3 py-1.5 rounded text-xs transition-colors w-full" onClick={handleCancelEdit}>Cancelar</button>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={lisp.id} className="border-b border-[#262626] hover:bg-[#1a1c1c] transition-colors group">
                <td className="py-4 pl-4">
                  <div className="w-8 h-8 bg-surface-container-highest border border-surface-variant rounded flex items-center justify-center text-primary-container" dangerouslySetInnerHTML={{ __html: lisp.svgIcon || '' }} />
                </td>
                <td className="py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-white font-code-sm text-code-sm">{lisp.originalName}</span>
                    <span className="text-on-surface-variant text-sm">{lisp.friendlyName}</span>
                  </div>
                </td>
                <td className="py-4">
                  <span className="px-2.5 py-1 bg-[#1a1c1c] border border-[#343535] rounded text-xs font-mono text-secondary">{lisp.suite || '-'}</span>
                </td>
                <td className="py-4">
                  <span className="px-2.5 py-1 bg-[#1a1c1c] border border-[#343535] rounded text-xs font-mono text-secondary">{lisp.group || '-'}</span>
                </td>
                <td className="py-4 pr-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-8 h-8 flex items-center justify-center rounded border border-[#262626] text-on-secondary-container hover:text-white hover:border-primary-container transition-colors" onClick={() => handleEditClick(lisp)} title="Editar"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                    <button className="w-8 h-8 flex items-center justify-center rounded border border-[#262626] text-on-secondary-container hover:text-error hover:border-error/50 transition-colors" onClick={() => handleDeleteLisp(lisp)} title="Excluir"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {draftLisps.length > 0 && (
        <div className="mt-4 p-4 bg-[#1a1c1c] border border-[#262626] rounded flex justify-between items-center sticky bottom-0">
          <span className="font-bold text-sm text-on-surface-variant">{draftLisps.length} {t('dashboard.lisp.readyForUpload')}</span>
          <button className="bg-primary-container text-white px-4 py-2 rounded text-sm font-bold hover:bg-[#e66000] transition-colors" onClick={submitAllDrafts} disabled={isUploading}>
            {isUploading ? t('dashboard.lisp.uploading') : t('dashboard.lisp.confirmUpload')}
          </button>
        </div>
      )}
    </div>
  );
}
