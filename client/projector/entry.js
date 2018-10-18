import errorStackParser from 'error-stack-parser';
import xhr from 'xhr';
import { mult } from '../utils';
import parser from '../factLog/factLogDslParser';
import ast from '../factLog/factLogAst';
import evaluateProgram from './evaluateProgram';
import FactLogDb from '../factLog/FactLogDb';

const state = (window.$state = {
  runningProgramsByNumber: {},
  claims: [],
  whens: [],
  errors: [],
});

const ghostPages = [
  getGhostPage('illumination', require('./core/canvas.js')),
  getGhostPage('geometry', require('./core/geometry.js')),
];

function getGhostPage(name, fn) {
  return {
    number: name,
    currentCode: `(${fn.toString()})();`,
  };
}

function reportError({ source, isDynamic, error }) {
  const stackFrame = errorStackParser.parse(error);

  state.errors.push({
    source,
    isDynamic,
    message: error.message,
    isInFile: stackFrame[0].fileName.endsWith(`${source}.js`),
    lineNumber: stackFrame[0].lineNumber,
    columnNumber: stackFrame[0].columnNumber,
  });
}

const programHelperFunctions = {
  getClaimTagFunction: ({ source, isDynamic }) => (literals, ...params) => {
    const claim = parser.parseClaim({ literals, params, source, isDynamic });
    state.claims.push(claim);
  },

  getWishTagFunction: ({ source, isDynamic }) => (literals, ...params) => {
    const claim = parser.parseWishClaim({ literals, params, source, isDynamic });
    state.claims.push(claim);
  },

  getWhenTagFunction: ({ source, isDynamic, groupMatches }) => (literals, ...params) => {
    const claims = parser.parseWhenClaims({ literals, params });

    return callback => {
      const when = ast.when({ claims, callback, isDynamic, source, groupMatches });
      state.whens.push(when);
    };
  },

  reportError,
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
  const { runningProgramsByNumber, claims, whens, errors } = state;

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
      db.addClaim(baseClaim('@ has center point @', [program.number, program.points.center]));
    }
  });

  // custom claims

  // reset dynamic claims, whens and errors

  const currentWhens = state.whens.slice();
  state.whens = state.whens.filter(({ isDynamic }) => !isDynamic);
  state.claims = state.claims.filter(({ isDynamic }) => !isDynamic);
  state.errors = state.errors.filter(({ isDynamic }) => !isDynamic);

  // evaluate whens

  currentWhens.forEach(({ claims, callback, groupMatches }) => {
    const matches = db.query(claims);

    if (groupMatches) {
      callback(matches);
      return;
    }

    matches.forEach(match => callback(match));
  });
}

// error reporting

setInterval(() => {
  Object.values(state.runningProgramsByNumber).forEach(program => {
    const debugData = {
      errors: state.errors.filter(({ source }) => source === program.number),
    };

    xhr.put(program.debugUrl, { json: debugData }, () => {});
  });
}, 300);
