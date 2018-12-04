import Matrix from 'node-matrices';
import { Transform } from '../transform';
import {
  cornerPointsArray,
  cornerPointsFromArray,
  negate,
  projectPoints,
  averageDimensions,
  forwardProjectionMatrixForPoints,
} from '../utils';
import { paperSizes } from '../constants';
import { shrinkDotSizeFactor, paperConfig } from './geometryConstants';

export function setupRealWorldUnitsForProgram(program, projectorUnitToWorldMatrix) {
  // Map projector unit to world cm
  program.pointsWorld = projectPoints(program.points, projectorUnitToWorldMatrix);
  // Matrix to map paper cm to projector unit
  program.paperCmToProjectorUnitMatrix = calculatePaperCmToProjectorUnitMatrix(program.pointsWorld, projectorUnitToWorldMatrix).data;
}

// Return a matrix to project from projector unit to world cm
export function updatedProjectorUnitToWorldMatrix(config, programsToRender) {
  let projectorUnitToWorldMatrix = config.projectorUnitToWorldMatrix
    ? new Matrix(...config.projectorUnitToWorldMatrix)
    : null;

  if (config.updateRealWorldUnits) {
    const program = programsToRender.find(({ number }) => number === config.realWorldUnitsCalibrationPaperNumber);
    if (program) {
      // In cm
      const paperSize = realWorldUnitsCalibrationPaperSize(config);
      projectorUnitToWorldMatrix = calculateProjectorUnitToWorldMatrix(program.projectionMatrix, paperSize);
    }
  }

  return projectorUnitToWorldMatrix;
}

function calculateProjectorUnitToWorldMatrix(projectorUnitToPaperUnitMatrix, worldScale) {
  const projectorUnitPoints = cornerPointsArray(1, 1);
  const xformToRotate = new Transform(projectorUnitToPaperUnitMatrix).scale(worldScale);
  const worldPoints = xformToRotate.applyToPoints(projectorUnitPoints);

  // Calculate the angle between the paper and the table
  const [topLeft, topRight,] = worldPoints;
  const topSideAngle = Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x);

  const xform = xformToRotate.rotate(-topSideAngle).translate(negate(topLeft));
  return xform.matrix;
}

function calculatePaperCmToProjectorUnitMatrix(pointsWorld, projectorUnitToWorldMatrix) {
  const size = averageDimensions(cornerPointsFromArray(pointsWorld));
  const paperUnitToPointsWorldMatrix = forwardProjectionMatrixForPoints(pointsWorld);
  const worldToProjectorUnitMatrix = projectorUnitToWorldMatrix.adjugate();
  const xform = new Transform()
    .scale({x: 1 / size.x, y: 1 / size.y}) // Convert paper cm => paper unit
    .transform(paperUnitToPointsWorldMatrix)
    .transform(worldToProjectorUnitMatrix);
  return xform.matrix;
}

// Calculate the size of the paper inside the dot frame
function realWorldUnitsCalibrationPaperSize(config) {
  // In units of postscript points
  const dimensions = paperSizes[config.realWorldUnitsCalibrationPaperSize || 'LETTER'];
  const { margin, circleRadius, titleOffset } = paperConfig;

  const expectedDotRegion = {
    x: dimensions[0] - (margin + circleRadius) * 2,
    y: dimensions[1] - (margin + circleRadius) * 2 - titleOffset,
  };
  const expectedScaledPaperRegion = {
    x: expectedDotRegion.x - (circleRadius * 2 * shrinkDotSizeFactor) * 2,
    y: expectedDotRegion.y - (circleRadius * 2 * shrinkDotSizeFactor) * 2,
  };

  const adjustment = {
    x: 100 / config.realWorldUnitsCalibrationXSizeAdjustment,
    y: 100 / config.realWorldUnitsCalibrationYSizeAdjustment
  };

  const pointsPerCm = 72 / 2.54;

  return {
    x: expectedScaledPaperRegion.x / pointsPerCm * adjustment.x,
    y: expectedScaledPaperRegion.y / pointsPerCm * adjustment.y
  };
}
