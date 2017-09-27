import {readdirSync, readFileSync} from 'fs';

const FIXTURES_PATH = 'test/fixtures';
const HIGHER_ORDER_FUNCTION_NAMES = [
  'forEach',
  'map',
];

export function onFixtures(f) {
  readdirSync(FIXTURES_PATH)
      .filter(fixtureFile => fixtureFile !== '.DS_Store')
      .forEach(fixtureFile => {
        let fixturePath = [FIXTURES_PATH, fixtureFile].join('/');
        let sourceCode = readFileSync(fixturePath).toString();
        f(fixtureFile, sourceCode);
      });
}

export function testFixtures(f) {
  onFixtures((fixtureName, sourceCode) => {
    HIGHER_ORDER_FUNCTION_NAMES.forEach(functionName => {
      test(`${functionName}, ${fixtureName}`, () => {
        let sourceCodeInstance = sourceCode.replace(/\bFUN\b/g, functionName);
        f(sourceCodeInstance);
      });
    });
  });
}
