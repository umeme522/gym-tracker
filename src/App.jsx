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
  deleteDoc,
  limit
} from 'firebase/firestore';

// Components
import AuthView from './components/Auth/AuthView';
import AnalysisView from './components/Analysis/AnalysisView';
import InquiryView from './components/Support/InquiryView';
import NameEditView from './components/Profile/NameEditView';
import WeightForm from './components/Training/WeightForm';
import CardioForm from './components/Training/CardioForm';

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

    // Individual Records (Limit to last 50 for performance)
    const qRecords = query(
      collection(db, 'users', user.uid, 'records'), 
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsubRecords = onSnapshot(qRecords, (snapshot) => {
      setRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Visit Summaries (Limit to last 20 for performance)
    const qVisits = query(
      collection(db, 'users', user.uid, 'visitLogs'), 
      orderBy('timestamp', 'desc'),
      limit(20)
    );
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
    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newRecord = {
      id: uniqueId,
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
           const updatedRecords = visitDoc.data().records.map(r => {
             const recordId = r.id || r.timestamp;
             const targetId = editingRecord.id || editingRecord.timestamp;
             return recordId === targetId ? { ...r, ...data } : r;
           });
           await updateDoc(visitRef, { records: updatedRecords });
         }
      } else if (currentVisit && tempVisitRecords.some(r => (r.id || r.timestamp) === (editingRecord.id || editingRecord.timestamp))) {
        const updatedRecords = tempVisitRecords.map(r => 
          (r.id || r.timestamp) === (editingRecord.id || editingRecord.timestamp) ? { ...r, ...data } : r
        );
        setTempVisitRecords(updatedRecords);
        setEditingRecord(null);
        setView('home');
        return;
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
            const updatedRecords = visitDoc.data().records.filter(r => {
              const recordId = r.id || r.timestamp;
              return recordId !== id;
            });
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
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button className="btn-out-wide" onClick={handleCheckOut}>
                  トレーニング終了 👋
                  <small style={{display:'block', fontSize:'0.7rem', opacity:0.6, marginTop:4}}>
                    {new Date(currentVisit.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} 開始
                  </small>
                </button>

                {tempVisitRecords.length > 0 && (
                  <div className="temp-records-section animate-fade" style={{ marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--primary-color)', margin: '8px 0 12px 0', fontWeight: 800 }}>本日の実施済みワークアウト</h4>
                    <div className="history-list">
                      {tempVisitRecords.map((rec) => (
                        <div key={rec.id} className="glass-card history-item" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div className="item-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                            <div className="item-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <span className="item-name" style={{ fontWeight: '600' }}>{rec.machineName}</span>
                              <div className="item-actions" style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn-rec-edit" onClick={() => handleEditRecord(rec)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>✎</button>
                                <button className="btn-icon-delete" onClick={() => {
                                  if (window.confirm('この記録を削除しますか？')) {
                                    setTempVisitRecords(tempVisitRecords.filter(r => r.id !== rec.id));
                                  }
                                }} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>✕</button>
                              </div>
                            </div>
                            <div className="item-data" style={{ display: 'flex', gap: '12px', color: 'var(--primary-color)', fontWeight: '700', marginTop: '4px', justifyContent: 'flex-start' }}>
                              {rec.weight !== undefined ? (
                                <span style={{ fontSize: '0.9rem' }}>{rec.weight} kg / {rec.reps} 回 × {rec.sets || 3}セット</span>
                              ) : (
                                <span style={{ fontSize: '0.9rem' }}>{rec.speed} km/h / {rec.time} 分</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                    getLastRecord(selectedMachine.id).speed !== undefined
                      ? `${getLastRecord(selectedMachine.id).speed}km/h - ${getLastRecord(selectedMachine.id).time}分`
                      : `${getLastRecord(selectedMachine.id).weight}kg - ${getLastRecord(selectedMachine.id).reps}回 × ${getLastRecord(selectedMachine.id).sets || 3}セット`
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
            <button className="btn-back" onClick={() => { 
              setView(editingRecord.visitId ? 'history' : (currentVisit ? 'home' : 'history')); 
              setEditingRecord(null); 
            }}>← 戻る</button>
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
                              {rec.weight !== undefined ? `${rec.weight}kg / ${rec.reps}回 × ${rec.sets || 3}set` : `${rec.speed}km/h / ${rec.time}分`}
                            </span>
                            <button className="btn-rec-edit" onClick={() => handleEditRecord(rec, item.id)}>✎</button>
                            <button className="btn-rec-delete" onClick={() => handleDeleteRecord(rec.id || rec.timestamp, item.id)} style={{ background: 'none', color: 'var(--danger-color)', border: 'none', marginLeft: '8px', cursor: 'pointer', padding: '2px 6px', fontSize: '0.85rem' }}>✕</button>
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
                            <span className="item-reps">{item.reps} 回 × {item.sets || 3}set</span>
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

        .item-name { font-weight: 600; }
        .item-date { font-size: 0.8rem; color: var(--text-muted); }
        .item-data { display: flex; gap: 12px; font-weight: 700; color: var(--primary-color); min-width: 100px; justify-content: flex-end; }
        .visit-duration { color: var(--accent-color); }

        .app-nav { position: fixed; bottom: 20px; left: 20px; right: 20px; height: 64px; display: flex; justify-content: space-around; align-items: center; padding: 0 12px; z-index: 100; }
        .app-nav button { background: none; color: var(--text-muted); font-weight: 600; font-size: 0.9rem; padding: 8px 16px; border-radius: 8px; border: none; }
        .app-nav button.active { color: var(--primary-color); font-weight: 700; background: rgba(255, 204, 0, 0.05); }

        .loading-screen { height: 100vh; display: flex; align-items: center; justify-content: center; color: var(--primary-color); font-weight: 700; font-size: 1.2rem; }
        .empty-msg { text-align: center; color: var(--text-muted); margin-top: 40px; }
      `}</style>
    </div>
  );
}

export default App;
