import uniqueId from 'lodash/uniqueId';
import isObject from 'lodash/isObject';
import Tone from 'tone';

const objectsStore = {};

async function cleanupProgram(programmNumber) {
  const paperObjects = objectsStore[programmNumber];
  if (paperObjects === undefined) {
    return;
  }

  Object.values(paperObjects).forEach(object => object.destroy());

  delete objectsStore[programmNumber];
}

async function runCommand(command) {
  try {
    const { method, context } = command;

    // special case create new object
    if (method.name === 'new') {
      const [constructorName, ...params] = method.params;

      return createObject(context.programNumber, constructorName, params);
    }

    const paperObjects = objectsStore[context.programNumber];
    if (!paperObjects) {
      commandError(command, 'paper has no sound objects');
      return;
    }

    const obj = paperObjects[context.objectId];
    if (!obj) {
      commandError(command, "object with this id does't exist");
      return;
    }

    const methodFn = obj[method.name];
    if (!methodFn) {
      commandError(command, "method doesn't exist");
    }

    return methodFn.apply(obj, method.params);
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

  connect(self, node) {
    this.__toneObj.connect(objectsStore[node.id]);
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
}

const constructors = {
  Oscillator: Oscillator,
  AudioNode: AudioNode,
  Source: Source,
};

function createObject(programmNumber, constructorName, params) {
  const constructor = constructors[constructorName];
  const objectId = uniqueId(`Tone.${constructorName}`);
  const object = new (Function.prototype.bind.apply(constructor, params))();

  if (!objectsStore[programmNumber]) {
    objectsStore[programmNumber] = {};
  }

  objectsStore[programmNumber][objectId] = object;

  return objectId;
}

export default {
  runCommand,
  cleanupProgram,
};
