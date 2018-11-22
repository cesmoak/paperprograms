// fps

const lastTimes = [];
const slidingWindowSize = 10;

When` current time is {time}`(({ time }) => {
  lastTimes.push(time);
  if (lastTimes.length > slidingWindowSize) {
    lastTimes.shift();
  }
  if (lastTimes.length === slidingWindowSize) {
    const dt = (lastTimes[9] - lastTimes[0]) / 1000;
    const avg = dt / slidingWindowSize;
    const fps = 1 / avg;
    const label = `${fps.toFixed(1)} fps`;
    Wish` ${you} is labelled ${label}`;
  }
});
