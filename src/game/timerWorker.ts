// Web Lock: Chrome이 백그라운드에서 이 Worker를 throttle하지 못하도록 막음
// (Chrome 88+의 Intensive Wake Up Throttling 우회)
if ('locks' in navigator) {
  navigator.locks.request(
    'game-timer-lock',
    { mode: 'shared' },
    () => new Promise(() => {}), // lock을 영원히 유지
  );
}

const MS = Math.round(1000 / 60);
setInterval(() => self.postMessage(null), MS);
