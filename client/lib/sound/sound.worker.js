export default function({ workerContext, getNextMessageId, messageCallbacks }) {
  function send({ method, context }) {
    const messageId = getNextMessageId();

    workerContext.postMessage({
      command: 'sound',
      sendData: { method, context },
      messageId,
    });

    return new workerContext.Promise(resolve => {
      messageCallbacks[messageId] = receivedData => {
        resolve(receivedData);
      };
    });
  }

  workerContext.sound = {
    Oscillator: async options => newObject('Oscillator', [options]),
    Microphone: async options => newObject('Microphone', [options]),
    PitchShift: async options => newObject('PitchShift', [options]),
    Waveform: async options => newObject('Waveform', [options]),
    FFT: async options => newObject('FFT', [options]),
    Meter: async options => newObject('Meter', [options]),

    input: (async () => {
      const paperNumber = await workerContext.paper.get('number');

      return new AudioNode(`Program[${paperNumber}].AudioInput`);
    })(),

    output: (async () => {
      const paperNumber = await workerContext.paper.get('number');

      return new AudioNode(`Program[${paperNumber}].AudioOutput`);
    })(),

    getConnectedPapers: async () => {
      const paperNumber = await workerContext.paper.get('number');

      return send({
        method: { name: 'getConnectedPapers', params: [paperNumber] },
      });
    },
  };

  async function newObject(constructorName, params) {
    const id = await send({
      method: { name: 'new', params: [constructorName].concat(params) },
      context: {},
    });

    return new constructors[constructorName](id);
  }

  class AudioNode {
    constructor(id) {
      this.__id = id;
    }

    toJSON() {
      return {
        id: this.__id,
      };
    }

    send(methodName, params) {
      return send({
        method: { name: methodName, params },
        context: { objectId: this.__id },
      });
    }

    async connect(node) {
      if (node.__id.endsWith('AudioOutput')) {
        AudioNode.outputCount++;

        if (AudioNode.soundWhisker === null) {
          AudioNode.soundWhisker = await AudioNode.getSoundWhisker();
        }
      }

      return this.send('connect', [node.toJSON()]);
    }

    disconnect(node) {
      if (node.__id.endsWith('AudioOutput')) {
        AudioNode.outputCount--;
        if (AudioNode.outputCount === 0 && AudioNode.soundWhisker !== null) {
          AudioNode.soundWhisker.destroy();
          AudioNode.soundWhisker = null;
        }
      }

      return this.send('disconnect', [node.toJSON()]);
    }

    toMaster() {
      return this.send('toMaster');
    }
  }

  AudioNode.outputCount = 0;
  AudioNode.soundWhisker = null;
  AudioNode.getSoundWhisker = async () => {
    const whisker = await workerContext.paper.get('whisker', { color: 'blue', direction: 'down' });
    const currentPaperNumber = await workerContext.paper.get('number');

    whisker.on('paperAdded', ({ paperNumber }) => {
      send({
        method: {
          name: 'connect',
          params: [{ id: `Program[${paperNumber}].AudioInput` }],
        },
        context: { objectId: `Program[${currentPaperNumber}].AudioOutput` },
      });
    });

    whisker.on('paperRemoved', ({ paperNumber }) => {
      send({
        method: {
          name: 'disconnect',
          params: [{ id: `Program[${paperNumber}].AudioInput` }],
        },
        context: { objectId: `Program[${currentPaperNumber}].AudioOutput` },
      });
    });

    return whisker;
  };

  class Source extends AudioNode {
    constructor(id) {
      super(id);
    }

    start() {
      return this.send('start');
    }

    stop() {
      return this.send('stop');
    }
  }

  class Oscillator extends Source {
    constructor(id) {
      super(id);
    }

    get frequency() {
      return this.send('getFrequency');
    }

    set frequency(value) {
      return this.send('setFrequency', [value]);
    }
  }

  class Microphone extends Source {
    constructor(id) {
      super(id);
    }

    open() {
      return this.send('open');
    }

    close() {
      return this.send('close');
    }
  }

  class PitchShift extends AudioNode {
    constructor(id) {
      super(id);
    }

    get pitch() {
      return this.send('getPitch');
    }

    set pitch(value) {
      return this.send('setPitch', [value]);
    }
  }

  class DataNode extends AudioNode {
    constructor(id) {
      super(id);
    }

    getValue() {
      return this.send('getValue');
    }
  }

  class Waveform extends DataNode {
    constructor(id) {
      super(id);
    }
  }

  class Meter extends DataNode {
    constructor(id) {
      super(id);
    }

    getLevel() {
      return this.send('getLevel');
    }
  }

  class FFT extends DataNode {
    constructor(id) {
      super(id);
    }
  }

  const constructors = {
    Oscillator,
    Microphone,
    PitchShift,
    Waveform,
    Meter,
    FFT,
  };
}
