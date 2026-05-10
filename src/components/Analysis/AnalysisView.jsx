import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import TrendChart from './TrendChart';

function AnalysisView({ records, visitLog, user, onUserUpdate }) {
  const currentYear = new Date().getFullYear();
  const [wIn, setWIn] = useState(user.weight || '');
  const [fIn, setFIn] = useState(user.bodyFat || '');
  
  const handleQuickSave = async () => {
    if (!user.uid) return;
    try {
      const updatedUser = { ...user, weight: wIn, bodyFat: fIn };
      await setDoc(doc(db, 'users', user.uid), updatedUser);
      onUserUpdate(updatedUser);
      alert('記録を保存しました');
    } catch (err) { console.error(err); }
  };

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const monthlyCounts = months.map(m => {
    const count = visitLog.filter(v => {
      const vDate = new Date(v.timestamp);
      return vDate.getFullYear() === currentYear && 
             vDate.toLocaleString('ja-JP', {month: 'short'}) === m;
    }).length;
    return { month: m, count };
  });
  const maxVisitCount = Math.max(...monthlyCounts.map(m => m.count), 1);

  const weightData = records
    .filter(r => r.currentWeight)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-10);
  const weights = weightData.map(d => parseFloat(d.currentWeight));
  const minW = Math.min(...weights, 0) * 0.9;
  const maxW = Math.max(...weights, 100) * 1.1;

  return (
    <div className="view-analysis animate-fade" style={{ padding: '0 8px' }}>
      <div className="quick-log" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--primary-color)', fontWeight: 800 }}>本日の測定記録</h4>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>体重 (kg)</label>
            <input type="number" step="0.1" value={wIn} onChange={(e) => setWIn(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', color: '#fff', width: '100%' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>体脂肪 (%)</label>
            <input type="number" step="0.1" value={fIn} onChange={(e) => setFIn(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '10px', color: '#fff', width: '100%' }} />
          </div>
        </div>
        <button onClick={handleQuickSave} style={{ width: '100%', height: '44px', background: 'var(--primary-color)', color: '#000', borderRadius: '10px', fontWeight: 700, border: 'none' }}>記録する</button>
      </div>
      <div className="glass-card chart-container">
        <h3>トレーニング回数（月別） ({currentYear}年)</h3>
        <div className="bar-chart">
          {monthlyCounts.map((m, i) => (
            <div key={i} className="bar-column">
              <div className="bar-val">{m.count > 0 ? m.count : ''}</div>
              <div className="bar-wrapper">
                <div className="bar" style={{ height: `${(m.count / maxVisitCount) * 100}%` }}></div>
              </div>
              <div className="bar-label">{m.month.replace('月', '')}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card chart-container">
        <h3>体重推移 (最新10件)</h3>
        <TrendChart 
          data={weightData.map(d => ({ val: parseFloat(d.currentWeight), date: d.date }))} 
          label="体重 (kg)" 
          color="#00f2fe" 
        />
      </div>

      <style jsx>{`
        .chart-container { padding: 16px; margin-bottom: 12px; }
        .bar-chart { display: flex; justify-content: space-around; align-items: flex-end; height: 120px; margin-top: 16px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .bar-column { display: flex; flex-direction: column; align-items: center; flex: 1; gap: 4px; height: 100%; min-width: 15px; }
        .bar-wrapper { width: 8px; height: 100%; display: flex; align-items: flex-end; background: rgba(255,255,255,0.02); border-radius: 4px; }
        .bar { width: 100%; background: var(--primary-color); border-radius: 4px 4px 0 0; transition: height 0.6s ease-out; }
        .bar-val { font-size: 0.6rem; font-weight: 800; color: var(--primary-color); }
        .bar-label { font-size: 0.6rem; color: var(--text-muted); }
      `}</style>
    </div>
  );
}

export default AnalysisView;
