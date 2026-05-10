import React, { useState } from 'react';

function AuthView({ view, setView, onAuth, error, loading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [height, setHeight] = useState('170');
  const [weight, setWeight] = useState('65');
  const [bodyFat, setBodyFat] = useState('20');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = view === 'login' 
      ? { email, password } 
      : { email, password, confirmPassword, username, height, weight, bodyFat };
    onAuth(payload, view);
  };

  return (
    <div className="auth-view animate-fade">
      <div className="glass-card auth-card">
        <h2>{view === 'login' ? 'ログイン' : '新規会員登録'}</h2>
        <div className="auth-desc">
          {view === 'login' ? 'メールアドレスとパスワードでログイン' : 'IDはメールアドレスになります。'}
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          {view === 'register' && (
            <>
              <div className="input-group">
                <label>ユーザー名</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ニックネーム" autoComplete="username" />
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
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" autoComplete="email" />
          </div>
          <div className="input-group">
            <label>パスワード</label>
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                autoComplete={view === 'login' ? "current-password" : "new-password"}
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
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再度入力してください" autoComplete="new-password" />
            </div>
          )}
          <button 
            type="submit"
            className={`btn-primary ${loading ? 'btn-loading' : ''}`} 
            disabled={loading}
          >
            {loading ? '通信中...' : (view === 'login' ? 'ログインする' : '登録する')}
          </button>
          <button type="button" className="btn-switch" onClick={() => { setView(view === 'login' ? 'register' : 'login'); }}>
            {view === 'login' ? 'アカウントをお持ちでない方はこちら' : 'ログインはこちら'}
          </button>
        </form>
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
        .btn-primary { height: 56px; border-radius: 12px; font-weight: 700; margin-top: 8px; width: 100%; transition: all 0.2s; background: var(--primary-color); color: #000; border: none; }
        .btn-loading { opacity: 0.7; cursor: not-allowed; }
        .btn-switch { background: none; color: var(--primary-color); font-size: 0.85rem; margin-top: 10px; border: none; }
      `}</style>
    </div>
  );
}

export default AuthView;
