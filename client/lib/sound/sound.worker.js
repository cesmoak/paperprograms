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
  };

  var currentTargetPaperNumber = null;
  workerContext.paper.whenPointsAt({
    callback: async data => {
      const currentPaperNumber = await workerContext.paper.get('number');

      // disconnect output from previous paper if it was connected
      if (currentTargetPaperNumber !== null) {
        await send({
          method: {
            name: 'disconnect',
            params: [{ id: `Program[${currentTargetPaperNumber}].AudioInput` }],
          },
          context: { objectId: `Program[${currentPaperNumber}].AudioOutput` },
        });
      }

      if (data === null) {
        return;
      }

      // connect to new paper if there is a new paper
      currentTargetPaperNumber = data.paperNumber;

      await send({
        method: {
          name: 'connect',
          params: [{ id: `Program[${currentTargetPaperNumber}].AudioInput` }],
        },
        context: { objectId: `Program[${currentPaperNumber}].AudioOutput` },
      });
    },

    direction: 'right',
  });

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

    connect(node) {
      return this.send('connect', [node.toJSON()]);
    }

    disconnect(node) {
      return this.send('disconnect', [node.toJSON()]);
    }

    toMaster() {
      return this.send('toMaster');
    }
  }

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
