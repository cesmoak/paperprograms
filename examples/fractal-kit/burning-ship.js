// burning ship

class BurningShip {
  evaluate(r, i, maxIterations=100) {
    const cr = r;
    const ci = i;
    let n = 0;
    for (; r * r + i * i < 4 && n < maxIterations; n++) {
      const tr = Math.abs(r * r - i * i + cr);
      const ti = Math.abs(2 * r * i) + ci;
      r = tr;
      i = ti;
    }
    if (n !== maxIterations) return [n, r, i];
  }

  remapIterationsForColor([n, r, i]) {
    return n;
  }
  
  initialViewportParams() {
    return { x: -0.5, y: 0, width: 3.25 };
  }
}

const burningShip = new BurningShip();

Claim` ${you} is a fractal ${burningShip}`;
