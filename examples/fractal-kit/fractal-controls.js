// fractal controls

function map(x, min, max, minout, maxout) {
  return (x - min) / (max - min) * (maxout - minout) + minout;
}

function mapLog(x, min, max, minout, maxout) {
  const minv = Math.log(minout);
  const maxv = Math.log(maxout);
  const scale = (maxv - minv) / (max - min);
  return Math.exp(minv + scale * (x - min));
}

function unmapLog(x, min, max, minout, maxout) {
  const minv = Math.log(min);
  const maxv = Math.log(max);
  const scale = (maxv - minv) / (maxout - minout);
  return (Math.log(x) - minv) / scale + minout;
}

const scales = {
  linear: { map, unmap: map },
  log: { map: mapLog, unmap: unmapLog },
};

function controlsContext(size, markers) {
  const sortedMarkers = Object.values(markers).sort((a, b) => a.position.x - b.position.x);
  return { x: 0, y: 0, size, markers: sortedMarkers };
}

const textSize = 15;
const inputHeight = 20;
const paddingBottom = 15;
const selectionForeground = 'rgba(128, 128, 0, 0.2)';
const background = 'rgba(128, 128, 0, 0.1)';
const foreground = 'rgba(128, 128, 0, 0.5)';

function label(ctx, text) {
  ctx.y += textSize;
  return Shapes.text({
    text,
    x: ctx.x, y: ctx.y,
    size: textSize, fit: true,
    fill: foreground,
  });
}

function inputRect(ctx, selectX, height) {
  const y = ctx.y;
  ctx.y += height;
  return [
    Shapes.rect({
      x: ctx.x, y, width: ctx.size.x - 1, height,
      fill: background, stroke: foreground,
    }),
    Shapes.rect({
      x: ctx.x, y, width: selectX, height,
      fill: selectionForeground, stroke: selectionForeground,
    })
  ];
}

function isWithin(value, min, max) {
  return value >= min && value <= max;
}

const lastMarkerXsMap = {};

function getMarkers(ctx, name, y, height) {
  const lastMarkerXs = lastMarkerXsMap[name] || [];
  lastMarkerXsMap[name] = lastMarkerXs;
  const found = [];
  for (const [index, marker] of Object.entries(ctx.markers)) {
    if (isWithin(marker.position.y, ctx.y + y, ctx.y + height)) {
      let x = marker.position.x;
      const lastMarkerX = lastMarkerXs[index];
      if (lastMarkerX && Math.abs(lastMarkerX - x) < 2) {
        x = lastMarkerX;
      }
      else {
        lastMarkerXs[index] = x;
      }
      found.push({ x, marker });
    }
  }
  return found;
}

function slider(ctx, name, scale, min, max, defaultValue, decimalPoints) {
  const markers = getMarkers(ctx, name, textSize, textSize + inputHeight);
  const imprecise = 
    markers.length === 0
    ? defaultValue
    : scales[scale].map(markers[0].x, 0, ctx.size.x, min, max);
  const value = +imprecise.toFixed(decimalPoints);

  const ill = new Illumination(
    label(ctx, `${name} = ${value}`),
    ...inputRect(ctx, scales[scale].unmap(value, min, max, 0, ctx.size.x), inputHeight),
  );
  Wish` ${you} has illumination ${ill}`;
  ctx.y += paddingBottom;
  
  return value;
}

// Palette colors

function labToRgb(lab) {
  let y = (lab[0] + 16) / 116,
      x = lab[1] / 500 + y,
      z = y - lab[2] / 200,
      r, g, b;

  x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16/116) / 7.787);
  y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16/116) / 7.787);
  z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16/116) / 7.787);

  r = x *  3.2406 + y * -1.5372 + z * -0.4986;
  g = x * -0.9689 + y *  1.8758 + z *  0.0415;
  b = x *  0.0557 + y * -0.2040 + z *  1.0570;

  r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1/2.4) - 0.055) : 12.92 * r;
  g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1/2.4) - 0.055) : 12.92 * g;
  b = (b > 0.0031308) ? (1.055 * Math.pow(b, 1/2.4) - 0.055) : 12.92 * b;

  return [
    Math.max(0, Math.min(1, r)) * 255 | 0, 
    Math.max(0, Math.min(1, g)) * 255 | 0, 
    Math.max(0, Math.min(1, b)) * 255 | 0
  ];
}

function rgbToLab(rgb) {
  var r = rgb[0] / 255,
      g = rgb[1] / 255,
      b = rgb[2] / 255,
      x, y, z;

  r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

function mixLab(a, b, f) {
  return [a[0] * (1 - f) + b[0] * f, a[1] * (1 - f) + b[1] * f, a[2] * (1 - f) + b[2] * f];
}

function multLuminance(color, luminance) {
  return [color[0] * luminance, color[1], color[2]];
}

function getColorStops(ctx, markers, canvas) {
  const colorStops = markers.map(marker => ({
    value: map(marker.x, 0, ctx.size.x, 0, 1),
    color: marker.marker.colorRGB
  }));
  colorStops.sort((a, b) => a.value - b.value);
  if (colorStops.length === 0) {
    colorStops[0] = { value: 0, color: [0, 0, 0, 255] };
    colorStops[1] = { value: 0.25, color: [255, 0, 0, 255] };
    colorStops[2] = { value: 1, color: [0, 0, 255, 255] };
  }
  else if (colorStops.length === 1) {
    colorStops[0].value = 0;
    colorStops[1] = { value: 1, color: colorStops[0].color };
  }
  else {
    colorStops[0].value = 0;
    colorStops[colorStops.length - 1].value = 1;
  }
  return colorStops;
}

function linearGradient(colorStops, size) {
  const colors = [];
  let stopIndex = 1;
  let stopA = colorStops[0];
  let stopB = colorStops[1];
  for (let x = 0; x < size; x++) {
    const fract = x / size;
    if (fract > stopB.value) {
      stopIndex += 1;
      stopA = stopB;
      stopB = colorStops[stopIndex];
    }
    const lab = mixLab(stopA.lab, stopB.lab, map(fract, stopA.value, stopB.value, 0, 1));
    const color = labToRgb(lab);
    colors.push(color);
  }
  return colors;
}

// Palette UI

let imageData;

function getImageData(canvas) {
  const canvasCtx = canvas.getContext('2d');
  if (!imageData || canvas.width !== imageData.width || canvas.height !== imageData.height) {
    imageData = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
  }
  return [canvasCtx, imageData];
}

function paletteMaker(ctx, name, luminance) {
  const markerHeight = 50;

  const canvasName = `palette-${name}`;
  Wish` ${you} has canvas with name ${canvasName}`;
  When` ${you} has canvas {canvas} with name ${canvasName}`(({ canvas }) => {
    const markers = getMarkers(ctx, name, textSize + inputHeight, textSize + inputHeight + markerHeight);
    const colorStops = getColorStops(ctx, markers, canvas);
    colorStops.forEach(stop => stop.lab = multLuminance(rgbToLab(stop.color), luminance));
    const palette = linearGradient(colorStops, ctx.size.x);

    const marks = colorStops.map(stop => {
      return Shapes.rect({
        x: ctx.x + stop.value * ctx.size.x, y: ctx.y + textSize + inputHeight,
        width: 1, height: inputHeight / 3,
        stroke: selectionForeground,
      });
    });

    const [canvasCtx, imageData] = getImageData(canvas);
    palette.forEach((color, x) => {
      for (let y = 0; y < inputHeight; y++) {
        const index = ctx.x + x + (ctx.y + textSize + y) * canvas.width;
        imageData.data.set([...color, 255], index * 4);
      }
    });
    canvasCtx.putImageData(imageData, 0, 0);
    
    const ill = new Illumination(
      label(ctx, name),
      ...marks,
      ...inputRect(ctx, 0, inputHeight),
      ...inputRect(ctx, 0, markerHeight),
    );
    Wish` ${you} has illumination ${ill}`;

    ctx.y += paddingBottom;

    Wish` fractals have palette ${palette}`;
  });
}

When` ${you} has width {paperWidth},
      ${you} has height {paperHeight},
      ${you} has markers {markers}`(({ paperWidth, paperHeight, markers }) => {
  const size = { x: Math.floor(paperWidth), y: Math.floor(paperHeight) };
  const ctx = controlsContext(size, markers);
  
  const iterations = slider(ctx, 'Iterations', 'log', 1, 512, 100, 0);
  Wish` fractals have ${iterations} iterations`;
  
  const magnification = slider(ctx, 'Magnification', 'linear', 1, 50, 4, 2);
  Wish` fractal magnifiers zoom by ${magnification}`;

  const luminance = slider(ctx, 'Luminance', 'linear', 0, 1, 1, 3);
  paletteMaker(ctx, 'Palette', luminance);
});
