import { useState } from 'react';
import { HOST_PASSWORD } from '../config';

export type Role = 'host' | 'guest';

interface Props {
  onLogin: (username: string, role: Role) => void;
  initialError?: string;
}

export function Login({ onLogin, initialError }: Props) {
  const [name,     setName]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState(initialError ?? '');

  const enter = (asHost: boolean) => {
    const trimmed = name.trim();
    if (!trimmed) { setError('닉네임을 입력해주세요'); return; }

    if (asHost) {
      if (password !== HOST_PASSWORD) { setError('비밀번호가 틀렸어요'); return; }
      onLogin(trimmed, 'host');
    } else {
      onLogin(trimmed, 'guest');
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-title">⚔️ 던전 크롤러</div>
        <div className="login-subtitle">닉네임을 입력하고 입장하세요</div>

        <input
          className="login-input"
          placeholder="닉네임"
          value={name}
          maxLength={16}
          autoFocus
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && enter(showPw)}
        />

        {showPw && (
          <input
            className="login-input"
            type="password"
            placeholder="방장 비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enter(true)}
          />
        )}

        {error && <div className="login-error">{error}</div>}

        <div className="login-buttons">
          {!showPw ? (
            <>
              <button className="login-btn-guest" onClick={() => enter(false)}>
                게스트로 입장
              </button>
              <button className="login-btn-host" onClick={() => setShowPw(true)}>
                방장으로 입장
              </button>
            </>
          ) : (
            <>
              <button className="login-btn-guest" onClick={() => setShowPw(false)}>
                뒤로
              </button>
              <button className="login-btn-host" onClick={() => enter(true)}>
                방장 입장
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
