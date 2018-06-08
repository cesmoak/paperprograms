export default class Paper {
  constructor({ api, number, isOwnPaper = false }) {
    this._api = api;
    this._number = number;
    this._isOwnPaper = isOwnPaper;
  }

  async get(command, options) {
    const paper = (await this._api.get('papers'))[this._number];

    switch (command) {
      case 'number':
        return this._number;

      case 'data':
        return paper.data;

      case 'points':
        return paper.points;

      case 'whisker':
        return this._api.get('whisker', { ...options, paperNumber: this._number });

      case 'markers': {
        const markers = await this._api.get('markers');
        return markers.filter(({ paperNumber }) => paperNumber === this._number);
      }

      case 'canvas':
        return this._api.get('canvas', { ...options, number: this._number });

      default:
        throw new Error(`paper.get: unknown command "${command}"`);
    }
  }

  async set(command, data) {
    if (command !== 'data') {
      throw new Error(`paper.set: unknown command "${command}"`);
    }

    if (!this._isOwnPaper) {
      throw new Error('You can only change the data of your own paper');
    }

    await this._api.set('data', data);
  }
}
