import React, { useState } from 'react';
import Stepper from './Stepper';

function CardioForm({ onSubmit, initialData }) {
  const [speed, setSpeed] = useState(initialData?.speed || 6.0);
  const [incline, setIncline] = useState(initialData?.incline || 0);
  const [time, setTime] = useState(initialData?.time || 20);
  return (
    <div className="form-content">
      <Stepper label="速度 (km/h)" value={speed} onChange={setSpeed} step={0.5} min={0.5} />
      <Stepper label="傾斜 (%)" value={incline} onChange={setIncline} step={1} min={0} max={15} />
      <Stepper label="時間 (分)" value={time} onChange={setTime} step={5} min={5} />
      <button className="btn-primary full-width" onClick={() => onSubmit({ speed, incline, time })}>
        {initialData ? '更新を保存する' : '記録を保存する'}
      </button>
      <style jsx>{`.full-width { width: 100%; margin-top: 12px; height: 56px; font-size: 1.1rem; }.form-content { display: flex; flex-direction: column; gap: 24px; }`}</style>
    </div>
  );
}

export default CardioForm;
