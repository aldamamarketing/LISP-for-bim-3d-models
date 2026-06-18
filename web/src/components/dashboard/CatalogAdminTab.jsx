import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import HatchPreview from '../tools/HatchPreview';
import LinetypePreview from '../tools/LinetypePreview';
import HatchVisualEditor from './HatchVisualEditor';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';

// Solo el admin puede ver y usar este panel
const ADMIN_EMAIL = 'aldamadaniel1984@gmail.com';

const HATCH_CATEGORIES = ['Architecture', 'Topography', 'Materials', 'Engineering', 'Decoration', 'General'];
const LIN_CATEGORIES   = ['Architecture', 'Engineering', 'Topography', 'Utilities', 'General'];

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'Architecture',
  code: '',
};

export default function CatalogAdminTab() {
  const [activeType, setActiveType] = useState('hatch');
  const [assets, setAssets]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ ...EMPTY_FORM, category: 'Architecture' });
  const [previewCode, setPreviewCode] = useState('');
  const [editorData, setEditorData] = useState(null); // { dataUrl, scale, panX, panY }
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  // Verificar acceso admin
  const isAdmin = auth.currentUser?.email === ADMIN_EMAIL;

  // Cargar assets existentes del tipo activo
  const fetchAssets = async () => {
    setLoading(true);
    try {
      const q    = query(
        collection(db, 'publicAssets'),
        where('type', '==', activeType),
        orderBy('category')
      );
      const snap = await getDocs(q);
      setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('fetchAssets error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchAssets();
  }, [activeType, isAdmin]);

  if (!isAdmin) return null;

  // ID semántico: hatch_architecture_brick_stretcher
  const buildSemanticId = (type, category, name) =>
    `${type}_${category.toLowerCase()}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (!form.name.trim() || !form.code.trim()) {
      setError('Nome e código são obrigatórios.');
      return;
    }
    if (activeType === 'hatch' && !editorData) {
      setError('Por favor, ajuste o enquadramento e clique em "Salvar Ícone" antes de salvar o catálogo.');
      return;
    }
    setSaving(true);
    try {
      const id  = buildSemanticId(activeType, form.category, form.name);
      
      let finalIconUrl = null;
      if (activeType === 'hatch' && editorData?.dataUrl) {
        const storage = getStorage();
        const fileRef = storageRef(storage, `icons/hatch/${id}.webp`);
        await uploadString(fileRef, editorData.dataUrl, 'data_url');
        finalIconUrl = await getDownloadURL(fileRef);
      }

      const ref = doc(db, 'publicAssets', id);
      await setDoc(ref, {
        type:        activeType,
        name:        form.name.trim(),
        description: form.description.trim(),
        category:    form.category,
        code:        form.code.trim(),
        iconUrl:     finalIconUrl,
        editorParams: editorData ? { scale: editorData.scale, panX: editorData.panX, panY: editorData.panY } : null,
        createdAt:   new Date().toISOString(),
        authorUid:   auth.currentUser.uid,
      }, { merge: true });

      setSuccess(`✅ Padrão "${form.name}" salvo com ID: ${id}`);
      setForm({ ...EMPTY_FORM, category: form.category });
      setPreviewCode('');
      setEditorData(null);
      fetchAssets();
    } catch (err) {
      setError('Erro ao salvar: ' + err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Apagar "${id}"?`)) return;
    try {
      await deleteDoc(doc(db, 'publicAssets', id));
      setAssets(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setError('Erro ao apagar: ' + err.message);
    }
  };

  const categories = activeType === 'hatch' ? HATCH_CATEGORIES : LIN_CATEGORIES;

  return (
    <div>
      {/* Header Admin */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <span style={{ fontSize: '1.2rem' }}>🔑</span>
        <div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>Admin: Catálogo de Recursos</h3>
          <p style={{ margin: 0, color: '#666', fontSize: '0.75rem' }}>Acesso exclusivo · {ADMIN_EMAIL}</p>
        </div>
      </div>

      {/* Tipo Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        {['hatch', 'lin'].map(t => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            style={{
              padding: '6px 16px',
              backgroundColor: activeType === t ? 'var(--tmd-orange, #f26d21)' : '#222',
              color: '#fff', border: 'none', borderRadius: '4px',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: activeType === t ? 'bold' : 'normal',
            }}
          >
            {t === 'hatch' ? 'Hachuras (.pat)' : 'Linhas (.lin)'}
          </button>
        ))}
      </div>

      {/* Formulario de adición */}
      <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 16px 0', color: 'var(--tmd-orange, #f26d21)', fontSize: '0.9rem' }}>
          + Adicionar {activeType === 'hatch' ? 'Hachura' : 'Tipo de Linha'}
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '4px' }}>Nome (English) *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Stretcher Bond"
              style={{ width: '100%', padding: '8px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '4px' }}>Categoria *</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              style={{ width: '100%', padding: '8px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '4px' }}>Descrição (English)</label>
          <input
            type="text"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Classic stretcher bond brickwork, 40x20cm blocks"
            style={{ width: '100%', padding: '8px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '4px' }}>
            Código {activeType === 'hatch' ? '.pat' : '.lin'} * (sem o header *Nome)
          </label>
          <textarea
            value={form.code}
            onChange={e => { setForm(f => ({ ...f, code: e.target.value })); setPreviewCode(e.target.value); }}
            rows={5}
            placeholder={activeType === 'hatch' ? '0, 0,0, 0,20\n90, 0,0, 0,40, 40,-20' : 'A,10,-5,0,-5'}
            style={{ width: '100%', padding: '8px', backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '4px', color: '#ccc', fontSize: '0.75rem', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        {/* Preview */}
        {previewCode && (
          <div style={{ marginBottom: '12px', backgroundColor: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '8px' }}>Editor de Ícone WebP:</div>
            {activeType === 'hatch'
              ? (
                <HatchVisualEditor 
                  code={previewCode} 
                  onSave={(data) => {
                    setEditorData(data);
                    setSuccess('✅ Ícone capturado! Clique em "Salvar no Catálogo" para confirmar.');
                  }} 
                  onCancel={() => setPreviewCode('')} 
                />
              )
              : <LinetypePreview linCode={previewCode} scale={1} />
            }
          </div>
        )}

        {error   && <p style={{ color: '#e74c3c', fontSize: '0.8rem', margin: '0 0 10px 0' }}>{error}</p>}
        {success && <p style={{ color: '#2ecc71', fontSize: '0.8rem', margin: '0 0 10px 0' }}>{success}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '10px 24px', backgroundColor: saving ? '#555' : 'var(--tmd-orange, #f26d21)', color: '#fff', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
        >
          {saving ? 'Salvando...' : 'Salvar no Catálogo'}
        </button>

        <p style={{ fontSize: '0.7rem', color: '#555', marginTop: '10px' }}>
          💡 Após salvar, execute <code style={{ color: '#888' }}>node functions/scripts/buildHatchCatalog.mjs</code> para regenerar o JSON estático e depois faça deploy de Hosting.
        </p>
      </div>

      {/* Lista de assets existentes */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', color: '#aaa', fontSize: '0.85rem' }}>
          Catálogo atual — {assets.length} {activeType === 'hatch' ? 'hachuras' : 'linhas'}
        </h4>
        {loading ? (
          <p style={{ color: '#555', fontSize: '0.8rem' }}>Carregando...</p>
        ) : assets.length === 0 ? (
          <p style={{ color: '#555', fontSize: '0.8rem' }}>Nenhum padrão cadastrado ainda.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#222', borderBottom: '1px solid #444' }}>
                  <th style={{ padding: '8px' }}>Ícone</th>
                  <th style={{ padding: '8px' }}>Nome (Editável)</th>
                  <th style={{ padding: '8px' }}>Categoria</th>
                  <th style={{ padding: '8px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                    <td style={{ padding: '4px 8px', width: '50px' }}>
                      <div style={{ width: '40px', height: '40px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px', overflow: 'hidden' }}>
                        {(item.iconUrl || item.icon) ? (
                          (item.iconUrl || (typeof item.icon === 'string' && item.icon.startsWith('http'))) ? (
                            <img src={item.iconUrl || item.icon} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', color: 'var(--tmd-orange)' }} dangerouslySetInnerHTML={{ __html: item.icon }} />
                          )
                        ) : (
                          <span style={{ display: 'block', textAlign: 'center', lineHeight: '40px', color: '#666', fontSize: '0.6rem' }}>S/ Ícone</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <input
                        type="text"
                        defaultValue={item.name}
                        onBlur={async (e) => {
                          const newName = e.target.value.trim();
                          if (newName && newName !== item.name) {
                            try {
                              e.target.style.borderColor = 'var(--tmd-orange)';
                              await setDoc(doc(db, 'publicAssets', item.id), { name: newName }, { merge: true });
                              e.target.style.borderColor = '#2ecc71';
                              setTimeout(() => e.target.style.borderColor = '#333', 1000);
                            } catch (err) {
                              alert('Erro: ' + err.message);
                              e.target.style.borderColor = '#e74c3c';
                            }
                          }
                        }}
                        style={{ width: '100%', padding: '6px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontSize: '0.8rem' }}
                        title="Perde o foco para salvar (OnBlur)"
                      />
                    </td>
                    <td style={{ padding: '4px 8px', color: '#888' }}>{item.category}</td>
                    <td style={{ padding: '4px 8px' }}>
                      <button
                        onClick={() => {
                          setForm({
                            name: item.name,
                            description: item.description || '',
                            category: item.category,
                            code: item.code
                          });
                          setPreviewCode(item.code);
                          window.scrollTo(0, 0);
                        }}
                        style={{ padding: '4px 8px', backgroundColor: 'transparent', border: '1px solid var(--tmd-orange)', color: 'var(--tmd-orange)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', marginRight: '6px' }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{ padding: '4px 8px', backgroundColor: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
                      >
                        Apagar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
