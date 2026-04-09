export function createTimer(durationMinutes, onTick, onEnd) {
  let remaining = durationMinutes * 60;
  let intervalId = null;

  function format(s) {
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  return {
    start() {
      onTick(format(remaining), false);
      intervalId = setInterval(() => {
        remaining--;
        const urgent = remaining <= 300; // 5 min warning
        onTick(format(remaining), urgent);
        if (remaining <= 0) { this.stop(); if (onEnd) onEnd(); }
      }, 1000);
    },
    stop() { if (intervalId) { clearInterval(intervalId); intervalId = null; } },
    reset() { this.stop(); remaining = durationMinutes * 60; onTick(format(remaining), false); }
  };
}
