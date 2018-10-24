import errorStackParser from 'error-stack-parser';
import xhr from 'xhr';
import { mult } from '../utils';
import parser from '../factLog/factLogDslParser';
import ast from '../factLog/factLogAst';
import evaluateProgram from './evaluateProgram';
import FactLogDb from '../factLog/FactLogDb';
const acorn = require('acorn');

const state = (window.$state = {
  runningProgramsByNumber: {},
  claims: [],
  whens: [],
  toKnowWhens: [],
  errors: [],
  matches: [],
  logs: [],
});

const ghostPages = [
  getGhostPage('canvas', require('./core/canvas.js')),
  getGhostPage('geometry', require('./core/geometry.js')),
  getGhostPage('whisker', require('./core/whisker.js')),
  getGhostPage('illumination', require('./core/illumination.js')),
];

function getGhostPage(name, fn) {
  return {
    isGhostPage: true,
    number: name,
    currentCode: `(${fn.toString()})();`,
  };
}

function reportError({ source, isDynamic, error }) {
  const stackFrame = errorStackParser.parse(error);
  const myFrame =
    stackFrame.find(({ fileName }) => fileName.endsWith(`${source}.js`)) || stackFrame[0];

  state.errors.push({
    source,
    isDynamic,
    message: error.message,
    isInFile: myFrame.fileName.endsWith(`${source}.js`),
    lineNumber: myFrame.lineNumber,
    columnNumber: myFrame.columnNumber,
  });
}

function reportErrorMessage({
  source,
  isDynamic,
  message,
  isInFile = true,
  lineNumber,
  columnNumber,
}) {
  state.errors.push({
    source,
    isDynamic,
    isInFile,
    message,
    lineNumber,
    columnNumber,
  });
}

const programHelperFunctions = {
  getClaimTagFunction: ({ source, isDynamic }) => (literals, ...params) => {
    const undefinedArgIndex = params.findIndex(v => v === undefined);

    if (undefinedArgIndex !== -1) {
      throw new Error(
        `Claim can't contain 'undefined' values: argument ${undefinedArgIndex + 1} is undefined`
      );
    }

    const claim = parser.parseClaim({ literals, params, source, isDynamic });
    state.claims.push(claim);
  },

  getWishTagFunction: ({ source, isDynamic }) => (literals, ...params) => {
    const claim = parser.parseWishClaim({ literals, params, source, isDynamic });
    state.claims.push(claim);
  },

  getWhenTagFunction: ({ source, isDynamic, groupMatches }) => (literals, ...params) => {
    const stackFrame = errorStackParser.parse(new Error());
    const originalCall = stackFrame.find(({ fileName }) => fileName.endsWith(`${source}.js`));

    const claims = parser.parseWhenClaims({ literals, params });

    return callback => {
      const when = ast.when({ claims, callback, isDynamic, source, groupMatches });

      if (originalCall) {
        when.lineNumber = originalCall.lineNumber;
      }

      state.whens.push(when);
    };
  },

  getToKnowWhenTagFunction: ({ source, isDynamic }) => (literals, ...params) => {
    const stackFrame = errorStackParser.parse(new Error());
    const originalCall = stackFrame.find(({ fileName }) => fileName.endsWith(`${source}.js`));
    const claims = parser.parseWhenClaims({ literals, params });

    if (claims.length > 1) {
      throw new Error("ToKnowWhen can't contain multiple claimns");
    }

    return callback => {
      const toKnowWhen = ast.toKnowWhen({ claim: claims[0], callback, isDynamic, source });

      if (originalCall) {
        toKnowWhen.lineNumber = originalCall.lineNumber;
      }

      state.toKnowWhens.push(toKnowWhen);
    };
  },

  getLogFunction: ({ source, isDynamic }) => (...values) => {
    const stackFrame = errorStackParser.parse(new Error());
    const originalCall = stackFrame.find(({ fileName }) => fileName.endsWith(`${source}.js`));

    if (!originalCall) {
      return;
    }

    state.logs.push({ source, values, lineNumber: originalCall.lineNumber, isDynamic });
  },
  reportError,
  reportErrorMessage,
  acorn,
};

function main() {
  const programsToRun = getProgramsToRun();
  //const markers = JSON.parse(localStorage.paperProgramsMarkers || '[]')

  updatePrograms(programsToRun);

  evaluateClaimsAndWhens();

  requestAnimationFrame(main);
}

main();

function getProgramsToRun() {
  const programs = JSON.parse(localStorage.paperProgramsProgramsToRender || '[]');

  return programs;

  //return ghostPages.concat(programs);
}

function updatePrograms(programsToRun) {
  const { runningProgramsByNumber, claims, whens, errors, logs, matches } = state;

  const programsToRunByNumber = {};
  const programsToClearByNumber = {};
  const nextRunningProgramsByNumber = {};

  programsToRun.forEach(program => {
    programsToRunByNumber[program.number] = program;
  });

  programsToRun.forEach(program => {
    // start program if new
    if (!runningProgramsByNumber[program.number]) {
      nextRunningProgramsByNumber[program.number] = program;
      evaluateProgram.apply({ ...programHelperFunctions, program }, program);

      // restart program if code has changed
    } else if (
      program.currentCodeHash !== runningProgramsByNumber[program.number].currentCodeHash
    ) {
      nextRunningProgramsByNumber[program.number] = program;
      programsToClearByNumber[program.number] = program;
      evaluateProgram.apply({ ...programHelperFunctions, program }, program);
    }
  });

  // check if running programs should be terminated
  Object.keys(runningProgramsByNumber).forEach(programNumber => {
    if (!programsToRunByNumber[programNumber]) {
      programsToClearByNumber[programNumber] = runningProgramsByNumber[programNumber];
      return;
    }

    nextRunningProgramsByNumber[programNumber] = programsToRunByNumber[programNumber];
  });

  state.whens = whens.filter(({ source }) => !programsToClearByNumber[source]);
  state.claims = claims.filter(({ source }) => !programsToClearByNumber[source]);
  state.errors = errors.filter(({ source }) => !programsToClearByNumber[source]);
  state.logs = logs.filter(({ source }) => !programsToClearByNumber[source]);
  state.matches = matches.filter(({ source }) => !programsToClearByNumber[source]);

  state.runningProgramsByNumber = nextRunningProgramsByNumber;
}

function baseClaim(name, args) {
  return ast.constantClaim({ name, args, source: 'core' });
}

function evaluateClaimsAndWhens() {
  const db = new FactLogDb();

  state.claims.forEach(claim => {
    db.addClaim(claim);
  });

  // base claims

  db.addClaim(baseClaim('current time is @', [Date.now()]));
  db.addClaim(baseClaim('@ is a @', ['table', 'supporter']));
  db.addClaim(
    baseClaim('@ has corner points @', [
      'table',
      {
        topLeft: { x: 0, y: 0 },
        topRight: { x: document.body.clientWidth, y: 0 },
        bottomRight: { x: document.body.clientWidth, y: document.body.clientHeight },
        bottomLeft: { x: 0, y: document.body.clientHeight },
      },
    ])
  );

  const multPoint = { x: document.body.clientWidth, y: document.body.clientHeight };

  Object.values(state.runningProgramsByNumber).forEach(program => {
    // base paper claims

    db.addClaim(baseClaim('@ is a @', [program.number, 'program']));
    db.addClaim(baseClaim('@ is on supporter @', [program.number, 'table']));

    if (program.points) {
      db.addClaim(
        baseClaim('@ has corner points @', [
          program.number,
          {
            topLeft: mult(program.points[0], multPoint),
            topRight: mult(program.points[1], multPoint),
            bottomRight: mult(program.points[2], multPoint),
            bottomLeft: mult(program.points[3], multPoint),
          },
        ])
      );
    }
  });

  // custom claims

  // reset match count
  state.whens.forEach(when => {
    when.count = 0;
  });

  state.toKnowWhens.forEach(toKnowWhen => {
    toKnowWhen.count = 0;
  });

  const allWhens = state.whens.slice();
  let currentWhens = allWhens;
  const allToKnowWhens = state.toKnowWhens.slice();

  // reset dynamic claims, whens, errors, matches, logs and toKnowWhens
  state.whens = state.whens.filter(({ isDynamic }) => !isDynamic);
  state.claims = state.claims.filter(({ isDynamic }) => !isDynamic);
  state.errors = state.errors.filter(({ isDynamic }) => !isDynamic);
  state.logs = state.logs.filter(({ isDynamic }) => !isDynamic);
  state.toKnowWhens = state.toKnowWhens.filter(({ isDynamic }) => !isDynamic);
  state.matches = [];

  // register to know whens

  allToKnowWhens.forEach(({ claim }) => {
    db.captureMissingClaims(claim);
  });

  let hasSettled;

  do {
    hasSettled = true;

    // evaluate whens
    currentWhens = currentWhens.filter(currentWhen => {
      const { source, claims, callback, groupMatches } = currentWhen;
      const matches = db.query(claims);

      if (matches.length === 0) {
        return true;
      }

      currentWhen.count += matches.length;

      try {
        if (groupMatches) {
          callback(matches);
          return false;
        }

        matches.forEach(match => callback(match));
      } catch (error) {
        reportError({ source, isDynamic: true, error });
        return false;
      }
    });

    // evaluate to know whens
    allToKnowWhens.forEach(currentToKnowWhen => {
      const { claim, callback, source } = currentToKnowWhen;
      const matches = db.getMissingClaimsMatchesByName(claim.name);

      if (matches.length === 0) {
        return;
      }

      currentToKnowWhen.count += matches.length;

      try {
        const claimsOffset = state.claims.length;
        const whensOffset = state.whens.length;

        matches.forEach(match => callback(match));

        if (claimsOffset === state.claims.length && whensOffset === state.whens.length) {
          return;
        }

        console.log(claimsOffset === state.claims.length, whensOffset === state.whens.length);

        debugger;

        hasSettled = false;

        for (let i = claimsOffset; i < state.claims.length; i++) {
          db.addClaim(state.claims[i]);
        }

      } catch (error) {
        debugger;
        reportError({ source, isDynamic: true, error });
      }
    });
  } while (!hasSettled);

  // push final matches

  allWhens.forEach(({ groupMatches, lineNumber, source, callback, count }) => {
    if (lineNumber !== undefined) {
      state.matches.push({ source, count, lineNumber });
    }

    if (groupMatches && count === 0) {
      try {
        callback([]);
      } catch (error) {
        reportError({ source, isDynamic: true, error });
      }
    }
  });

  allToKnowWhens.forEach(({ lineNumber, source, count }) => {
    if (lineNumber !== undefined) {
      state.matches.push({ source, count, lineNumber });
    }
  });
}

// error reporting

setInterval(() => {
  Object.values(state.runningProgramsByNumber)
    .filter(({ isGhostPage }) => !isGhostPage)
    .forEach(program => {
      const debugData = {
        matches: state.matches.filter(({ source }) => source === program.number),
        errors: state.errors.filter(({ source }) => source === program.number),
        logs: state.logs.filter(({ source }) => source === program.number),
      };

      xhr.put(program.debugUrl, { json: debugData }, () => {});
    });
}, 300);
