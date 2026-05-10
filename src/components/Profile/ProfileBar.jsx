import React from 'react';

function ProfileBar({ user, onEdit }) {
  const h = parseFloat(user.height) / 100;
  const w = parseFloat(user.weight);
  const bmi = (w / (h * h)).toFixed(1);

  return (
    <section className="profile-bar glass-card" onClick={onEdit}>
      <div className="profile-user">
        <span className="name">{user.username || 'ゲスト'} 様 <span className="edit-hint">編集 ✎</span></span>
        <span className="bmi-badge">BMI {bmi}</span>
      </div>
      <div className="profile-stats">
        <span>身長: <span className="stat-val">{user.height} cm</span></span>
        <span>体重: <span className="stat-val">{user.weight} kg</span></span>
      </div>
      <style jsx>{`
        .profile-bar { padding: 16px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
        .profile-user { display: flex; flex-direction: column; gap: 4px; }
        .name { font-weight: 700; font-size: 1.1rem; }
        .edit-hint { font-size: 0.7rem; color: var(--primary-color); opacity: 0.8; }
        .bmi-badge { font-size: 0.75rem; background: var(--primary-color); color: #000; padding: 2px 8px; border-radius: 4px; width: fit-content; font-weight: 700; }
        .profile-stats { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; font-size: 0.85rem; color: var(--text-muted); }
        .stat-val { color: #fff; font-weight: 600; }
      `}</style>
    </section>
  );
}

export default ProfileBar;
