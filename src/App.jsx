import React, { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';

// Official Machine Images (White BG, No people)
const latImg = './lat_pulldown.png';
const chestImg = './chest_press.png';
const shoulderImg = './shoulder_press.png';
const legImg = './leg_press.png';
const adductionImg = './adduction.png';
const dipsImg = './dips.png';
const bicepImg = './bicep_curl.png';
const treadmillImg = './treadmill.png';
const bikeImg = './bike.png';
const abbenchImg = './abbench.png';

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
];

function App() {
  const [view, setView] = useState('home');
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machines, setMachines] = useLocalStorage('gym-machines', INITIAL_MACHINES);
  const [records, setRecords] = useLocalStorage('gym-records', []);
  const [visitLog, setVisitLog] = useLocalStorage('gym-visit-log', []);
  const [currentVisit, setCurrentVisit] = useLocalStorage('gym-current-visit', null);
  const [user, setUser] = useLocalStorage('gym-user-profile', null);
  const [registeredUsers, setRegisteredUsers] = useLocalStorage('gym-registered-users', []);
  const [authView, setAuthView] = useState('login');
  const [authError, setAuthError] = useState('');

  // Demo Auth Functions (Simulating DB validation)
  const handleAuthAction = (profileData, type) => {
    setAuthError('');
    const { email, password } = profileData;

    if (type === 'register') {
      if (registeredUsers.find(u => u.email === email)) {
        setAuthError('このメールアドレスは既に登録されています。');
        return;
      }
      const newUser = { ...profileData, uid: Date.now().toString() };
      setRegisteredUsers([...registeredUsers, newUser]);
      setUser(newUser);
    } else {
      const existingUser = registeredUsers.find(u => u.email === email && u.password === password);
      if (existingUser) {
        setUser(existingUser);
      } else {
        setAuthError('メールアドレスまたはパスワードが正しくありません。');
        return;
      }
    }
    setView('home');
  };

  const handleUpdateProfile = (newData) => {
    setUser({ ...user, ...newData });
    setView('home');
  };

  const handleDemoLogout = () => {
    setUser(null);
    setView('home');
  };

  // Use a ref to prevent infinite loop
  const hasFixedRef = React.useRef(false);

  React.useEffect(() => {
    if (hasFixedRef.current) return;

    let needsUpdate = false;
    const updatedMachines = machines.map(m => {
      let updated = { ...m };
      
      // Fix "Office Press" -> "Chest Press"
      if (m.name === 'オフィスプレス') {
        updated.name = 'チェストプレス';
        needsUpdate = true;
      }

      // Ensure images are using the clean ones from INITIAL_MACHINES
      const initial = INITIAL_MACHINES.find(im => im.id === m.id);
      if (initial && !m.image.includes('clean')) {
        updated.image = initial.image;
        needsUpdate = true;
      }

      return updated;
    });

    if (needsUpdate) {
      setMachines(updatedMachines);
      hasFixedRef.current = true;
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
    setView('record-success');
    
    // Auto redirect to history after 2 seconds
    setTimeout(() => {
      setView('history');
    }, 1500);
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
        {user && <button className="btn-logout" onClick={handleDemoLogout}>ログアウト</button>}
      </header>

      <main className="app-main">
        {!user ? (
          <AuthView view={authView} setView={setAuthView} onAuth={handleAuthAction} error={authError} />
        ) : (
          <>
        {view === 'home' && (
          <div className="view-home animate-fade">
            <ProfileBar user={user} onEdit={() => setView('edit-profile')} />
            <section className="status-section glass-card">
              <div className="visit-status">
                {currentVisit ? (
                  <>
                    <div className="status-badge active">トレーニング中</div>
                    <div className="visit-info">
                      <div className="info-row">
                        <span className="label">開始時刻</span>
                        <span className="value-sub">{new Date(currentVisit.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">滞在時間</span>
                        <DurationCounter startTime={currentVisit.startTime} />
                      </div>
                    </div>
                    <button className="btn-out" onClick={handleCheckOut}>トレーニング終了 👋</button>
                  </>
                ) : (
                  <button className="btn-in" onClick={handleCheckIn}>トレーニング開始 💪</button>
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

        {view === 'edit-profile' && (
          <ProfileEditView user={user} onSave={handleUpdateProfile} onBack={() => setView('home')} />
        )}

        {view === 'record-success' && (
          <div className="view-success animate-fade">
            <div className="glass-card success-card">
              <div className="success-icon">✅</div>
              <h2>記録完了！</h2>
              <p>お疲れ様でした💪</p>
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
        </>
        )}
      </main>

      {user && (
        <nav className="app-nav glass-card">
          <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>ホーム</button>
          <button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>履歴</button>
        </nav>
      )}

      <style jsx>{`
        .app-container { padding: 16px; flex: 1; display: flex; flex-direction: column; gap: 20px; padding-bottom: 100px; max-width: 600px; margin: 0 auto; box-sizing: border-box; }
        .app-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; }
        .app-header h1 { font-size: 1.4rem; color: var(--primary-color); font-weight: 800; letter-spacing: 1px; margin: 0; }
        .btn-logout { background: none; color: var(--text-muted); font-size: 0.8rem; border: 1px solid var(--glass-border); padding: 4px 12px; border-radius: 6px; }

        .profile-bar { padding: 12px 16px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 8px; border-radius: 16px; border-left: 4px solid var(--primary-color); box-sizing: border-box; cursor: pointer; transition: background 0.2s; }
        .profile-bar:hover { background: rgba(255, 255, 255, 0.05); }
        .profile-user { display: flex; justify-content: space-between; align-items: center; }
        .profile-user .name { font-weight: 700; font-size: 1.1rem; }
        .profile-user .edit-hint { font-size: 0.7rem; color: var(--primary-color); opacity: 0.8; }
        .profile-stats { display: flex; gap: 16px; font-size: 0.85rem; color: var(--text-muted); }
        .profile-stats .stat-val { color: var(--text-main); font-weight: 600; margin-left: 4px; }
        .bmi-badge { background: rgba(255, 204, 0, 0.1); color: var(--primary-color); padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem; }

        .status-section { padding: 20px; margin-bottom: 8px; }
        .visit-status { display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .status-badge { background: var(--glass-bg); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; color: var(--text-muted); border: 1px solid var(--glass-border); }
        .status-badge.active { background: rgba(81, 207, 102, 0.1); color: var(--success-color); border-color: var(--success-color); }
        
        .visit-info { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%; }
        .info-row { display: flex; justify-content: space-between; width: 100%; max-width: 200px; align-items: center; }
        .visit-info .label { font-size: 0.8rem; color: var(--text-muted); }
        .visit-info .value { font-size: 1.5rem; font-weight: 700; color: var(--primary-color); }
        .visit-info .value-sub { font-size: 1.1rem; font-weight: 600; color: var(--text-main); }

        .btn-in, .btn-out { width: 100%; height: 56px; border-radius: 12px; font-weight: 700; font-size: 1.1rem; }
        .btn-in { background: var(--primary-color); color: #000; }
        .btn-out { background: rgba(255, 107, 107, 0.1); color: var(--danger-color); border: 1px solid var(--danger-color); }

        .machine-grid h3 { margin-bottom: 12px; font-size: 1rem; color: var(--text-muted); }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 480px) {
          .grid { grid-template-columns: repeat(3, 1fr); }
        }
        .machine-card { padding: 0; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s; border: 1px solid var(--glass-border); background: rgba(255, 255, 255, 0.03); border-radius: 12px; }
        .machine-card:hover { transform: translateY(-4px); border-color: var(--primary-color); }
        
        .machine-img-container { width: 100%; aspect-ratio: 4/3; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; }
        .machine-thumb { width: 100%; height: 100%; object-fit: contain; }
        .machine-name { padding: 12px; font-weight: 600; font-size: 0.85rem; text-align: center; flex: 1; display: flex; align-items: center; justify-content: center; color: #ffffff !important; }

        .btn-back { background: none; color: var(--text-muted); margin-bottom: 12px; font-size: 0.9rem; padding: 8px 0; }
        .record-form { padding: 24px 16px; display: flex; flex-direction: column; gap: 20px; border-radius: 16px; }
        .form-header { text-align: center; display: flex; flex-direction: column; gap: 12px; }
        .machine-img-large { width: 100%; border-radius: 12px; aspect-ratio: 1/1; object-fit: contain; background: #fff; padding: 10px; border: 1px solid var(--glass-border); }
        
        .view-success { height: 70vh; display: flex; align-items: center; justify-content: center; }
        .success-card { padding: 48px 32px; text-align: center; display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 300px; border-color: var(--success-color); }
        .success-icon { font-size: 4rem; margin-bottom: 8px; animation: bounce 0.5s ease; }
        @keyframes bounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }

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

function DurationCounter({ startTime }) {
  const [elapsed, setElapsed] = useState('');

  React.useEffect(() => {
    const update = () => {
      const diff = new Date() - new Date(startTime);
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      
      let str = '';
      if (hours > 0) str += `${hours}:`;
      str += `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setElapsed(str);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  return <span className="value">{elapsed}</span>;
}

function AuthView({ view, setView, onAuth, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [height, setHeight] = useState('170');
  const [weight, setWeight] = useState('65');

  return (
    <div className="auth-view animate-fade">
      <div className="glass-card auth-card">
        <h2>{view === 'login' ? 'ログイン' : '新規会員登録'}</h2>
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-form">
          {view === 'register' && (
            <>
              <div className="input-group">
                <label>ユーザー名</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ニックネーム" />
              </div>
              <div className="row">
                <div className="input-group">
                  <label>身長 (cm)</label>
                  <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>体重 (kg)</label>
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
              </div>
            </>
          )}
          <div className="input-group">
            <label>メールアドレス</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" />
          </div>
          <div className="input-group">
            <label>パスワード</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn-primary" onClick={() => onAuth({ email, password, username, height, weight }, view)}>
            {view === 'login' ? 'ログインする' : '登録する'}
          </button>
          <button className="btn-switch" onClick={() => { setView(view === 'login' ? 'register' : 'login'); }}>
            {view === 'login' ? 'アカウントをお持ちでない方はこちら' : 'ログインはこちら'}
          </button>
        </div>
      </div>
      <style jsx>{`
        .auth-view { min-height: 90vh; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }
        .auth-card { padding: 32px 20px; width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 24px; text-align: center; box-sizing: border-box; }
        .auth-error { background: rgba(255, 107, 107, 0.1); color: var(--danger-color); padding: 12px; border-radius: 8px; font-size: 0.85rem; border: 1px solid var(--danger-color); }
        .auth-form { display: flex; flex-direction: column; gap: 16px; width: 100%; }
        .input-group { display: flex; flex-direction: column; gap: 6px; text-align: left; width: 100%; }
        .input-group label { font-size: 0.8rem; color: var(--text-muted); padding-left: 4px; }
        .input-group input { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--glass-border); padding: 12px; border-radius: 10px; color: #fff; font-size: 1rem; width: 100%; box-sizing: border-box; }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; box-sizing: border-box; }
        .btn-primary { height: 56px; border-radius: 12px; font-weight: 700; margin-top: 8px; width: 100%; }
        .btn-switch { background: none; color: var(--primary-color); font-size: 0.85rem; margin-top: 10px; }
      `}</style>
    </div>
  );
}

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
    </section>
  );
}

function ProfileEditView({ user, onSave, onBack }) {
  const [username, setUsername] = useState(user.username || '');
  const [height, setHeight] = useState(user.height || '');
  const [weight, setWeight] = useState(user.weight || '');

  return (
    <div className="view-record animate-fade">
      <button className="btn-back" onClick={onBack}>← 戻る</button>
      <div className="glass-card record-form">
        <h2>プロフィール編集</h2>
        <div className="auth-form" style={{ width: '100%' }}>
          <div className="input-group">
            <label>ユーザー名</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '10px', color: '#fff', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div className="row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="input-group">
              <label>身長 (cm)</label>
              <input 
                type="number" 
                value={height} 
                onChange={(e) => setHeight(e.target.value)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '10px', color: '#fff', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div className="input-group">
              <label>体重 (kg)</label>
              <input 
                type="number" 
                value={weight} 
                onChange={(e) => setWeight(e.target.value)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '10px', color: '#fff', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <button className="btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={() => onSave({ username, height, weight })}>
            変更を保存する
          </button>
        </div>
      </div>
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
