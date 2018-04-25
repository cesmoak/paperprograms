import uniqueId from 'lodash/uniqueId';
import isObject from 'lodash/isObject';
import Tone from 'tone';

const objectsStore = {};

function initProgram(programNumber) {
  // Source Node
  objectsStore[`Program[${programNumber}].AudioInput`] = {
    programNumber,
    object: new ThroughNode(),
  };

  // Output Node
  objectsStore[`Program[${programNumber}].AudioOutput`] = {
    programNumber,
    object: new ThroughNode(),
  };
}

function cleanupProgram(programNumber) {
  Object.entries(objectsStore).forEach(([objectId, entry]) => {
    if (entry.programNumber !== programNumber) {
      return;
    }

    entry.object.dispose();
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
    const other = objectsStore[node.id].object.__toneObj;
    this.__toneObj.connect(other);
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

  dispose() {
    this.__toneObj.dispose();
    this.__toneObj = null;
  }
}

class ThroughNode extends AudioNode {
  constructor() {
    super(new Tone.Panner()); // Panner is just a placeholder for an AudioNode that does nothing
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
  initProgram,
  cleanupProgram,
  runCommand,
};
