import uniqueId from 'lodash/uniqueId';
import Tone from 'tone/';

const objectsStore = {};

const connectionsByPaper = {};

function initProgram(programNumber) {
  connectionsByPaper[programNumber] = [];

  createObject({
    programNumber,
    constructorName: 'ThroughNode',
    params: [],
    objectId: `Program[${programNumber}].AudioInput`,
  });

  createObject({
    programNumber,
    constructorName: 'ThroughNode',
    params: [],
    objectId: `Program[${programNumber}].AudioOutput`,
  });
}

function cleanupProgram(programNumber) {
  Object.entries(objectsStore).forEach(([objectId, entry]) => {
    if (entry.programNumber !== programNumber) {
      return;
    }

    entry.object.dispose();
    delete objectsStore[objectId];
  });

  delete connectionsByPaper[programNumber];

  Object.entries(connectionsByPaper).forEach(([paperNumber, connectedPapers]) => {
    connectionsByPaper[paperNumber] = connectedPapers.filter(number => number !== programNumber);
  });
}

async function runCommand(command) {
  try {
    const { method, context } = command;

    // special case create new object
    if (method.name === 'new') {
      const [constructorName, ...params] = method.params;

      return createObject({
        programNumber: context.programNumber,
        constructorName,
        params,
      });
    }

    // special case return connected papers
    if (method.name === 'getConnectedPapers') {
      const [paperNumber] = method.params;
      return connectionsByPaper[paperNumber];
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
    const other = objectsStore[node.id].object;
    this.__toneObj.connect(other.__toneObj);

    if (
      this.__id.endsWith('AudioOutput') &&
      other.__id.endsWith('AudioInput') &&
      this.__programNumber !== other.__programNumber
    ) {
      connectionsByPaper[other.__programNumber].push(this.__programNumber);
    }
  }

  disconnect(node) {
    const other = objectsStore[node.id].object;

    this.__toneObj.disconnect(other.__toneObj);

    if (
      this.__id.endsWith('AudioOutput') &&
      other.__id.endsWith('AudioInput') &&
      this.__programNumber !== other.__programNumber
    ) {
      connectionsByPaper[other.__programNumber] = connectionsByPaper[other.__programNumber].filter(
        number => number !== this.__programNumber
      );
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

class DataNode extends AudioNode {
  getValue() {
    return this.__toneObj.getValue();
  }
}

class Waveform extends DataNode {
  constructor(options) {
    super(new Tone.Waveform(options));
  }
}

class FFT extends DataNode {
  constructor(options) {
    super(new Tone.FFT(options));
  }
}

class Meter extends DataNode {
  constructor(options) {
    super(new Tone.Meter(options));
  }

  getLevel() {
    return this.__toneObj.getLevel();
  }
}

const constructors = {
  // Source
  Oscillator,
  Microphone,

  // Effects
  PitchShift,

  // Visualization
  Waveform,
  FFT,
  Meter,

  // Misc
  ThroughNode,
};

function createObject({
  programNumber,
  constructorName,
  objectId = uniqueId(`Tone.${constructorName}`),
  params,
}) {
  const constructor = constructors[constructorName];
  const object = new constructor(...params);
  object.__id = objectId;
  object.__programNumber = programNumber;

  objectsStore[objectId] = { programNumber, object };

  return objectId;
}

export default {
  initProgram,
  cleanupProgram,
  runCommand,
};
