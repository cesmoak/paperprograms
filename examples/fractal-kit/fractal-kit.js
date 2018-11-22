// fractal kit

When` {someone} wishes {paper} shows a fractal`(({ paper }) => {
  Claim` ${paper} shows a fractal`;
  Wish` ${paper} has canvas with name ${'fractal'}`;
});

// Helpers

function map(x, min, max, minout, maxout) {
  return (x - min) / (max - min) * (maxout - minout) + minout;
}

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

const imageDatas = {};

function cachedImageData(canvas, paper) {
  const { width, height } = canvas;
  const ctx = canvas.getContext('2d');
  if (!imageDatas[paper]
      || imageDatas[paper].width !== width
      || imageDatas[paper].height !== height) {
    imageDatas[paper] = ctx.getImageData(0, 0, width, height);
  }
  const imageData = imageDatas[paper];
  return [imageData, ctx];
}

class Viewport {
  constructor(params, renderWidth, renderHeight) {
    this.renderWidth = renderWidth;
    this.renderHeight = renderHeight;
    this.aspectRatio = renderWidth / renderHeight;
    this.x = params.x;
    this.y = params.y;
    this.width = params.width;
    this.height = params.width / this.aspectRatio;
    this.left = params.x - params.width / 2;
    this.right = params.x + params.width / 2;
    this.top = params.y - this.height / 2;
    this.bottom = params.y + this.height / 2;
  }
  
  mapCoord(x, y) {
    const r = map(x, 0, this.renderWidth, this.left, this.right);
    const i = map(y, 0, this.renderHeight, this.top, this.bottom);
    return [r, i];
  }
}

// Palette setting

let palette = new Array(255).fill(0).map((v, i) => [i, 0, 255 - i]);

When` {someone} wishes fractals have palette {_palette}`(({ _palette }) => {
  palette = _palette;
  Claim` fractals have palette ${palette}`;
});

// Iteration count setting

let iterationCount = 100;
When` {someone} wishes fractals have {n} iterations`(({ n }) => {
  iterationCount = n;
});

// Magnification setting

let magnification = 2;

When` {someone} wishes fractal magnifiers zoom by {_magnification}`(({ _magnification }) => {
  magnification = _magnification;
});

const viewportParams = {};
function getViewport(fractal, paper, width, height) {
  viewportParams[paper] = viewportParams[paper] || fractal.initialViewportParams();
  return new Viewport(viewportParams[paper], width, height);
}

When` {paper} shows a fractal,
      {paper} has canvas {canvas} with name ${'fractal'},
      {someone} is a fractal {fractal},
      fractals have palette {palette}`(({ paper, canvas, fractal, palette }) => {
  const { width, height } = canvas;
  const [imageData, ctx] = cachedImageData(canvas, paper);
  const viewport = getViewport(fractal, paper, width, height);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const [r, i] = viewport.mapCoord(x, y);
      const result = fractal.evaluate(r, i, iterationCount);
      let rgba = [0, 0, 0, 0];
      if (result) {
        const iterations = clamp(fractal.remapIterationsForColor(result), 0, iterationCount);
        let index = Math.floor(map(iterations, 0, iterationCount, 0, palette.length - 1));
        const color = palette[index];
        rgba = [...color, 255];
      }
      imageData.data.set(rgba, (x + y * width) * 4);
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
});

When` {paper} shows a fractal,
      {paper} has width {paperWidth},
      {paper} has height {paperHeight},
      {paper} has zoom speed {speed} and center {center},
      {someone} is a fractal {fractal}
`(({ paper, paperWidth, paperHeight, speed, center, fractal }) => {
  const viewport = getViewport(fractal, paper, paperWidth, paperHeight);
  const [px, py] = viewport.mapCoord(center.x, center.y);
  
  const targetWidth = viewport.width - viewport.width / 2 * speed;
  const targetHeight = targetWidth / viewport.aspectRatio;
  const targetLeft = px - center.x / paperWidth * targetWidth;
  const targetRight = px + (paperWidth - center.x) / paperWidth * targetWidth;
  const targetTop = py - center.y / paperHeight * targetHeight;
  const targetBottom = py + (paperHeight - center.y) / paperHeight * targetHeight;
  const target = { x: (targetLeft + targetRight) / 2, y: (targetTop + targetBottom) / 2, width: targetWidth };
  
  const speedFactor = 0.03;
  viewportParams[paper].x += (target.x - viewport.x) * speedFactor;
  viewportParams[paper].y += (target.y - viewport.y) * speedFactor;
  viewportParams[paper].width += (target.width - viewport.width) * speedFactor;
});

// Zooming by pointing at another fractal frame

function distance(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

const lastPoints = {};
function steadyZoomPoint(point, zoomed) {
  const lastPoint = lastPoints[zoomed];
  if (lastPoint && distance(point, lastPoint) < 2) {
    point = lastPoint;
  }
  else {
    lastPoints[zoomed] = point;
  }
  return point;
}

const lastViewports = {};
function steadyViewport(sourceViewport, paper) {
  const lastViewport = lastViewports[paper];
  if (lastViewport && distance(sourceViewport, lastViewport) < 0.01) {
    sourceViewport = lastViewport;
  }
  else {
    lastViewports[paper] = sourceViewport;
  }
  return sourceViewport;
}

const dampening = {};
function dampen(key, value) {
  const arr = dampening[key] = dampening[key] || [];
  arr.push(value);
  if (arr.length > 10) {
    arr.shift();
  }
  const sum = arr.reduce((acc, curr) => acc + curr, 0);
  return sum / arr.length;
}

When` current time is {time},
      {zoomed} points at {paper} ending at point {point},
      {zoomed} shows a fractal,
      {paper} shows a fractal,
      {paper} has width {paperWidth},
      {paper} has height {paperHeight},
      {someone} is a fractal {fractal}
`(({ time, zoomed, paper, point, paperWidth, paperHeight, fractal }) => {
  const viewport = getViewport(fractal, paper, paperWidth, paperHeight);
  point = steadyZoomPoint(point, zoomed);
  const x = viewport.left + (point.x / paperWidth) * viewport.width;
  const y = viewport.top + (point.y / paperHeight) * viewport.height;
  const width = viewport.width / magnification;
  viewportParams[zoomed] = { x: dampen(`${zoomed}.x`, x), y: dampen(`${zoomed}.y`, y), width: dampen(`${zoomed}.width`, width) };
});
