import * as babel from 'babel-core';
import plugin from '../src/index';
import {testFixtures} from './util';

describe('Match snapshots of generated code for', () => {
  testFixtures((sourceCode) => {
    let output = babel.transform(sourceCode, {
      plugins: [plugin],
    });
    expect(output.code + '\n').toMatchSnapshot();
  });
});
