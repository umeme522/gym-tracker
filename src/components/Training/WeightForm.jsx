import React, { useState } from 'react';
import Stepper from './Stepper';

function WeightForm({ onSubmit, initialData }) {
  const [weight, setWeight] = useState(initialData?.weight || 20);
  const [reps, setReps] = useState(initialData?.reps || 10);
  const [sets, setSets] = useState(initialData?.sets || 3);
  return (
    <div className="form-content">
      <Stepper label="重量 (kg)" value={weight} onChange={setWeight} step={5} min={0} />
      <div className="row-inputs">
        <Stepper label="回数 (reps)" value={reps} onChange={setReps} step={1} min={1} />
        <Stepper label="セット数 (sets)" value={sets} onChange={setSets} step={1} min={1} />
      </div>
      <button className="btn-primary full-width" onClick={() => onSubmit({ weight, reps, sets })}>
        {initialData ? '更新を保存する' : '記録を保存する'}
      </button>
      <style jsx>{`
        .full-width { width: 100%; margin-top: 12px; height: 56px; font-size: 1.1rem; }
        .form-content { display: flex; flex-direction: column; gap: 24px; }
        .row-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      `}</style>
    </div>
  );
}

export default WeightForm;
