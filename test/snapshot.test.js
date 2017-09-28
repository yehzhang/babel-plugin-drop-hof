import * as babel from 'babel-core';
import plugin from '../src/index';
import {onFixtures} from './util';

const HIGHER_ORDER_FUNCTION_NAMES = [
  'forEach',
  'map',
];

describe('Match snapshots of generated code for', () => {
  testFixtures((sourceCode) => {
    let output = babel.transform(sourceCode, {
      plugins: [plugin],
    });
    expect(output.code + '\n').toMatchSnapshot();
  });
});

function testFixtures(f) {
  onFixtures((fixtureName, sourceCode) => {
    HIGHER_ORDER_FUNCTION_NAMES.forEach(functionName => {
      test(`${functionName}, ${fixtureName}`, () => {
        let sourceCodeInstance = sourceCode.replace(/\bFUN\b/g, functionName);
        f(sourceCodeInstance);
      });
    });
  });
}
