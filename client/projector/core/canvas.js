/*globals WithAll, When, Claim */

module.exports = function() {
  const { getCssTransform } = require('../positioning');

  const defaultPriority = 100;

  // Limit canvas size so we don't create excessively large canvases that crash the browser tab when corners are incorrectly recognized
  const maxWidth = 1920;
  const maxHeight = 1080;

  WithAll` {someone} wishes {object} has canvas with name {canvasName} `(matches => {
    matches.forEach(({ object, canvasName }) => {
      Wish` ${object} has canvas with name ${canvasName} and priority ${defaultPriority}`;
    });
  });

  When` {someone} wishes {paper} has canvas with name {canvasName} and priority {priority},
        {paper} has corner points {points},
        {paper} has width {paperWidth},
        {paper} has height {paperHeight}`(
    ({ paper, paperWidth, paperHeight, points, canvasName, priority }) => {
      const width = Math.floor(Math.min(paperWidth, maxWidth));
      const height = Math.floor(Math.min(paperHeight, maxHeight));

      const canvas = getCanvasElement(paper, canvasName);
      canvas.style.zIndex = priority;
      canvas.width = width;
      canvas.height = height;
      canvas.style.transform = getCssTransform({
        points,
        paperWidth: width,
        paperHeight: height,
      });

      Claim`${paper} has canvas ${canvas} with name ${canvasName}`;
    }
  );

  WithAll` {someone} wishes {object} has canvas with name {canvasName} and priority {priority}`(matches => {
    const activeCanvasElements = {};
    matches.forEach(({ object, canvasName }) => {
      activeCanvasElements[`${object}[${canvasName}]`] = true;
    });

    // remove canvases which are not active
    Object.keys(canvasElements).forEach(key => {
      if (!activeCanvasElements[key]) {
        removeCanvasElementByKey(key);
      }
    });
  });

  // canvas creation

  const canvasElements = {};

  function getCanvasElement(object, name) {
    const key = `${object}[${name}]`;

    if (canvasElements[key]) {
      return canvasElements[key];
    }

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.transformOrigin = '0 0 0';
    document.body.appendChild(canvas);
    canvasElements[key] = canvas;

    return canvas;
  }

  function removeCanvasElementByKey(key) {
    if (!canvasElements[key]) {
      return;
    }

    document.body.removeChild(canvasElements[key]);
    delete canvasElements[key];
  }
};
