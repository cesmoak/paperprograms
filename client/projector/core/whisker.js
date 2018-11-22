/*globals WithAll, When, Claim, Wish */

module.exports = function() {
  const { forwardProjectionMatrixForPoints, mult, projectPoint } = require('../../utils');

  function unprojectPoint(point, points, paperWidth, paperHeight) {
    const matrix = forwardProjectionMatrixForPoints(Object.values(points)).adjugate();
    return mult(projectPoint(point, matrix), { x: paperWidth, y: paperHeight });
  }

  const defaultWhiskerPriority = 500;
  const defaultWhiskerLength = 200;

  When` {supporter} is a ${'supporter'}`(({ supporter }) => {
    Wish`${supporter} has canvas with name ${'whiskerCanvas'} and priority ${defaultWhiskerPriority}`;
  });

  When` {supporter} is a ${'supporter'},
        {supporter} has canvas {canvas} with name ${'whiskerCanvas'}`(data => {
    const { supporter, canvas } = data;

    WithAll` {someone} wishes {whiskerPaper} has whisker that points {direction}`(matches => {
      matches.forEach(({ whiskerPaper, direction }) => {
        Wish` ${whiskerPaper} has whisker that points ${direction} with length ${defaultWhiskerLength}`;
      });
    });

    const directionLookup = {
      up: ['topLeft', 'topRight'],
      right: ['topRight', 'bottomRight'],
      down: ['bottomRight', 'bottomLeft'],
      left: ['bottomLeft', 'topLeft']
    };

    WithAll` {someone} wishes {whiskerPaper} has whisker that points {direction} with length {length},
             {whiskerPaper} is on supporter ${supporter},
             {whiskerPaper} has corner points {points}`(matches => {
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      matches.forEach(({ points, direction, whiskerPaper, length }) => {
        ctx.strokeStyle = 'rgba(255, 0, 0)';

        const pointNames = directionLookup[direction];
        if (!pointNames) return;
        const from = points[pointNames[0]];
        const to = points[pointNames[1]];
        const { whiskerStart, whiskerEnd } = drawWhisker(from, to, length, ctx);

        WithAll` {paper} has corner points {paperPoints},
                 {paper} has width {paperWidth},
                 {paper} has height {paperHeight},
                 {paper} is a ${'program'}`(paperMatches => {
          paperMatches.forEach(({ paper, paperPoints, paperWidth, paperHeight }) => {
            if (paper === whiskerPaper) {
              return;
            }
            if (intersectsPaper(whiskerStart, whiskerEnd, paperPoints)) {
              Claim`${whiskerPaper} points at ${paper}`;
              const paperPoint = unprojectPoint(whiskerEnd, paperPoints, paperWidth, paperHeight);
              Claim`${whiskerPaper} points at ${paper} ending at point ${paperPoint}`;
            }
          });
        });
      });
    });
  });

  /* helper functions */

  function drawWhisker(p1, p2, whiskerLength, ctx) {
    const { x: x1, y: y1 } = p1;
    const { x: x2, y: y2 } = p2;
    const whiskerStart = {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2,
    };
    const length = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
    const whiskerEnd = {
      x: whiskerStart.x + (y2 - y1) / length * whiskerLength,
      y: whiskerStart.y - (x2 - x1) / length * whiskerLength,
    };
    ctx.beginPath();
    ctx.moveTo(whiskerStart.x, whiskerStart.y);
    ctx.lineTo(whiskerEnd.x, whiskerEnd.y);
    ctx.closePath();
    ctx.stroke();
    return { whiskerStart, whiskerEnd };
  }

  function intersects(v1, v2, v3, v4) {
    const det = (v2.x - v1.x) * (v4.y - v3.y) - (v4.x - v3.x) * (v2.y - v1.y);
    if (det === 0) {
      return false;
    } else {
      const lambda = ((v4.y - v3.y) * (v4.x - v1.x) + (v3.x - v4.x) * (v4.y - v1.y)) / det;
      const gamma = ((v1.y - v2.y) * (v4.x - v1.x) + (v2.x - v1.x) * (v4.y - v1.y)) / det;
      return 0 < lambda && lambda < 1 && (0 < gamma && gamma < 1);
    }
  }

  function intersectsPaper(whiskerStart, whiskerEnd, points) {
    return (
      intersects(whiskerStart, whiskerEnd, points.topLeft, points.topRight) ||
      intersects(whiskerStart, whiskerEnd, points.topRight, points.bottomRight) ||
      intersects(whiskerStart, whiskerEnd, points.bottomRight, points.bottomLeft) ||
      intersects(whiskerStart, whiskerEnd, points.bottomLeft, points.topLeft)
    );
  }
};
