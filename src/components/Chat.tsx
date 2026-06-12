import { useState, useEffect, useRef, useCallback } from 'react';

interface ChatMessage {
  user: string;
  text: string;
  ts: number;
}

const STORAGE_KEY = 'chat_username';

function getUsername(): string {
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

function buildWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/chat`;
}

export function Chat() {
  const [open,     setOpen]     = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState('');
  const [username, setUsername] = useState(getUsername);
  const [naming,   setNaming]   = useState(!getUsername());
  const [nameInput,setNameInput]= useState('');
  const [unread,   setUnread]   = useState(0);

  const wsRef      = useRef<WebSocket | null>(null);
  const listRef    = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(buildWsUrl());
    wsRef.current = ws;

    ws.onmessage = e => {
      const msg: ChatMessage = JSON.parse(e.data);
      setMessages(prev => [...prev.slice(-199), msg]);
      setUnread(u => open ? 0 : u + 1);
    };

    ws.onerror = () => console.warn('Chat WS error');

    return () => ws.close();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Clear unread when opened
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const msg: ChatMessage = { user: username, text, ts: Date.now() };
    wsRef.current.send(JSON.stringify(msg));
    setInput('');
  }, [input, username]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  const saveName = () => {
    const name = nameInput.trim() || `플레이어${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem(STORAGE_KEY, name);
    setUsername(name);
    setNaming(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div className={`chat-panel ${open ? 'chat-open' : 'chat-closed'}`}>
      {/* Header */}
      <button className="chat-header" onClick={() => setOpen(o => !o)}>
        <span>💬 채팅</span>
        {!open && unread > 0 && <span className="chat-badge">{unread}</span>}
        <span className="chat-toggle">{open ? '▼' : '▲'}</span>
      </button>

      {open && (
        <>
          {/* Name setup overlay */}
          {naming ? (
            <div className="chat-naming">
              <p>닉네임을 입력하세요</p>
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                placeholder="닉네임"
                maxLength={16}
              />
              <button onClick={saveName}>확인</button>
            </div>
          ) : (
            <>
              {/* Message list */}
              <div className="chat-messages" ref={listRef}>
                {messages.length === 0 && (
                  <div className="chat-empty">아직 메시지가 없어요</div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.user === username ? 'chat-msg-me' : ''}`}>
                    <span className="chat-msg-user">{m.user}</span>
                    <span className="chat-msg-text">{m.text}</span>
                    <span className="chat-msg-time">{formatTime(m.ts)}</span>
                  </div>
                ))}
              </div>

              {/* Input row */}
              <div className="chat-input-row">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="메시지 입력..."
                  maxLength={200}
                />
                <button onClick={sendMessage}>전송</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
