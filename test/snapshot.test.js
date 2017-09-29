import * as babel from 'babel-core';
import plugin from '../src/index';
import {onFixtures} from './util';

const HIGHER_ORDER_FUNCTION_NAMES = [
  'forEach',
  'map',
  'filter',
  'every',
  'some',
  'reduce',
];

describe('Match snapshots of generated code', () => {
  testFixtures((sourceCode) => {
    let output = babel.transform(sourceCode, {
      plugins: [plugin],
    });
    expect(output.code + '\n').toMatchSnapshot();
  });
});

function testFixtures(f) {
  onFixtures((fixtureName, sourceCode) => {
    describe(`of ${fixtureName}`, () => {
      HIGHER_ORDER_FUNCTION_NAMES.forEach(functionName => {
        test(`for ${functionName}.`, () => {
          let sourceCodeInstance = sourceCode.replace(/\bFUN\b/g, functionName);
          f(sourceCodeInstance);
        });
      });
    });
  });
}
