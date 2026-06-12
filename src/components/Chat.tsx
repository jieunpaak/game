import { useState, useEffect, useRef, useCallback } from 'react';
import { wsManager } from '../game/wsManager';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  ts: number;
}

interface Props {
  username: string;
}

function uid() { return Math.random().toString(36).slice(2); }

export function Chat({ username }: Props) {
  const [open,      setOpen]      = useState(true);
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState('');
  const [unread,    setUnread]    = useState(0);
  const [connState, setConnState] = useState(wsManager.connState);

  const sentIds    = useRef(new Set<string>());
  const listRef    = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const openRef    = useRef(open);
  const composing  = useRef(false);

  useEffect(() => { openRef.current = open; }, [open]);

  useEffect(() => {
    const unsubConn = wsManager.onConnState(setConnState);
    const unsubChat = wsManager.on<ChatMessage>('chat', msg => {
      if (sentIds.current.has(msg.id)) { sentIds.current.delete(msg.id); return; }
      setMessages(prev => [...prev.slice(-199), msg]);
      if (!openRef.current) setUnread(u => u + 1);
    });
    return () => { unsubConn(); unsubChat(); };
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { if (open) setUnread(0); }, [open]);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const msg: ChatMessage = { id: uid(), user: username, text, ts: Date.now() };
    setMessages(prev => [...prev.slice(-199), msg]);
    setInput('');
    sentIds.current.add(msg.id);
    wsManager.send('chat', msg);
  }, [input, username]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const dot = connState === 'open' ? '🟢' : connState === 'connecting' ? '🟡' : '🔴';

  return (
    <div className={`chat-panel ${open ? 'chat-open' : 'chat-closed'}`}>
      <button className="chat-header" onClick={() => setOpen(o => !o)}>
        <span>{dot} 채팅</span>
        {!open && unread > 0 && <span className="chat-badge">{unread}</span>}
        <span className="chat-toggle">{open ? '▼' : '▲'}</span>
      </button>

      {open && (
        <>
          <div className="chat-messages" ref={listRef}>
            {messages.length === 0 && <div className="chat-empty">아직 메시지가 없어요</div>}
            {messages.map(m => (
              <div key={m.id} className={`chat-msg ${m.user === username ? 'chat-msg-me' : ''}`}>
                <span className="chat-msg-user">{m.user}</span>
                <span className="chat-msg-text">{m.text}</span>
                <span className="chat-msg-time">{formatTime(m.ts)}</span>
              </div>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onCompositionStart={() => { composing.current = true; }}
              onCompositionEnd={() => { composing.current = false; }}
              onKeyDown={e => { if (e.key === 'Enter' && !composing.current) sendMessage(); }}
              placeholder="메시지 입력..."
              maxLength={200}
            />
            <button onClick={sendMessage}>전송</button>
          </div>
        </>
      )}
    </div>
  );
}
