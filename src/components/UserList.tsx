import { useState, useEffect } from 'react';
import { wsManager } from '../game/wsManager';

interface UserInfo {
  user: string;
  role: 'host' | 'guest';
}

export function UserList() {
  const [users, setUsers] = useState<UserInfo[]>([]);

  useEffect(() => {
    const unsub = wsManager.on<UserInfo[]>('user_list', list => setUsers(list));
    return () => { unsub(); };
  }, []);

  if (users.length === 0) return null;

  return (
    <div className="user-list">
      <div className="user-list-title">접속자 {users.length}명</div>
      {users.map((u, i) => (
        <div key={i} className="user-list-item">
          <span className="user-list-role">{u.role === 'host' ? '👑' : '👁'}</span>
          <span className="user-list-name">{u.user}</span>
        </div>
      ))}
    </div>
  );
}
