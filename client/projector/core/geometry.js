/*globals When, Claim*/

module.exports = () => {
  // Geometry for projector space (pixels)

  When` {object} has corner points {points} `(({ object, points }) => {
    const size = averageDimensions(points);
    Claim` ${object} has width ${size.x}`;
    Claim` ${object} has height ${size.y}`;
  });

  When` {object} has corner points {points} `(({ object, points }) => {
    const centerPoint = averagePoints(...Object.values(points));
    Claim` ${object} has center point ${centerPoint}`;
  });

  // Geometry for world space (cm)

  When` {object} has corner points {points} in cm`(({ object, points }) => {
    const size = averageDimensions(points);
    Claim` ${object} has width ${size.x} cm`;
    Claim` ${object} has height ${size.y} cm`;
  });

  When` {object} has corner points {points} in cm`(({ object, points }) => {
    const centerPoint = averagePoints(...Object.values(points));
    Claim` ${object} has center point ${centerPoint} in cm`;
  });

  // Converting cm <=> pixels (programs only, not for table)

  When` {object} is a ${'program'},
        {object} has width {widthPixels},
        {object} has height {heightPixels},
        {object} has width {widthCm} cm,
        {object} has height {heightCm} cm`
  (({ object, widthPixels, widthCm, heightPixels, heightCm }) => {
    const pixelsPerCm = {
      x: widthPixels / widthCm,
      y: heightPixels / heightCm
    };
    Claim` ${object} has ${pixelsPerCm} pixels per cm`;
  });
  
  // Geometry for world space (inches)

  When` {object} has corner points {points} in inches`(({ object, points }) => {
    const size = averageDimensions(points);
    Claim` ${object} has width ${size.x} inches`;
    Claim` ${object} has height ${size.y} inches`;
  });

  When` {object} has corner points {points} in inches`(({ object, points }) => {
    const centerPoint = averagePoints(...Object.values(points));
    Claim` ${object} has center point ${centerPoint} in inches`;
  });

  // Converting inches <=> pixels (programs only, not for table)

  When` {object} is a ${'program'},
        {object} has width {widthPixels},
        {object} has height {heightPixels},
        {object} has width {widthInches} inches,
        {object} has height {heightInches} inches`
  (({ object, widthPixels, widthInches, heightPixels, heightInches }) => {
    const pixelsPerInch = {
      x: widthPixels / widthInches,
      y: heightPixels / heightInches
    };
    Claim` ${object} has ${pixelsPerInch} pixels per inch`;
  });

  function distance(point1, point2) {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
  }

  function averageNumbers(...numbers) {
    return numbers.reduce((curr, acc) => curr + acc, 0) / numbers.length;
  }

  function averagePoints(...points) {
    return dividePoint(
      points.reduce((curr, acc) => ({ x: curr.x + acc.x, y: curr.y + acc.y }), { x: 0, y: 0 }),
      { x: points.length, y: points.length }
    );
  }

  function dividePoint(numerator, denominator) {
    return { x: numerator.x / denominator.x, y: numerator.y / denominator.y };
  }

  function averageDimensions(points) {
    const width = averageNumbers(
      distance(points.topLeft, points.topRight),
      distance(points.bottomLeft, points.bottomRight)
    );
    const height = averageNumbers(
      distance(points.topRight, points.bottomRight),
      distance(points.topLeft, points.bottomLeft)
    );
    return {x: width, y: height};
  }
};
