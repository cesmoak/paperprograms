import uniqueId from 'lodash/uniqueId';
import isObject from 'lodash/isObject';
import Tone from 'tone';

const objectsStore = {};

async function cleanupProgram(programmNumber) {
  Object.entries(objectsStore).forEach(([objectId, entry]) => {
    if (entry.programNumber !== programmNumber) {
      return;
    }

    entry.object.destroy();
    delete objectsStore[objectId];
  });
}

async function runCommand(command) {
  try {
    const { method, context } = command;

    // special case create new object
    if (method.name === 'new') {
      const [constructorName, ...params] = method.params;

      return createObject(context.programNumber, constructorName, params);
    }

    const entry = objectsStore[context.objectId];
    if (!entry) {
      commandError(command, "object with this id does't exist");
      return;
    }

    const methodFn = entry.object[method.name];
    if (!methodFn) {
      commandError(command, "method doesn't exist");
    }

    return methodFn.apply(entry.object, method.params);
  } catch (e) {
    commandError(command, `RuntimeException ${JSON.stringify(e.stack)}`);
  }
}

function commandError(command, message) {
  /*eslint no-console: ["error", { allow: ["error"] }] */
  console.error(`couldn't execute command ${JSON.stringify(command)}: ${message}`);
}

class AudioNode {
  constructor(toneObj) {
    this.__toneObj = toneObj;
  }

  connect(node) {
    this.__toneObj.connect(objectsStore[node.id].object.__toneObj);
  }

  disconnect(node) {
    if (!isObject(node)) {
      this.__toneObj.disconnect(node);
    } else {
      this.__toneObj.disconnect(objectsStore[node.id]);
    }
  }

  toMaster() {
    this.__toneObj.toMaster();
  }

  destroy() {
    this.__toneObj.disconnect();
    this.__toneObj = null;
  }
}

class Source extends AudioNode {
  constructor(toneObj) {
    super(toneObj);
  }

  start() {
    this.__toneObj.start();
  }

  stop() {
    this.__toneObj.stop();
  }
}

class Oscillator extends Source {
  constructor(options) {
    super(new Tone.Oscillator(options));
  }

  getFrequency() {
    return this.__toneObj.frequency.value;
  }

  setFrequency(value) {
    this.__toneObj.frequency.value = value;
  }

  getType() {
    return this.__toneObj.type;
  }

  setType(value) {
    this.__toneObj.type = value;
  }
}

class Microphone extends Source {
  constructor(options) {
    super(new Tone.UserMedia(options));
  }

  open() {
    this.__toneObj.open();
  }

  close() {
    this.__toneObj.close();
  }

  destroy() {
    this.__toneObj.close();
    super.destroy();
  }
}

class PitchShift extends AudioNode {
  constructor(options) {
    super(new Tone.PitchShift(options));
  }

  getPitch() {
    return this.__toneObj.pitch;
  }

  setPitch(value) {
    this.__toneObj.pitch = value;
  }
}

const constructors = {
  // Source
  Oscillator,
  Microphone,

  // Effects
  PitchShift,
};

function createObject(programNumber, constructorName, params) {
  const constructor = constructors[constructorName];
  const objectId = uniqueId(`Tone.${constructorName}`);

  const object = new constructor(...params);

  objectsStore[objectId] = { programNumber, object };

  return objectId;
}

export default {
  runCommand,
  cleanupProgram,
};
