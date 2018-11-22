// mandelbrot

class Mandelbrot {
  evaluate(r, i, maxIterations=100) {
    const cr = r;
    const ci = i;
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
    return { x: -0.75, y: 0, width: 3.75 };
  }
}

const mandelbrot = new Mandelbrot();

Claim` ${you} is a fractal ${mandelbrot}`;
