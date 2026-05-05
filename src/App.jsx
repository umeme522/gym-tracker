import React, { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';

// Official Machine Images (White BG, No people)
const latImg = 'https://chocozap.jp/assets/img/studios/service_latpulldown.png';
const chestImg = 'https://chocozap.jp/assets/img/studios/service_chestpress.png';
const shoulderImg = 'https://chocozap.jp/assets/img/studios/service_shoulderpress.png';
const legImg = 'https://chocozap.jp/assets/img/studios/service_legpress.png';
const adductionImg = 'https://chocozap.jp/assets/img/studios/service_adduction.png';
const dipsImg = 'https://chocozap.jp/assets/img/studios/service_dips.png';
const bicepImg = 'https://chocozap.jp/assets/img/studios/service_bicepcurls.png';
const treadmillImg = 'https://chocozap.jp/assets/img/studios/service_treadmill.png';
const bikeImg = 'https://chocozap.jp/assets/img/studios/service_bike.png';
const abbenchImg = 'https://chocozap.jp/assets/img/studios/service_abbench.png';

// 初期マシンデータ
const INITIAL_MACHINES = [
  { id: 1, name: 'ラットプルダウン', icon: '👐', image: latImg, type: 'weight' },
  { id: 2, name: 'チェストプレス', icon: '💪', image: chestImg, type: 'weight' },
  { id: 3, name: 'ショルダープレス', icon: '⬆️', image: shoulderImg, type: 'weight' },
  { id: 4, name: 'レッグプレス', icon: '🦵', image: legImg, type: 'weight' },
  { id: 5, name: 'アダクション／アブダクション', icon: '↔️', image: adductionImg, type: 'weight' },
  { id: 6, name: 'ディップス', icon: '⬇️', image: dipsImg, type: 'weight' },
  { id: 7, name: 'バイセップスカール', icon: '➰', image: bicepImg, type: 'weight' },
  { id: 8, name: 'トレッドミル', icon: '🏃', image: treadmillImg, type: 'cardio' },
  { id: 9, name: 'クロスバイク', icon: '🚴', image: bikeImg, type: 'cardio' },
  { id: 10, name: '腹筋マシン', icon: '🧘', image: abbenchImg, type: 'weight' },
];

function App() {
  const [view, setView] = useState('home');
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machines, setMachines] = useLocalStorage('gym-machines', INITIAL_MACHINES);
  const [records, setRecords] = useLocalStorage('gym-records', []);
  const [visitLog, setVisitLog] = useLocalStorage('gym-visit-log', []);
  const [currentVisit, setCurrentVisit] = useLocalStorage('gym-current-visit', null);

  // Rename "Office Press" to "Chest Press" if it exists in stored data and update images to official ones
  React.useEffect(() => {
    let needsUpdate = false;
    const updatedMachines = machines.map(m => {
      let updated = { ...m };
      if (m.name === 'オフィスプレス') {
        updated.name = 'チェストプレス';
        needsUpdate = true;
      }
      // Force update images to official URLs from INITIAL_MACHINES
      const official = INITIAL_MACHINES.find(om => om.id === m.id);
      if (official && m.image !== official.image) {
        updated.image = official.image;
        needsUpdate = true;
      }
      return updated;
    });

    if (needsUpdate) {
      setMachines(updatedMachines);
    }
  }, [machines, setMachines]);

  const handleAddRecord = (data) => {
    const newRecord = {
      id: Date.now(),
      machineId: selectedMachine.id,
      machineName: selectedMachine.name,
      ...data,
      timestamp: new Date().toISOString(),
    };
    setRecords([newRecord, ...records]);
    setView('history');
  };

  const handleCheckIn = () => {
    const now = new Date().toISOString();
    setCurrentVisit({ startTime: now });
    setVisitLog([{ type: 'in', timestamp: now }, ...visitLog]);
  };

  const handleCheckOut = () => {
    if (!currentVisit) return;
    const now = new Date().toISOString();
    const duration = Math.round((new Date(now) - new Date(currentVisit.startTime)) / 60000);
    setVisitLog([{ type: 'out', timestamp: now, startTime: currentVisit.startTime, duration }, ...visitLog]);
    setCurrentVisit(null);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>ジムトラッカー</h1>
      </header>

      <main className="app-main">
        {view === 'home' && (
          <div className="view-home animate-fade">
            <section className="status-section glass-card">
              <div className="visit-status">
                {currentVisit ? (
                  <>
                    <div className="status-badge active">トレーニング中</div>
                    <div className="visit-info">
                      <span className="label">開始時刻</span>
                      <span className="value">{new Date(currentVisit.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <button className="btn-out" onClick={handleCheckOut}>トレーニング終了 👋</button>
                  </>
                ) : (
                  <>
                    <div className="status-badge">お休み中</div>
                    <button className="btn-in" onClick={handleCheckIn}>トレーニング開始 💪</button>
                  </>
                )}
              </div>
            </section>
            
            <section className="machine-grid">
              <h3>マシンを選択</h3>
              <div className="grid">
                {machines.map(m => (
                  <button 
                    key={m.id} 
                    className="glass-card machine-card"
                    onClick={() => {
                      setSelectedMachine(m);
                      setView('record');
                    }}
                  >
                    <div className="machine-img-container">
                      <img src={m.image} alt={m.name} className="machine-thumb" />
                    </div>
                    <span className="machine-name">{m.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {view === 'record' && selectedMachine && (
          <div className="view-record animate-fade">
            <button className="btn-back" onClick={() => setView('home')}>← 戻る</button>
            <div className="glass-card record-form">
              <div className="form-header">
                <img src={selectedMachine.image} alt={selectedMachine.name} className="machine-img-large" />
                <h2>{selectedMachine.name}</h2>
              </div>
              
              {selectedMachine.type === 'cardio' ? (
                <CardioForm onSubmit={handleAddRecord} />
              ) : (
                <WeightForm onSubmit={handleAddRecord} />
              )}
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="view-history animate-fade">
            <h2>トレーニング履歴</h2>
            <div className="history-list">
              {[...records, ...visitLog.filter(v => v.type === 'out')].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(item => (
                <div key={item.id || item.timestamp} className={`glass-card history-item ${item.type === 'out' ? 'visit-log' : ''}`}>
                  {item.type === 'out' ? (
                    <>
                      <div className="item-info">
                        <span className="item-name">トレーニング滞在</span>
                        <span className="item-date">{new Date(item.timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="item-data visit-duration">
                        <span>{item.duration} 分間</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="item-info">
                        <span className="item-name">{item.machineName}</span>
                        <span className="item-date">{new Date(item.timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="item-data">
                        {item.weight !== undefined ? (
                          <>
                            <span className="item-weight">{item.weight} kg</span>
                            <span className="item-reps">{item.reps} 回</span>
                          </>
                        ) : (
                          <>
                            <span className="item-speed">{item.speed} km/h</span>
                            <span className="item-time">{item.time} 分</span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {(records.length === 0 && visitLog.length === 0) && <p className="empty-msg">記録がありません</p>}
            </div>
          </div>
        )}
      </main>

      <nav className="app-nav glass-card">
        <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>ホーム</button>
        <button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>履歴</button>
      </nav>

      <style jsx>{`
        .app-container { padding: 20px; flex: 1; display: flex; flex-direction: column; gap: 24px; padding-bottom: 100px; }
        .app-header h1 { font-size: 1.5rem; color: var(--primary-color); text-align: center; font-weight: 800; letter-spacing: 1px; }

        .status-section { padding: 20px; margin-bottom: 8px; }
        .visit-status { display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .status-badge { background: var(--glass-bg); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; color: var(--text-muted); border: 1px solid var(--glass-border); }
        .status-badge.active { background: rgba(81, 207, 102, 0.1); color: var(--success-color); border-color: var(--success-color); }
        
        .visit-info { display: flex; flex-direction: column; align-items: center; }
        .visit-info .label { font-size: 0.8rem; color: var(--text-muted); }
        .visit-info .value { font-size: 1.5rem; font-weight: 700; color: var(--primary-color); }

        .btn-in, .btn-out { width: 100%; height: 56px; border-radius: 12px; font-weight: 700; font-size: 1.1rem; }
        .btn-in { background: var(--primary-color); color: #000; }
        .btn-out { background: rgba(255, 107, 107, 0.1); color: var(--danger-color); border: 1px solid var(--danger-color); }

        .machine-grid h3 { margin-bottom: 16px; font-size: 1.1rem; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .machine-card { padding: 0; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s; border: 1px solid var(--glass-border); background: rgba(255, 255, 255, 0.03); }
        .machine-card:hover { transform: translateY(-4px); border-color: var(--primary-color); }
        
        .machine-img-container { width: 100%; aspect-ratio: 4/3; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; }
        .machine-thumb { width: 100%; height: 100%; object-fit: contain; }
        .machine-name { padding: 12px; font-weight: 600; font-size: 0.85rem; text-align: center; flex: 1; display: flex; align-items: center; justify-content: center; color: #ffffff !important; }

        .btn-back { background: none; color: var(--text-muted); margin-bottom: 16px; font-size: 0.9rem; }
        .record-form { padding: 32px 24px; display: flex; flex-direction: column; gap: 24px; }
        .form-header { text-align: center; display: flex; flex-direction: column; gap: 16px; }
        .machine-img-large { width: 100%; border-radius: 12px; aspect-ratio: 16/9; object-fit: contain; background: #fff; padding: 5px; border: 1px solid var(--glass-border); }

        .history-list { display: flex; flex-direction: column; gap: 12px; }
        .history-item { padding: 16px; display: flex; justify-content: space-between; align-items: center; }
        .history-item.visit-log { border-left: 4px solid var(--accent-color); }
        .item-info { display: flex; flex-direction: column; gap: 4px; }
        .item-name { font-weight: 600; }
        .item-date { font-size: 0.8rem; color: var(--text-muted); }
        .item-data { display: flex; gap: 12px; font-weight: 700; color: var(--primary-color); }
        .visit-duration { color: var(--accent-color); }

        .app-nav { position: fixed; bottom: 20px; left: 20px; right: 20px; height: 64px; display: flex; justify-content: space-around; align-items: center; padding: 0 12px; z-index: 100; }
        .app-nav button { background: none; color: var(--text-muted); font-weight: 600; font-size: 0.9rem; padding: 8px 16px; border-radius: 8px; }
        .app-nav button.active { color: var(--primary-color); background: rgba(255, 204, 0, 0.1); }
        .empty-msg { text-align: center; color: var(--text-muted); margin-top: 40px; }
      `}</style>
    </div>
  );
}

function WeightForm({ onSubmit }) {
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);
  return (
    <div className="form-content">
      <Stepper label="重量 (kg)" value={weight} onChange={setWeight} step={5} min={0} />
      <Stepper label="回数 (reps)" value={reps} onChange={setReps} step={1} min={1} />
      <button className="btn-primary full-width" onClick={() => onSubmit({ weight, reps })}>記録を保存する</button>
      <style jsx>{`.full-width { width: 100%; margin-top: 12px; height: 56px; font-size: 1.1rem; }.form-content { display: flex; flex-direction: column; gap: 24px; }`}</style>
    </div>
  );
}

function CardioForm({ onSubmit }) {
  const [speed, setSpeed] = useState(6.0);
  const [incline, setIncline] = useState(0);
  const [time, setTime] = useState(20);
  return (
    <div className="form-content">
      <Stepper label="速度 (km/h)" value={speed} onChange={setSpeed} step={0.5} min={0.5} />
      <Stepper label="傾斜 (%)" value={incline} onChange={setIncline} step={1} min={0} max={15} />
      <Stepper label="時間 (分)" value={time} onChange={setTime} step={5} min={5} />
      <button className="btn-primary full-width" onClick={() => onSubmit({ speed, incline, time })}>記録を保存する</button>
      <style jsx>{`.full-width { width: 100%; margin-top: 12px; height: 56px; font-size: 1.1rem; }.form-content { display: flex; flex-direction: column; gap: 24px; }`}</style>
    </div>
  );
}

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

export default App;
