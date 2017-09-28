import {readdirSync, readFileSync} from 'fs';

const FIXTURES_PATH = 'test/fixtures';

export function onFixtures(f) {
  readdirSync(FIXTURES_PATH)
      .filter(fixtureFile => fixtureFile !== '.DS_Store')
      .forEach(fixtureFile => {
        let fixturePath = [FIXTURES_PATH, fixtureFile].join('/');
        let sourceCode = readFileSync(fixturePath).toString();
        f(fixtureFile, sourceCode);
      });
}
