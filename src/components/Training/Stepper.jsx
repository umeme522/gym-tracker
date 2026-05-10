import React from 'react';

function Stepper({ label, value, onChange, step, min, max }) {
  return (
    <div className="input-group">
      <label>{label}</label>
      <div className="stepper">
        <button onClick={() => onChange(Math.max(min, Math.round((parseFloat(value) - step) * 10) / 10))}>-</button>
        <input type="number" value={value} readOnly />
        <button onClick={() => onChange(max !== undefined ? Math.min(max, Math.round((parseFloat(value) + step) * 10) / 10) : Math.round((parseFloat(value) + step) * 10) / 10)}>+</button>
      </div>
      <style jsx>{`
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { font-size: 0.9rem; color: var(--text-muted); font-weight: 500; }
        .stepper { display: flex; align-items: center; background: rgba(255, 255, 255, 0.05); border-radius: 12px; overflow: hidden; border: 1px solid var(--glass-border); }
        .stepper button { width: 60px; height: 60px; background: none; color: var(--text-main); font-size: 1.5rem; }
        .stepper input { flex: 1; background: none; border: none; color: var(--text-main); text-align: center; font-size: 1.5rem; font-weight: 700; outline: none; }
      `}</style>
    </div>
  );
}

export default Stepper;
