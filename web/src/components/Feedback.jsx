import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function Feedback() {
  const [feedback, setFeedback] = useState('');
  const [type, setType] = useState('sugerencia');
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setStatus('submitting');
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'feedback'), {
        type,
        message: feedback,
        userEmail: user ? user.email : 'Anónimo',
        userId: user ? user.uid : 'Anónimo',
        timestamp: new Date().toISOString(),
        aiProcessed: false,
      });
      setStatus('success');
      setFeedback('');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '40px auto' }}>
      <h2 style={{ color: 'var(--tmd-orange)', marginTop: 0 }}>Canal de Feedback (Fase Beta)</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        Ajude-nos a melhorar. Encontrou um bug ou tem uma sugestão para um novo comando?
      </p>

      {status === 'success' ? (
        <div style={{ padding: '20px', background: '#4caf5020', borderLeft: '4px solid #4caf50', borderRadius: '4px' }}>
          <strong>Obrigado pelo seu feedback!</strong> Nossa IA irá categorizar sua mensagem e nossa equipe técnica será notificada.
          <br /><br />
          <button className="btn btn-secondary" onClick={() => setStatus('idle')}>Enviar outra mensagem</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Tipo de Mensagem</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              style={{ width: '100%', padding: '10px', background: 'var(--bg-darker)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
            >
              <option value="sugerencia">💡 Sugestão de Melhoria</option>
              <option value="bug">🐛 Reportar um Bug</option>
              <option value="duda">❓ Dúvida / Ajuda</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Detalhes</label>
            <textarea 
              rows="5"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Descreva aqui sua ideia ou o problema que encontrou..."
              style={{ width: '100%', padding: '10px', background: 'var(--bg-darker)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '4px', resize: 'vertical' }}
              required
            />
          </div>

          <button type="submit" className="btn" disabled={status === 'submitting' || !feedback.trim()}>
            {status === 'submitting' ? 'Enviando...' : 'Enviar Feedback'}
          </button>
          
          {status === 'error' && (
            <p style={{ color: '#f44336', fontSize: '0.9rem' }}>Erro ao enviar. Tente novamente mais tarde.</p>
          )}
        </form>
      )}
    </div>
  );
}
