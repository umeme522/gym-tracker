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

const INITIAL_MACHINES = [
  { id: 1, name: 'ラットプルダウン', icon: '🦅', type: 'weight' },
  { id: 2, name: 'チェストプレス', icon: '🥊', type: 'weight' },
  { id: 3, name: 'ショルダープレス', icon: '⬆️', type: 'weight' },
  { id: 4, name: 'レッグプレス', icon: '🦶', type: 'weight' },
  { id: 5, name: 'アダクション', icon: '🦵', type: 'weight' },
  { id: 9, name: 'アブダクション', icon: '🍑', type: 'weight' },
  { id: 6, name: 'ディップス', icon: '⬇️', type: 'weight' },
  { id: 7, name: 'バイセップスカール', icon: '💪', type: 'weight' },
  { id: 8, name: 'トレッドミル', icon: '🏃', type: 'cardio' },
];

function App() {
  const [view, setView] = useState('home');
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machines, setMachines] = useLocalStorage('gym-machines-v3', INITIAL_MACHINES);
  const [records, setRecords] = useState([]);
  const [visitLog, setVisitLog] = useState([]);
  const [currentVisit, setCurrentVisit] = useLocalStorage('gym-current-visit', null);
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [authError, setAuthError] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [lastWorkoutSummary, setLastWorkoutSummary] = useState(null);
  const [tempVisitRecords, setTempVisitRecords] = useLocalStorage('gym-temp-visit-records', []);
  const [loading, setLoading] = useState(true);

  // Sync with Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Session Check: 24h limit
        const loginTime = localStorage.getItem('gym_login_timestamp');
        if (loginTime) {
          const now = Date.now();
          const dayInMs = 24 * 60 * 60 * 1000;
          if (now - parseInt(loginTime) > dayInMs) {
            handleDemoLogout();
            return;
          }
        } else {
          localStorage.setItem('gym_login_timestamp', Date.now().toString());
        }

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
  const [authLoading, setAuthLoading] = useState(false);
  const handleAuthAction = async (profileData, type) => {
    setAuthLoading(true);
    setAuthError('');
    const email = profileData.email.toLowerCase().trim();
    const { password } = profileData;

    try {
      if (type === 'register') {
        const { confirmPassword, username, height, weight, bodyFat } = profileData;
        if (password !== confirmPassword) {
          setAuthError('パスワードが一致しません。');
          setAuthLoading(false);
          return;
        }
        
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const userData = { email, username, height, weight, bodyFat, createdAt: new Date().toISOString() };
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
      else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') setAuthError('メールアドレスまたはパスワードが正しくありません。');
      else setAuthError(`認証エラー: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveProfile = async (updatedData) => {
    try {
      const updatedUser = { ...user, ...updatedData };
      await setDoc(doc(db, 'users', user.uid), updatedUser);
      setUser(updatedUser);
      setView('home');
    } catch (error) {
      console.error('Error updating profile:', error);
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
      if (initial && !m.image?.includes('clean')) {
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
      
      // 動的にベースURLを取得
      const baseUrl = window.location.origin + window.location.pathname;
      const dateStr = new Date().toLocaleDateString('ja-JP', {month:'short', day:'numeric'});
      const machineNames = [...new Set(tempVisitRecords.map(r => r.machineName))].join('、');
      const shareText = `【本日のワークアウト】\n📅 ${dateStr}\n⏱️ 滞在: ${duration}分\n💪 実施: ${machineNames}\n\n#GymTracker で記録完了！\n${baseUrl}`;
      setLastWorkoutSummary(shareText);

      setCurrentVisit(null);
      setTempVisitRecords([]);
      setView('record-success'); // 履歴ではなく成功画面へ
    } catch (err) {
      console.error(err);
      alert('終了の保存に失敗しました。');
    }
  };

  const handleShare = async () => {
    if (!lastWorkoutSummary) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: '本日のワークアウト記録',
          text: lastWorkoutSummary
        });
      } catch (err) { console.error(err); }
    } else {
      await navigator.clipboard.writeText(lastWorkoutSummary);
      alert('クリップボードにコピーしました！SNSに貼り付けてシェアしてください。');
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
      </header>

      <main className="app-main">
        {!user ? (
          <AuthView view={authView} setView={setAuthView} onAuth={handleAuthAction} error={authError} loading={authLoading} />
        ) : (
          <React.Fragment>
        {view === 'home' && (
          <div className="view-home animate-fade">
            <div className="user-profile-minimal" onClick={() => setView('edit-profile')}>
              <div className="user-name-row">
                <span className="username">{user.username}様</span>
                <span className="edit-hint">名前を変更 ✎</span>
              </div>
              <div className="user-actions-minimal">
                <button className="btn-inquiry-trigger" onClick={() => setView('inquiry')}>お問い合わせ 💬</button>
                <button className="btn-logout-minimal" onClick={(e) => { e.stopPropagation(); handleDemoLogout(); }}>ログアウト</button>
              </div>
            </div>
            
            {currentVisit ? (
              <button className="btn-out-wide" onClick={handleCheckOut}>
                トレーニング終了 👋
                <small style={{display:'block', fontSize:'0.7rem', opacity:0.6, marginTop:4}}>
                  {new Date(currentVisit.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} 開始
                </small>
              </button>
            ) : (
              <button className="btn-in-wide" onClick={handleCheckIn}>トレーニング開始 💪</button>
            )}
            
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
                    <div className="machine-emoji-container">{m.icon}</div>
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
          <AnalysisView records={records} visitLog={visitLog} user={user} onUserUpdate={(updated) => setUser(updated)} />
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
          <NameEditView user={user} onSave={handleSaveProfile} onBack={() => setView('home')} />
        )}

        {view === 'inquiry' && (
          <InquiryView user={user} onBack={() => setView('home')} />
        )}

        {view === 'record-success' && (
          <div className="view-success animate-fade">
            <div className="glass-card success-card">
              <div className="success-icon">✅</div>
              <h2>記録完了！</h2>
              <p>お疲れ様でした💪</p>
              
              {lastWorkoutSummary && (
                <div className="share-section">
                  <div className="summary-preview">
                    {lastWorkoutSummary.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                  <button className="btn-share-main" onClick={handleShare}>成果をSNSでシェアする 📱</button>
                </div>
              )}
              
              <button className="btn-back-home" onClick={() => { setView('home'); setLastWorkoutSummary(null); }}>ホームに戻る</button>
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
                    <React.Fragment>
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
                          <React.Fragment>
                            <span className="item-weight">{item.weight} kg</span>
                            <span className="item-reps">{item.reps} 回</span>
                          </React.Fragment>
                        ) : (
                          <React.Fragment>
                            <span className="item-speed">{item.speed} km/h</span>
                            <span className="item-time">{item.time} 分</span>
                          </React.Fragment>
                        )}
                      </div>
                    </React.Fragment>
                  )}
                </div>
              ))}
              {(records.length === 0 && visitLog.length === 0) && <p className="empty-msg">記録がありません</p>}
            </div>
          </div>
        )}
      </React.Fragment>
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
        .app-container { width: 100%; max-width: 500px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; background: var(--bg-dark); position: relative; padding: 16px; padding-bottom: calc(80px + env(safe-area-inset-bottom)); padding-top: env(safe-area-inset-top); box-sizing: border-box; }
        .app-main { flex: 1; display: flex; flex-direction: column; gap: 12px; }
        .app-header h1 { font-size: 1.4rem; color: var(--primary-color); font-weight: 800; letter-spacing: 1px; margin: 0; }
        .btn-logout { background: none; color: var(--text-muted); font-size: 0.8rem; border: 1px solid var(--glass-border); padding: 4px 12px; border-radius: 6px; }

        .user-profile-header:hover { background: rgba(255,255,255,0.05); }
        .user-info { display: flex; flex-direction: column; gap: 12px; flex: 1; }
        .user-header-main { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; }
        .user-name-row { display: flex; align-items: baseline; gap: 8px; }
        .username { font-weight: 700; font-size: 1.2rem; }
        .edit-hint { font-size: 0.7rem; color: var(--primary-color); opacity: 0.8; font-weight: 600; }
        .btn-logout-top { background: none; color: var(--text-muted); font-size: 0.7rem; border: 1px solid var(--glass-border); padding: 4px 10px; border-radius: 6px; }
        .user-stats-row { display: flex; align-items: center; gap: 12px; }
        .user-stat { display: flex; align-items: baseline; gap: 4px; }
        .user-stat .lab { font-size: 0.7rem; color: var(--text-muted); }
        .user-stat .val { font-size: 1rem; font-weight: 800; color: var(--primary-color); }
        .user-stat .unit { font-size: 0.6rem; color: var(--text-muted); margin-left: 1px; }
        .user-stat-divider { width: 1px; height: 10px; background: rgba(255,255,255,0.1); }

        .status-section { padding: 20px; margin-bottom: 8px; }
        .visit-status { display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .status-badge { background: var(--glass-bg); padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; color: var(--text-muted); border: 1px solid var(--glass-border); }
        .status-badge.active { background: rgba(81, 207, 102, 0.1); color: var(--success-color); border-color: var(--success-color); }
        
        .visit-info { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%; }
        .info-row { display: flex; justify-content: space-between; width: 100%; max-width: 200px; align-items: center; }
        .visit-info .label { font-size: 0.8rem; color: var(--text-muted); }
        input, select, textarea { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--glass-border); background: rgba(255, 255, 255, 0.05); color: #fff; font-size: 16px; box-sizing: border-box; }
        input:focus { border-color: var(--primary-color); outline: none; box-shadow: 0 0 0 2px rgba(255, 204, 0, 0.2); }
        .glass-card { background: rgba(255, 255, 255, 0.03); border-radius: 16px; border: none; }
        .user-actions-minimal { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .btn-inquiry-trigger { background: none; border: none; color: var(--primary-color); font-size: 0.75rem; opacity: 0.8; padding: 4px 8px; }
        .btn-logout-minimal { background: none; border: none; color: var(--text-muted); font-size: 0.75rem; padding: 4px 8px; }
        
        .action-section { display: none; }
        .btn-in-wide { width: 100%; height: 80px; background: var(--primary-color); color: #000; border-radius: 12px; font-weight: 800; font-size: 1.5rem; border: none; margin: 12px 0; }
        .btn-out-wide { width: 100%; height: 80px; background: #333; color: #fff; border-radius: 12px; font-weight: 700; font-size: 1.3rem; border: none; margin: 12px 0; }
        
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .machine-card { background: rgba(255,255,255,0.03); border-radius: 16px; border: none; padding: 16px 8px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .machine-emoji-container { font-size: 2.2rem; }
        .machine-name { font-size: 0.75rem; font-weight: 600; color: #fff; text-align: center; line-height: 1.2; }

        .btn-back { background: none; color: var(--text-muted); margin-bottom: 12px; font-size: 0.9rem; padding: 8px 0; }
        .record-form { padding: 24px 16px; display: flex; flex-direction: column; gap: 20px; border-radius: 16px; }
        .form-header { text-align: center; display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
        .last-record-hint { font-size: 0.8rem; color: var(--primary-color); opacity: 0.8; font-weight: 600; }
        
        .view-success { height: 70vh; display: flex; align-items: center; justify-content: center; }
        .success-card { padding: 40px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px; width: 100%; max-width: 300px; border-color: var(--success-color); }
        .success-icon { font-size: 4rem; margin-bottom: 8px; animation: bounce 0.5s ease; }
        .share-section { width: 100%; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin: 10px 0; border: 1px solid var(--glass-border); }
        .summary-preview { font-size: 0.85rem; color: var(--text-muted); text-align: left; line-height: 1.6; margin-bottom: 16px; white-space: pre-wrap; }
        .btn-share-main { width: 100%; height: 50px; background: #1DA1F2; color: #fff; border-radius: 10px; font-weight: 700; border: none; }
        .btn-back-home { background: none; border: none; color: var(--text-muted); font-size: 0.9rem; text-decoration: underline; }
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

function AuthView({ view, setView, onAuth, error, loading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [height, setHeight] = useState('170');
  const [weight, setWeight] = useState('65');
  const [bodyFat, setBodyFat] = useState('20');
  const [showPassword, setShowPassword] = useState(false);

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
                <div className="form-row" style={{ display: 'flex', gap: '12px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>体重 (kg)</label>
                    <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>体脂肪 (%)</label>
                    <input type="number" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
                  </div>
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
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
              />
              <button 
                type="button" 
                className="btn-toggle-password" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🔒' : '👁️'}
              </button>
            </div>
          </div>
          {view === 'register' && (
            <div className="input-group">
              <label>パスワード (確認用)</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再度入力してください" />
            </div>
          )}
          <button 
            className={`btn-primary ${loading ? 'btn-loading' : ''}`} 
            disabled={loading}
            onClick={() => {
              const payload = view === 'login' 
                ? { email, password } 
                : { email, password, confirmPassword, username, height, weight, bodyFat };
              onAuth(payload, view);
            }}
          >
            {loading ? '通信中...' : (view === 'login' ? 'ログインする' : '登録する')}
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
        
        .password-input-wrapper { position: relative; width: 100%; }
        .password-input-wrapper input { padding-right: 48px; }
        .btn-toggle-password { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 1.2rem; cursor: pointer; opacity: 0.6; }
        
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; box-sizing: border-box; }
        .btn-primary { height: 56px; border-radius: 12px; font-weight: 700; margin-top: 8px; width: 100%; transition: all 0.2s; }
        .btn-loading { opacity: 0.7; cursor: not-allowed; }
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
          <button className="btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={() => onSave({ username })}>
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
          <button className="btn-primary" onClick={handleSend} disabled={sending} style={{ width: '100%', marginTop: '16px' }}>
            {sending ? '送信中...' : '送信する'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
        .point-val { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 0.65rem; color: #fff; white-space: nowrap; font-weight: 700; }
      `}</style>
    </div>
  );
}

function TrendChart({ data, label, color = '#ffcc00' }) {
  if (!data || data.length < 2) return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>体重の記録が不足しています（2件以上必要）</p>;
  
  const width = 300;
  const height = 120;
  const padding = 20;
  const vals = data.map(d => d.val);
  const min = Math.min(...vals) * 0.98;
  const max = Math.max(...vals) * 1.02;
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: padding + (i * (width - padding * 2)) / (data.length - 1),
    y: height - padding - ((d.val - min) * (height - padding * 2)) / range,
    val: d.val
  }));

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const cp1x = (points[i].x + points[i + 1].x) / 2;
    pathD += ` C ${cp1x} ${points[i].y}, ${cp1x} ${points[i + 1].y}, ${points[i + 1].x} ${points[i + 1].y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="trend-container">
      <div className="trend-header">
        <span className="trend-label">{label}</span>
        <div className="trend-stats">
          <span className="min-val">min: {Math.min(...vals).toFixed(1)}</span>
          <span className="max-val">max: {Math.max(...vals).toFixed(1)}</span>
        </div>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" />
        <path d={areaD} fill={`url(#grad-${label})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i} className="chart-point-group">
            <circle cx={p.x} cy={p.y} r="3" fill="#fff" stroke={color} strokeWidth="1.5" />
            {(i === points.length - 1 || p.val === Math.max(...vals) || p.val === Math.min(...vals)) && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="800">
                {p.val.toFixed(1)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <style jsx>{`
        .trend-container { margin-top: 10px; margin-bottom: 20px; }
        .trend-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .trend-label { font-size: 0.8rem; font-weight: 700; color: rgba(255,255,255,0.5); }
        .trend-stats { display: flex; gap: 8px; font-size: 0.7rem; color: var(--text-muted); }
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
