import {getTransformer} from './transformers';

let topLevelVisitor = {
  CallExpression: {
    exit(path) {
      // TODO support SKIP comment. necessary because methods may have same names of HOFs of array

      let cls = getTransformer(path);
      if (cls === null) {
        return;
      }

      if (cls.canApply(path)) {
        let transformer = new cls(path);
        transformer.apply();
      }
    }
  }
};

export default function () {
  return {
    visitor: topLevelVisitor,
  };
}
