import React, { useState } from 'react';
import emailjs from '@emailjs/browser';

function InquiryView({ user, onBack }) {
  const [category, setCategory] = useState('要望');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);

    try {
      await emailjs.send(
        'service_ozlah6b', 
        'template_sgyc1qp', 
        { 
          to_email: 'cotto7894@icloud.com', // Admin email
          username: user.username,
          category: category,
          message: message,
          user_email: user.email
        }, 
        'j1bMToGV2qz1hk2DN'
      );
      alert('送信しました。フィードバックありがとうございます！');
      onBack();
    } catch (err) {
      console.error(err);
      alert('送信に失敗しました。');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="view-record animate-fade">
      <button className="btn-back" onClick={onBack}>← 戻る</button>
      <div className="glass-card record-form">
        <h2>お問い合わせ</h2>
        <div className="auth-form" style={{ width: '100%' }}>
          <div className="input-group">
            <label>種別</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="要望">要望 💡</option>
              <option value="エラー">エラー ⚠️</option>
              <option value="その他">その他 ✉️</option>
            </select>
          </div>
          <div className="input-group">
            <label>内容</label>
            <textarea 
              rows="5" 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="こちらに入力してください..."
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '12px', color: '#fff', fontSize: '16px' }}
            />
          </div>
          <button className="btn-primary" onClick={handleSend} disabled={sending} style={{ width: '100%', marginTop: '16px', background: 'var(--primary-color)', color: '#000', height: '56px', borderRadius: '12px', fontWeight: 700, border: 'none' }}>
            {sending ? '送信中...' : '送信する'}
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
        select { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--glass-border); background: rgba(255, 255, 255, 0.05); color: #fff; font-size: 16px; }
      `}</style>
    </div>
  );
}

export default InquiryView;
