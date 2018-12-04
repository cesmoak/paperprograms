/*globals Wish, When, WithAll */

module.exports = function() {
  WithAll` {someone} wishes {paper} has illumination {ill}`(matches => {
    WithAll` {someone} wishes {paper} has illumination {ill} in cm`(matchesCm => {
      WithAll` {someone} wishes {paper} has illumination {ill} in inches`(matchesInches => {
        const allMatches = [ ...matches, ...matchesCm, ...matchesInches ];
        const papers = new Set(allMatches.map(match => match.paper));
        papers.forEach(paper => {
          Wish`${paper} has canvas with name ${'illumination'}`;
        });
      });
    });
  });

  When` {paper} has canvas {canvas} with name ${'illumination'}`(({ paper, canvas }) => {
    WithAll` {someone} wishes ${paper} has illumination {ill}`(pixelMatches => {
      WithAll` {someone} wishes ${paper} has illumination {ill} in cm,
               ${paper} has {pixelsPerCm} pixels per cm`(cmMatches => {
        WithAll` {someone} wishes ${paper} has illumination {ill} in inches,
                 ${paper} has {pixelsPerInch} pixels per inch`(inchMatches => {
          if (pixelMatches.length > 0 || cmMatches.length > 0 || inchMatches.length > 0) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
      
            pixelMatches.forEach(({ ill }) => {
              ill.draw(ctx, {x: 1, y: 1});
            });
            cmMatches.forEach(({ ill, pixelsPerCm }) => {
              ill.draw(ctx, pixelsPerCm);
            });
            inchMatches.forEach(({ ill, pixelsPerInch }) => {
              ill.draw(ctx, pixelsPerInch);
            });
          }
        });
      });
    });
  });
};

/*eslint no-shadow: 0*/
const rect = ({ x, y, width, height, fill, stroke }) => ({
  x,
  y,
  width,
  height,
  fill,
  stroke,
  render(ctx) {
    ctx.save();
    ctx.beginPath();
    if (this.stroke) ctx.strokeStyle = this.stroke;
    if (this.fill) ctx.fillStyle = this.fill;
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
});

const ellipse = ({ x, y, width, height, fill, stroke }) => ({
  x,
  y,
  width,
  height,
  fill,
  stroke,
  render(ctx) {
    ctx.save();
    ctx.beginPath();
    if (this.stroke) ctx.strokeStyle = this.stroke;
    if (this.fill) ctx.fillStyle = this.fill;
    ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
});

const arc = ({ x, y, radius, startAngle, endAngle, anticlockwise, fill, stroke, lineWidth, lineCap, lineJoin }) => ({
  x,
  y,
  radius,
  startAngle,
  endAngle,
  anticlockwise,
  fill,
  stroke,
  lineWidth,
  lineCap,
  lineJoin,
  render(ctx) {
    ctx.save();
    ctx.beginPath();
    if (this.stroke) ctx.strokeStyle = this.stroke;
    if (this.fill) ctx.fillStyle = this.fill;
    if (this.lineWidth) ctx.lineWidth = this.lineWidth;
    if (this.linecap) ctx.lineCap = this.lineCap;
    if (this.lineJoin) ctx.lineJoin = this.lineJoin;
    ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
});

const polygon = ({ points, stroke, fill }) => ({
  points,
  stroke,
  fill,
  render(ctx) {
    ctx.save();
    ctx.beginPath();
    points.forEach(({ x, y }) => {
      ctx.lineTo(x, y);
    });
    ctx.closePath();
    if (this.stroke) ctx.strokeStyle = this.stroke;
    if (this.fill) ctx.fillStyle = this.fill;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
});

const fill = color => ({
  color,
  render(ctx) {
    ctx.fillStyle = color;
  },
});

const stroke = color => ({
  color,
  render(ctx) {
    ctx.strokeStyle = color;
  },
});

const lineStyle = (width, cap, join) => ({
  width,
  cap,
  join,
  render(ctx) {
    ctx.lineWidth = width;
    ctx.lineCap = cap;
    ctx.lineJoin = join;
  },
});

const text = ({ x, y, text, fill, size, fit = false, wrap = false }) => ({
  x,
  y,
  text,
  fill,
  size,
  fit,
  wrap,
  render(ctx) {
    ctx.save();
    ctx.font = `${this.size}px sans-serif`;
    if (this.fill) ctx.fillStyle = this.fill;
    this.text = this.text.toString();

    // In units of CSS pixels
    const maxWidth = ctx.canvas.clientWidth;
    let lines = this.text.split("\n");
    if (this.fit) {
      fitText(ctx, lines, this.x, this.y, maxWidth, this.size);
    }
    else if (this.wrap) {
      lines = wrapText(ctx, lines, this.x, this.y, maxWidth, this.size);
    }

    drawText(ctx, lines, this.x, this.y, this.size);
    ctx.restore();
  },
});

const line = ({ from, to, stroke }) => ({
  from,
  to,
  stroke,
  render(ctx) {
    ctx.save();
    if (this.stroke) ctx.strokeStyle = this.stroke;
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  },
});

window.Shapes = {
  line,
  rect,
  ellipse,
  polygon,
  fill,
  stroke,
  text,
  arc,
  lineStyle,
};

window.Illumination = function(...args) {
  this.shapes = args;

  this.draw = (ctx, scale) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'crimson';
    ctx.strokeStyle = 'crimson';
    ctx.lineWidth = 2 / scale.x;
    ctx.scale(scale.x, scale.y);
    this.shapes.forEach(shape => {
      shape.render(ctx);
    });
  };
};

function drawText(ctx, lines, x, y, lineHeight) {
  lines.forEach(line => {
    ctx.fillText(line, x, y);
    y += lineHeight;
  });
}

function fitText(ctx, lines, x, y, maxWidth, size) {
  lines.forEach(line => {
    let textWidth = ctx.measureText(line).width;
    while (textWidth > maxWidth - 2) {
      size--;
      ctx.font = `${size}px sans-serif`;
      textWidth = ctx.measureText(line).width;
    }
  });
}

// http: //www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/
function wrapText(ctx, lines, x, y, maxWidth, size) {
  const linesOut = [];
  for (let i = 0; i < lines.length; i++) {
    let line = '';
    const words = lines[i].split(' ');
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth) {
        linesOut.push(line);
        line = words[n] + ' ';
      }
      else {
        line = testLine;
      }
    }
    linesOut.push(line);
  }
  return linesOut;
}
