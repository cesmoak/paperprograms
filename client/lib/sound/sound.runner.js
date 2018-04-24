import uniqueId from 'lodash/uniqueId';
import Tone from 'tone';

const toneObjects = {};

async function run(command) {
  try {
    const { target, method, id, params } = command;

    const targetObj = targets[target];
    if (!targetObj) {
      commandError(command, `target '${target}' doesn't exist`);
      return;
    }

    const methodFn = targetObj[method];
    if (!methodFn) {
      commandError(command, `method '${method}' doesn't exist`);
      return;
    }

    // special case 'new' constructor has no id param
    if (method === 'new') {
      return methodFn(params);
    }

    const self = toneObjects[id];
    if (self === undefined) {
      return commandError(command, `invalid id ${id}`);
    }

    return methodFn(self, params);
  } catch (e) {
    commandError(command, `RuntimeException ${JSON.stringify(e.stack)}`);
  }
}

function commandError(command, message) {
  const { target, method, id, params } = command;
  /*eslint no-console: ["error", { allow: ["error"] }] */
  console.error(
    `couldn't execute command ${target}.${method}( self = ${id}, ${JSON.stringify(
      params
    )}): ${message}`
  );
}

const targets = {
  Oscillator: {
    new: options => {
      const id = uniqueId('Tone.Oscillator');
      toneObjects[id] = new Tone.Oscillator(options);

      return id;
    },
  },

  AudioNode: {
    connect: (self, node) => {
      self.connect(toneObjects[node.id]);
    },

    disconnect: (self, node) => {
      self.disconnect(toneObjects[node.id]);
    },

    toMaster: self => {
      self.toMaster();
    },
  },

  Source: {
    start: self => {
      self.start();
    },

    stop: self => {
      self.stop();
    },
  },
};

export default {
  run,
};
