const maxDistance = 1.5;
const maxColorDistance = 40;

export function filterNoise(prevPoints, currPoints) {
  const filtered = currPoints.map(point =>
    prevPoints.find(last => isSameKeyPoint(last, point)) || point
  );
  
  prevPoints.length = 0;
  prevPoints.push(...filtered);
  
  return filtered;
}

function isSameKeyPoint(a, b, d) {
  return distanceSquared(a.pt, b.pt) < maxDistance ** 2 &&
    colorDistanceSquared(a.avgColor, b.avgColor) < maxColorDistance ** 2;
}

function distanceSquared(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function colorDistanceSquared(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}
