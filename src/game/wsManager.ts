type ConnState = 'connecting' | 'open' | 'closed';
type Handler<T = unknown> = (payload: T) => void;

class WsManager {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private _connState: ConnState = 'closed';
  private connListeners = new Set<(s: ConnState) => void>();

  connect() {
    if (this.ws && this.ws.readyState < 2) return;
    const url = import.meta.env.VITE_WS_URL
      ?? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/chat`;
    const ws = new WebSocket(url);
    this.ws = ws;
    this.setConn('connecting');

    ws.onopen  = () => this.setConn('open');
    ws.onerror = () => ws.close();
    ws.onclose = () => { this.setConn('closed'); setTimeout(() => this.connect(), 3000); };

    ws.onmessage = e => {
      try {
        const env = JSON.parse(e.data as string);
        this.handlers.get(env.type)?.forEach(h => h(env.payload));
      } catch { /* ignore malformed */ }
    };
  }

  private setConn(s: ConnState) {
    this._connState = s;
    this.connListeners.forEach(l => l(s));
  }

  get connState() { return this._connState; }

  onConnState(fn: (s: ConnState) => void) {
    this.connListeners.add(fn);
    return () => this.connListeners.delete(fn);
  }

  on<T>(type: string, handler: Handler<T>) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    (this.handlers.get(type) as Set<Handler<T>>).add(handler);
    return () => (this.handlers.get(type) as Set<Handler<T>>).delete(handler);
  }

  send(type: string, payload: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }
}

export const wsManager = new WsManager();
