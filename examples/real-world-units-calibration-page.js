// real-world units calibration page

// ISO 7810 sets the size of a standard ID (ID-1) as 8.56 cm (3.370 in) wide and 5.398 cm (2.125 in) high

const instructions =
`You can use this page to set up real-world lengths for your table.

Use the calibration controls on the camera webpage to match the rectangle below to something the size of a standard ID or credit card (ISO 7810 ID-1):
  8.6 cm × 5.4 cm
  3 3⁄8 in × 2 1⁄8 in`;

When` ${you} has width {width} cm,
      ${you} has height {height} cm`
(({ width, height }) => {
  // This part is in pixels
  const textSize = 15;
  const illPixels = new Illumination(
    Shapes.text({
      x: 0,
      y: textSize,
      text: instructions,
      fill: 'orange',
      size: textSize, wrap: true
    }),
  );
  Wish` ${you} has illumination ${illPixels}`;

  // This part is in centimeters
  const id1Size = {x: 8.6, y: 5.4};
  const ill = new Illumination(
    Shapes.rect({
      x: width / 2 - id1Size.x / 2,
      y: height * 0.75 - id1Size.y / 2,
      width: id1Size.x,
      height: id1Size.y,
      fill: 'rgba(127,64,127,0.5)',
      stroke: 'rgba(255,128,255,1)'
    })
  );
  Wish` ${you} has illumination ${ill} in cm`;
});
