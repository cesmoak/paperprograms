// zoomer

let zoomSpeed = 1;

When` ${you} has numerical value {value}`(({ value }) => {
  zoomSpeed = (value - 50) / 50; // in range (-1, 1)
});

Wish` ${you} has whisker that points ${'up'} with length ${300}`;
When` ${you} points at {paper} ending at point {point},
      {paper} is a fractal`(({ paper, point }) => {
  Claim` ${paper} has zoom speed ${zoomSpeed} and center ${point}`;
});
