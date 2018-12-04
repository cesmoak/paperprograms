import Matrix from 'node-matrices';
import { projectPoint, projectPoints } from './utils';

export class Transform {
  constructor(m) {
    this.matrix = m || Matrix.identity(3);
  }

  translate({ x, y }) {
    const m = new Matrix([1, 0, x], [0, 1, y], [0, 0, 1]).multiply(this.matrix);
    return new Transform(m);
  }

  rotate(angle) {
    const m = new Matrix(
      [Math.cos(angle), Math.sin(angle), 0],
      [-Math.sin(angle), Math.cos(angle), 0],
      [0, 0, 1]
    ).multiply(this.matrix);
    return new Transform(m);
  }

  scale({ x, y }) {
    const m = new Matrix([x, 0, 0], [0, y, 0], [0, 0, 1]).multiply(this.matrix);
    return new Transform(m);
  }

  transform(matrix) {
    const m = matrix.multiply(this.matrix);
    return new Transform(m);
  }

  inverse() {
    const m = this.matrix.inverse();
    return new Transform(m);
  }

  applyToPoint(point) {
    return projectPoint(point, this.matrix);
  }

  applyToPoints(points) {
    return projectPoints(points, this.matrix);
  }
}
