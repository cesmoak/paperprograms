export default function({ workerContext, getNextMessageId, messageCallbacks }) {
  function send(target, method, id, params) {
    const messageId = getNextMessageId();

    workerContext.postMessage({
      command: 'sound',
      sendData: { target, method, id, params },
      messageId,
    });

    return new workerContext.Promise(resolve => {
      messageCallbacks[messageId] = receivedData => {
        resolve(receivedData);
      };
    });
  }

  workerContext.sound = {
    Oscillator: async options => {
      const id = await send('Oscillator', 'new', null, options);
      return new Oscillator(id);
    },
  };

  class AudioNode {
    constructor(id) {
      this.__id = id;
    }

    toJSON() {
      return {
        id: this.__id,
      };
    }

    send(command, method, params) {
      return send(command, method, this.__id, params);
    }

    connect(node) {
      return this.send('AudioNode', 'connect', { node: node.toJSON() });
    }

    disconnect(node) {
      return this.send('AudioNode', 'disconnect', { node: node.toJSON() });
    }

    toMaster() {
      return this.send('AudioNode', 'toMaster');
    }
  }

  class Source extends AudioNode {
    constructor(id) {
      super(id);
    }

    start() {
      return this.send('Source', 'start');
    }

    stop() {
      return this.send('Source', 'stop');
    }
  }

  class Oscillator extends Source {
    constructor(id) {
      super(id);
    }
  }
}
