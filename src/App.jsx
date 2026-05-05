import React, { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import emailjs from '@emailjs/browser';
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

// Official Machine Images (White BG, No people)
// Reliable Local Asset Imports (Bundled by Vite)
// Machine Images (Using reliable AI-generated high-quality visuals for stability)
const latImg = 'https://images.unsplash.com/photo-1591562811570-6803510477a8?auto=format&fit=crop&q=80&w=400';
const chestImg = 'https://images.unsplash.com/photo-1594737625785-a239f56237bd?auto=format&fit=crop&q=80&w=400';
const shoulderImg = 'https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?auto=format&fit=crop&q=80&w=400';
const legImg = 'https://images.unsplash.com/photo-1591940742878-13aba4b7a35e?auto=format&fit=crop&q=80&w=400';
const adductionImg = 'https://images.unsplash.com/photo-1590239068512-632006cc1906?auto=format&fit=crop&q=80&w=400';
const dipsImg = 'https://images.unsplash.com/photo-1581009146145-b5ef03a24b77?auto=format&fit=crop&q=80&w=400';
const bicepImg = 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&q=80&w=400';
const treadmillImg = 'https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?auto=format&fit=crop&q=80&w=400';
const bikeImg = treadmillImg; 
const abbenchImg = chestImg;

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
  const [records, setRecords] = useState([]);
  const [visitLog, setVisitLog] = useState([]);
  const [currentVisit, setCurrentVisit] = useLocalStorage('gym-current-visit', null);
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [authError, setAuthError] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [tempVisitRecords, setTempVisitRecords] = useLocalStorage('gym-temp-visit-records', []);
  const [loading, setLoading] = useState(true);

  // Sync with Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ ...userDoc.data(), uid: firebaseUser.uid });
        } else {
          // If profile missing, just set basic info
          setUser({ email: firebaseUser.email, uid: firebaseUser.uid });
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Sync Training Data from Firestore
  useEffect(() => {
    if (!user) {
      setRecords([]);
      setVisitLog([]);
      return;
    }

    // Individual Records (not in visits)
    const qRecords = query(collection(db, 'users', user.uid, 'records'), orderBy('timestamp', 'desc'));
    const unsubRecords = onSnapshot(qRecords, (snapshot) => {
      setRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Visit Summaries
    const qVisits = query(collection(db, 'users', user.uid, 'visitLogs'), orderBy('timestamp', 'desc'));
    const unsubVisits = onSnapshot(qVisits, (snapshot) => {
      setVisitLog(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubRecords();
      unsubVisits();
    };
  }, [user]);

  // Get last record for a specific machine to use as default
  const getLastRecord = (machineId) => {
    // Check in records outside visits first
    let last = records.find(r => r.machineId === machineId);
    
    // Then check inside finished visits if not found or if visits have more recent data
    visitLog.forEach(v => {
      const found = v.records.find(r => r.machineId === machineId);
      if (found && (!last || new Date(found.timestamp) > new Date(last.timestamp))) {
        last = found;
      }
    });
    return last;
  };

  // Firebase Auth Action
  const handleAuthAction = async (profileData, type) => {
    setAuthError('');
    const { email, password } = profileData;

    try {
      if (type === 'register') {
        const { confirmPassword, username, height, weight } = profileData;
        if (password !== confirmPassword) {
          setAuthError('パスワードが一致しません。');
          return;
        }
        
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const userData = { email, username, height, weight, createdAt: new Date().toISOString() };
        await setDoc(doc(db, 'users', res.user.uid), userData);
        setUser({ ...userData, uid: res.user.uid });
        
        // REAL Email Sending via EmailJS
        emailjs.send(
          'service_ozlah6b', 
          'template_sgyc1qp', 
          { 
            to_email: email, 
            username: username, 
            email: email,
            password: password 
          }, 
          'j1bMToGV2qz1hk2DN'
        ).then(() => {
          alert(`登録完了！\n${email} 宛にログイン情報を送信しました。`);
        }).catch((err) => {
          console.error('Email send failed:', err);
          alert('登録完了しましたが、メール送信に失敗しました。');
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setView('home');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setAuthError('このメールアドレスは既に登録されています。');
      else if (err.code === 'auth/invalid-email') setAuthError('メールアドレスの形式が正しくありません。');
      else if (err.code === 'auth/weak-password') setAuthError('パスワードは6文字以上で入力してください。');
      else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') setAuthError('メールアドレスまたはパスワードが正しくありません。');
      else setAuthError(`認証エラー: ${err.message}`);
    }
  };

  const handleUpdateProfile = async (newData) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), newData);
      setUser({ ...user, ...newData });
      setView('home');
    } catch (err) {
      console.error(err);
      alert('プロフィールの更新に失敗しました。');
    }
  };

  const handleDemoLogout = async () => {
    await signOut(auth);
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

  const handleAddRecord = async (data) => {
    if (!user) return;
    const newRecord = {
      machineId: selectedMachine.id,
      machineName: selectedMachine.name,
      ...data,
      timestamp: new Date().toISOString(),
    };

    try {
      if (currentVisit) {
        setTempVisitRecords([newRecord, ...tempVisitRecords]);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'records'), newRecord);
      }
      setView('record-success');
      setTimeout(() => setView('home'), 1500);
    } catch (err) {
      console.error(err);
      alert('記録の保存に失敗しました。');
    }
  };

  const handleUpdateRecord = async (data) => {
    if (!user || !editingRecord) return;
    try {
      if (editingRecord.visitId) {
        const visitRef = doc(db, 'users', user.uid, 'visitLogs', editingRecord.visitId);
        const visitDoc = await getDoc(visitRef);
        if (visitDoc.exists()) {
          const updatedRecords = visitDoc.data().records.map(r => 
            r.id === editingRecord.id ? { ...r, ...data } : r
          );
          await updateDoc(visitRef, { records: updatedRecords });
        }
      } else {
        await updateDoc(doc(db, 'users', user.uid, 'records', editingRecord.id), data);
      }
      setEditingRecord(null);
      setView('history');
    } catch (err) {
      console.error(err);
      alert('更新に失敗しました。');
    }
  };

  const handleDeleteRecord = async (id, visitId = null, isVisit = false) => {
    if (!user) return;
    if (window.confirm(isVisit ? 'この滞在記録全体を削除しますか？' : 'この記録を削除しますか？')) {
      try {
        if (isVisit) {
          await deleteDoc(doc(db, 'users', user.uid, 'visitLogs', id));
        } else if (visitId) {
          const visitRef = doc(db, 'users', user.uid, 'visitLogs', visitId);
          const visitDoc = await getDoc(visitRef);
          if (visitDoc.exists()) {
            const updatedRecords = visitDoc.data().records.filter(r => r.id !== id);
            await updateDoc(visitRef, { records: updatedRecords });
          }
        } else {
          await deleteDoc(doc(db, 'users', user.uid, 'records', id));
        }
      } catch (err) {
        console.error(err);
        alert('削除に失敗しました。');
      }
    }
  };

  const handleEditRecord = (record, visitId = null) => {
    setEditingRecord({ ...record, visitId });
    setSelectedMachine(INITIAL_MACHINES.find(m => m.id === record.machineId));
    setView('record-edit');
  };

  const handleCheckIn = () => {
    const now = new Date().toISOString();
    setCurrentVisit({ startTime: now });
    setTempVisitRecords([]);
  };

  const handleCheckOut = async () => {
    if (!user) return;
    const endTime = new Date();
    const startTime = new Date(currentVisit.startTime);
    const diffMs = endTime - startTime;
    const duration = Math.floor(diffMs / 60000); // minutes

    const newVisitLog = {
      type: 'visit-summary',
      startTime: currentVisit.startTime,
      endTime: endTime.toISOString(),
      duration: duration,
      records: tempVisitRecords,
      timestamp: endTime.toISOString()
    };

    try {
      await addDoc(collection(db, 'users', user.uid, 'visitLogs'), newVisitLog);
      setCurrentVisit(null);
      setTempVisitRecords([]);
      setView('history');
    } catch (err) {
      console.error(err);
      alert('終了の保存に失敗しました。');
    }
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
                <div className="last-record-hint">
                  前回データ: {getLastRecord(selectedMachine.id) ? (
                    selectedMachine.type === 'cardio' 
                      ? `${getLastRecord(selectedMachine.id).speed}km/h - ${getLastRecord(selectedMachine.id).time}分`
                      : `${getLastRecord(selectedMachine.id).weight}kg - ${getLastRecord(selectedMachine.id).reps}回`
                  ) : 'なし'}
                </div>
              </div>
              
              {selectedMachine.type === 'cardio' ? (
                <CardioForm 
                  onSubmit={handleAddRecord} 
                  initialData={getLastRecord(selectedMachine.id)} 
                />
              ) : (
                <WeightForm 
                  onSubmit={handleAddRecord} 
                  initialData={getLastRecord(selectedMachine.id)} 
                />
              )}
            </div>
          </div>
        )}

        {view === 'analysis' && (
          <AnalysisView records={records} visitLog={visitLog} user={user} />
        )}

        {view === 'record-edit' && selectedMachine && editingRecord && (
          <div className="view-record animate-fade">
            <button className="btn-back" onClick={() => { setView('history'); setEditingRecord(null); }}>← 戻る</button>
            <div className="glass-card record-form">
              <div className="form-header">
                <h2>{selectedMachine.name} (編集)</h2>
              </div>
              
              {selectedMachine.type === 'cardio' ? (
                <CardioForm onSubmit={handleUpdateRecord} initialData={editingRecord} />
              ) : (
                <WeightForm onSubmit={handleUpdateRecord} initialData={editingRecord} />
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
            <h2>履歴</h2>
            <div className="history-list">
              {[...visitLog, ...records].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((item) => (
                <div key={item.id} className={`glass-card history-item ${item.type === 'visit-summary' ? 'visit-log-summary' : ''}`}>
                  {item.type === 'visit-summary' ? (
                    <div className="visit-summary-content">
                      <div className="visit-header-simple">
                        <div className="visit-time-range">
                          {new Date(item.startTime).toLocaleString('ja-JP', {month:'short', day:'numeric', hour: '2-digit', minute:'2-digit'})} 
                          ～ 
                          {new Date(item.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className="visit-duration-simple">{item.duration}分</div>
                        <div className="visit-actions-simple">
                          <button className="btn-icon-delete" onClick={() => handleDeleteRecord(item.id, null, true)}>✕</button>
                        </div>
                      </div>
                      
                      <div className="visit-records-simple">
                        {item.records.map(rec => (
                          <div key={rec.id} className="visit-rec-row-simple">
                            <span className="rec-name-simple">{rec.machineName}</span>
                            <span className="rec-val-simple">
                              {rec.weight !== undefined ? `${rec.weight}kg / ${rec.reps}回` : `${rec.speed}km/h / ${rec.time}分`}
                            </span>
                            <button className="btn-rec-edit" onClick={() => handleEditRecord(rec, item.id)}>✎</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="item-info">
                        <div className="item-header-row">
                          <span className="item-name">{item.machineName}</span>
                          <div className="item-actions">
                            <button className="btn-icon-edit" onClick={() => handleEditRecord(item)}>✎</button>
                            <button className="btn-icon-delete" onClick={() => handleDeleteRecord(item.id)}>✕</button>
                          </div>
                        </div>
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
          <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>🏠 ホーム</button>
          <button className={view === 'analysis' ? 'active' : ''} onClick={() => setView('analysis')}>📊 分析</button>
          <button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>📜 履歴</button>
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
        .form-header { text-align: center; display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
        .last-record-hint { font-size: 0.8rem; color: var(--primary-color); opacity: 0.8; font-weight: 600; }
        .machine-img-large { width: 100%; border-radius: 12px; aspect-ratio: 1/1; object-fit: contain; background: #fff; padding: 10px; border: 1px solid var(--glass-border); }
        
        .view-success { height: 70vh; display: flex; align-items: center; justify-content: center; }
        .success-card { padding: 48px 32px; text-align: center; display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 300px; border-color: var(--success-color); }
        .success-icon { font-size: 4rem; margin-bottom: 8px; animation: bounce 0.5s ease; }
        @keyframes bounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }

        /* Analysis Styles */
        .view-analysis { display: flex; flex-direction: column; gap: 20px; padding-bottom: 20px; }
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .stat-card { padding: 16px; text-align: center; display: flex; flex-direction: column; gap: 4px; }
        .stat-card .val { font-size: 1.6rem; font-weight: 800; color: var(--primary-color); }
        .stat-card .lab { font-size: 0.75rem; color: var(--text-muted); }
        .machine-progress { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }
        .progress-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .prog-name { font-weight: 600; font-size: 0.9rem; }
        .prog-val { color: var(--primary-color); font-weight: 700; font-size: 1rem; }
        .prog-diff { font-size: 0.75rem; color: var(--success-color); margin-left: 4px; }

        .history-list { display: flex; flex-direction: column; gap: 12px; }
        .history-item { padding: 16px; display: flex; justify-content: space-between; align-items: center; position: relative; }
        .visit-log-summary { border-left: 4px solid var(--primary-color); padding: 0; overflow: hidden; margin-bottom: 8px; }
        .visit-summary-content { width: 100%; display: flex; flex-direction: column; }
        .visit-header-simple { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); }
        .visit-time-range { font-size: 0.9rem; font-weight: 700; color: #fff; }
        .visit-duration-simple { font-size: 0.85rem; color: var(--primary-color); font-weight: 800; margin-left: auto; margin-right: 12px; }
        .visit-actions-simple button { background: none; color: var(--danger-color); font-size: 0.9rem; opacity: 0.6; }
        .visit-records-simple { padding: 8px 16px 12px; display: flex; flex-direction: column; gap: 4px; }
        .visit-rec-row-simple { display: flex; align-items: center; font-size: 0.85rem; padding: 4px 0; color: var(--text-muted); }
        .rec-name-simple { font-weight: 500; flex: 1; }
        .rec-val-simple { color: var(--text-main); font-weight: 600; margin-right: 12px; }
        .btn-rec-edit { background: none; color: var(--primary-color); font-size: 0.8rem; opacity: 0.7; }

        .item-info { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .item-header-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .item-actions { display: flex; gap: 8px; }
        .btn-icon-edit, .btn-icon-delete { background: none; font-size: 1rem; padding: 4px 8px; border-radius: 6px; border: 1px solid transparent; }
        .btn-icon-edit { color: var(--primary-color); }
        .btn-icon-delete { color: var(--danger-color); }
        .btn-icon-edit:active, .btn-icon-delete:active { background: rgba(255, 255, 255, 0.05); }
        .item-name { font-weight: 600; }
        .item-date { font-size: 0.8rem; color: var(--text-muted); }
        .item-data { display: flex; gap: 12px; font-weight: 700; color: var(--primary-color); min-width: 100px; justify-content: flex-end; }
        .visit-duration { color: var(--accent-color); }

        .app-nav { position: fixed; bottom: 20px; left: 20px; right: 20px; height: 64px; display: flex; justify-content: space-around; align-items: center; padding: 0 12px; z-index: 100; }
        .app-nav button { background: none; color: var(--text-muted); font-weight: 600; font-size: 0.9rem; padding: 8px 16px; border-radius: 8px; }
        .app-nav button.active { color: var(--primary-color); font-weight: 700; background: rgba(255, 204, 0, 0.05); }

        .loading-screen { height: 100vh; display: flex; align-items: center; justify-content: center; color: var(--primary-color); font-weight: 700; font-size: 1.2rem; }
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [height, setHeight] = useState('170');
  const [weight, setWeight] = useState('65');

  return (
    <div className="auth-view animate-fade">
      <div className="glass-card auth-card">
        <h2>{view === 'login' ? 'ログイン' : '新規会員登録'}</h2>
        <div className="auth-desc">
          {view === 'login' ? 'メールアドレスとパスワードでログイン' : 'IDはメールアドレスになります。'}
        </div>
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
            <label>メールアドレス (ID)</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" />
          </div>
          <div className="input-group">
            <label>パスワード</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {view === 'register' && (
            <div className="input-group">
              <label>パスワード (確認用)</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再度入力してください" />
            </div>
          )}
          <button className="btn-primary" onClick={() => onAuth({ email, password, confirmPassword, username, height, weight }, view)}>
            {view === 'login' ? 'ログインする' : '登録する'}
          </button>
          <button className="btn-switch" onClick={() => { setView(view === 'login' ? 'register' : 'login'); }}>
            {view === 'login' ? 'アカウントをお持ちでない方はこちら' : 'ログインはこちら'}
          </button>
        </div>
      </div>
      <style jsx>{`
        .auth-view { min-height: 90vh; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }
        .auth-card { padding: 32px 20px; width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 20px; text-align: center; box-sizing: border-box; }
        .auth-desc { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px; }
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

function WeightForm({ onSubmit, initialData }) {
  const [weight, setWeight] = useState(initialData?.weight || 20);
  const [reps, setReps] = useState(initialData?.reps || 10);
  return (
    <div className="form-content">
      <Stepper label="重量 (kg)" value={weight} onChange={setWeight} step={5} min={0} />
      <Stepper label="回数 (reps)" value={reps} onChange={setReps} step={1} min={1} />
      <button className="btn-primary full-width" onClick={() => onSubmit({ weight, reps })}>
        {initialData ? '更新を保存する' : '記録を保存する'}
      </button>
      <style jsx>{`.full-width { width: 100%; margin-top: 12px; height: 56px; font-size: 1.1rem; }.form-content { display: flex; flex-direction: column; gap: 24px; }`}</style>
    </div>
  );
}

function AnalysisView({ visitLog, user, records }) {
  // Monthly Chart: Jan to Dec order
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const currentYear = new Date().getFullYear();
  
  const monthlyCounts = months.map(m => {
    const count = visitLog.filter(v => {
      const vDate = new Date(v.timestamp);
      return vDate.getFullYear() === currentYear && 
             vDate.toLocaleString('ja-JP', {month: 'short'}) === m;
    }).length;
    return { month: m, count };
  });

  const maxVisitCount = Math.max(...monthlyCounts.map(m => m.count), 1);

  // Weight Chart Data (Last 10 entries)
  const weightData = records
    .filter(r => r.currentWeight)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-10);

  const weights = weightData.map(d => parseFloat(d.currentWeight));
  const minW = Math.min(...weights, 0) * 0.9;
  const maxW = Math.max(...weights, 100) * 1.1;

  // Get unique machines used
  const allRecs = visitLog.flatMap(v => v.records);
  const uniqueMachines = [...new Set(allRecs.map(r => r.machineName))];

  return (
    <div className="view-analysis animate-fade">
      <div className="glass-card chart-container">
        <h3>月間ジム回数 ({currentYear}年)</h3>
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
        <div className="line-chart-container">
          <div className="line-chart">
            {weightData.map((d, i) => {
              const x = (i / (weightData.length - 1)) * 100;
              const y = ((parseFloat(d.currentWeight) - minW) / (maxW - minW)) * 100;
              return (
                <div key={i} className="line-point" style={{ left: `${x}%`, bottom: `${y}%` }}>
                  <div className="point-val">{d.currentWeight}kg</div>
                  <div className="point-dot"></div>
                </div>
              );
            })}
            {weightData.length < 2 && <p className="empty-msg">体重の記録が不足しています</p>}
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '20px' }}>
        <h3>成長の記録</h3>
        <div className="machine-progress">
          {uniqueMachines.slice(0, 5).map(name => {
            const mRecs = allRecs.filter(r => r.machineName === name);
            const latest = mRecs[0];
            return (
              <div key={name} className="progress-row">
                <span className="prog-name">{name}</span>
                <div className="prog-data">
                  <span className="prog-val">{latest.weight || latest.speed}{latest.weight ? 'kg' : 'km/h'}</span>
                </div>
              </div>
            );
          })}
          {uniqueMachines.length === 0 && <p className="empty-msg">まだトレーニング記録がありません</p>}
        </div>
      </div>
      <style jsx>{`
        .chart-container { padding: 16px 8px; margin-bottom: 12px; }
        .bar-chart { display: flex; justify-content: space-around; align-items: flex-end; height: 120px; margin-top: 16px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .bar-column { display: flex; flex-direction: column; align-items: center; flex: 1; gap: 4px; height: 100%; min-width: 15px; }
        .bar-wrapper { width: 10px; height: 100%; display: flex; align-items: flex-end; background: rgba(255,255,255,0.02); border-radius: 2px; }
        .bar { width: 100%; background: var(--primary-color); border-radius: 2px 2px 0 0; transition: height 0.6s ease-out; }
        .bar-val { font-size: 0.55rem; font-weight: 800; color: var(--primary-color); }
        .bar-label { font-size: 0.55rem; color: var(--text-muted); }

        .line-chart-container { height: 150px; margin-top: 24px; position: relative; padding: 0 20px; }
        .line-chart { width: 100%; height: 100%; position: relative; border-bottom: 1px solid rgba(255,255,255,0.1); border-left: 1px solid rgba(255,255,255,0.1); }
        .line-point { position: absolute; transform: translate(-50%, 50%); }
        .point-dot { width: 8px; height: 8px; background: var(--primary-color); border-radius: 50%; box-shadow: 0 0 10px var(--primary-color); }
        .point-val { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 0.65rem; color: #fff; white-space: nowrap; font-weight: 700; }
      `}</style>
    </div>
  );
}

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
