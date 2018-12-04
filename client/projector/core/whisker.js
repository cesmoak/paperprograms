/*globals WithAll, When, Claim, Wish */

module.exports = function() {
  const defaultWhiskerPriority = 500;
  const defaultWhiskerLengthCm = 12;

  When` {supporter} is a ${'supporter'}`(({ supporter }) => {
    Wish`${supporter} has canvas with name ${'whiskerCanvas'} and priority ${defaultWhiskerPriority}`;
  });

  When` {supporter} is a ${'supporter'},
        {supporter} has canvas {canvas} with name ${'whiskerCanvas'}`(data => {
    const { supporter, canvas } = data;

    WithAll` {someone} wishes {whiskerPaper} has whisker that points {direction}`(matches => {
      matches.forEach(({ whiskerPaper, direction }) => {
        Wish` ${whiskerPaper} has whisker that points ${direction} with length ${defaultWhiskerLengthCm} cm`;
      });
    });

    WithAll` {someone} wishes {whiskerPaper} has whisker that points {direction} with length {lengthInInches} inches`(matches => {
      matches.forEach(({ whiskerPaper, direction, lengthInInches }) => {
        const lengthInCm = lengthInInches * 2.54;
        Wish` ${whiskerPaper} has whisker that points ${direction} with length ${lengthInCm} cm`;
      });
    });

    const directionLookup = {
      up: { start: {x: 0.5, y: 0}, dir: {x: 0, y: -1} },
      right: { start: {x: 1, y: 0.5}, dir: {x: 1, y: 0} },
      down: { start: {x: 0.5, y: 1}, dir: {x: 0, y: 1} },
      left: { start: {x: 0, y: 0.5}, dir: {x: -1, y: 0} },
    };

    WithAll` {someone} wishes {whiskerPaper} has whisker that points {direction} with length {length} cm,
             {whiskerPaper} is on supporter ${supporter},
             {whiskerPaper} has width {width} cm,
             {whiskerPaper} has height {height} cm,
             {whiskerPaper} has point transform {paperCmToProjector} from paper cm to projector`(matches => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(255, 0, 0)';
      matches.forEach(({ width, height, direction, whiskerPaper, length, paperCmToProjector }) => {
        const result = directionLookup[direction];
        if (!result) return;
        const { start, dir } = result;
        const whiskerStartPaperCm = {x: start.x * width, y: start.y * height};
        const whiskerEndPaperCm = {
          x: start.x * width + dir.x * length,
          y: start.y * height + dir.y * length
        };
        const whiskerStart = paperCmToProjector.applyToPoint(whiskerStartPaperCm);
        const whiskerEnd = paperCmToProjector.applyToPoint(whiskerEndPaperCm);
        drawWhisker(ctx, whiskerStart, whiskerEnd);

        WithAll` {paper} is a ${'program'},
                 {paper} has point transform {projectorToPaperCm} from projector to paper cm,
                 {paper} has width {width} cm,
                 {paper} has height {height} cm,
                 {paper} has {pixelsPerCm} pixels per cm`(paperMatches => {
          paperMatches.forEach(({ paper, projectorToPaperCm, width, height, pixelsPerCm }) => {
            if (paper === whiskerPaper) return;
            const paperCm = projectorToPaperCm.applyToPoint(whiskerEnd);
            const isOnPaper = isWithin(paperCm.x, 0, width) && isWithin(paperCm.y, 0, height);
            if (isOnPaper) {
              Claim`${whiskerPaper} points at ${paper}`;
              const paperPoint = {x: paperCm.x * pixelsPerCm.x, y: paperCm.y * pixelsPerCm.y};
              const paperInches = {x: paperCm.x / 2.54, y: paperCm.y / 2.54};
              Claim`${whiskerPaper} points at ${paper} ending at point ${paperPoint}`;
              Claim`${whiskerPaper} points at ${paper} ending at point ${paperCm} in cm`;
              Claim`${whiskerPaper} points at ${paper} ending at point ${paperInches} in inches`;
            }
          });
        });
      });
    });
  });

  /* helper functions */

  function drawWhisker(ctx, start, end) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.closePath();
    ctx.stroke();
  }

  function isWithin(value, min, max) {
    return value >= min && value <= max;
  }
};
