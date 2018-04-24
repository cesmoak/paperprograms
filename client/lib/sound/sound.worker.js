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
  }

  const constructors = {
    Oscillator,
  };
}
