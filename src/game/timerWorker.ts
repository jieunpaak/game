// Web Worker: 백그라운드 탭에서도 throttle 없이 60fps 유지
const MS = Math.round(1000 / 60);
setInterval(() => self.postMessage(null), MS);
