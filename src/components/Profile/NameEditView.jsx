import React, { useState } from 'react';

function NameEditView({ user, onSave, onBack }) {
  const [username, setUsername] = useState(user.username || '');

  return (
    <div className="view-record animate-fade">
      <button className="btn-back" onClick={onBack}>← 戻る</button>
      <div className="glass-card record-form">
        <h2>名前を変更</h2>
        <div className="auth-form" style={{ width: '100%' }}>
          <div className="input-group">
            <label>新しいお名前</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '10px', color: '#fff', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <button 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '16px', background: 'var(--primary-color)', color: '#000', height: '56px', borderRadius: '12px', fontWeight: 700, border: 'none' }} 
            onClick={() => onSave({ username })}
          >
            変更を保存する
          </button>
        </div>
      </div>
      <style jsx>{`
        .view-record { display: flex; flex-direction: column; gap: 12px; }
        .btn-back { background: none; color: var(--text-muted); margin-bottom: 12px; font-size: 0.9rem; padding: 8px 0; border: none; text-align: left; }
        .record-form { padding: 24px 16px; display: flex; flex-direction: column; gap: 20px; border-radius: 16px; background: rgba(255,255,255,0.03); }
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .input-group { display: flex; flex-direction: column; gap: 6px; }
        .input-group label { font-size: 0.8rem; color: var(--text-muted); }
      `}</style>
    </div>
  );
}

export default NameEditView;
