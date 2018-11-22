// julia set

class JuliaSet {
  evaluate(r, i, maxIterations=100, cr=-0.7, ci=0.27015) {
    let n = 0;
    for (; r * r + i * i < 4 && n < maxIterations; n++) {
      const tr = r * r - i * i + cr;
      const ti = 2 * r * i + ci;
      r = tr;
      i = ti;
    }
    if (n !== maxIterations) return [n, r, i];
  }

  remapIterationsForColor([n, r, i]) {
    return n + 1 - Math.log(Math.log(Math.sqrt(r * r + i * i))) / Math.log(2);
  }
  
  initialViewportParams() {
    return { x: 0, y: 0, width: 3.25 };
  }
}

const juliaSet = new JuliaSet();

Claim` ${you} is a fractal ${juliaSet}`;
