import template from 'babel-template';
import * as t from 'babel-types';

const UNDEFINED = t.identifier('undefined');
const EMPTY_ARRAY_LITERAL = t.arrayExpression([]);

let buildLoopStatements = template(`
  var arrayIdentifier = arrayValue;
  functionDeclarationStatement
  preLoopStatements 
  for (var indexIdentifier = 0; indexIdentifier < arrayIdentifier.length; indexIdentifier++) {
    preCallbackStatements
    callbackStatement
    postCallbackStatements
  }
  postLoopStatements
`);

const buildVariableDeclarationStatement = template(`
  var identifier = initialization;
`);

class HigherOrderFunctionTransformer {
  constructor(path) {
    this.path = path;
    this.arrayIdentifier = path.scope.generateUidIdentifier('a');
    this.indexIdentifier = path.scope.generateUidIdentifier('i');
    this.functionIdentifier = path.scope.generateUidIdentifier('f');
    this.returnIdentifier = path.scope.generateUidIdentifier('z');
  }

  apply() {
    let statementPath = this.path.getStatementParent();
    statementPath.insertBefore(this._getTransformedLoopStatement());

    if (statementPath.isExpressionStatement({expression: this.path.node})) {
      statementPath.remove();
    } else {
      this.path.replaceWith(this.getReturnValue());
    }
  }

  _getTransformedLoopStatement() {
    return buildLoopStatements({
      arrayIdentifier: this.arrayIdentifier,
      arrayValue: this.path.get('callee').get('object').node,
      functionDeclarationStatement: this.getFunctionDeclarationStatement(),
      preLoopStatements: this.getPreLoopStatements(),
      indexIdentifier: this.indexIdentifier,
      preCallbackStatements: this.getPreCallbackStatements(),
      callbackStatement: this.getCallbackStatement(),
      postCallbackStatements: this.getPostCallbackStatements(),
      postLoopStatements: this.getPostLoopStatements(),
    });
  }

  getFunctionDeclarationStatement() {
    // TODO optimize: return null if `forEach(f)` and set `this.functionIdentifier` to `f`.
    return buildVariableDeclarationStatement({
      identifier: this.functionIdentifier,
      initialization: this.path.get('arguments.0').node,
    });
  }

  getCallbackStatement() {
    throw new Error('NotImplemented');
  }

  getPreCallbackStatements() {
    return [];
  }

  getPostCallbackStatements() {
    return [];
  }

  getPreLoopStatements() {
    return [];
  }

  getPostLoopStatements() {
    return [];
  }

  getReturnValue() {
    throw new Error('NotImplemented');
  }
}

class ForEachTransformer extends HigherOrderFunctionTransformer {
  getCallbackStatement() {
    return buildCallbackStatement({
      functionIdentifier: this.functionIdentifier,
      arrayIdentifier: this.arrayIdentifier,
      indexIdentifier: this.indexIdentifier,
    });
  }

  getReturnValue() {
    return UNDEFINED;
  }
}

const buildCallbackStatement = template(`
  functionIdentifier(arrayIdentifier[indexIdentifier], indexIdentifier, arrayIdentifier);
`);

class MapTransformer extends HigherOrderFunctionTransformer {
  constructor(path) {
    super(path);
    this.resultArrayIdentifier = path.scope.generateUidIdentifier('r');
  }

  getPreLoopStatements() {
    return [
      buildVariableDeclarationStatement({
        identifier: this.resultArrayIdentifier,
        initialization: EMPTY_ARRAY_LITERAL,
      }),
    ];
  }

  getCallbackStatement() {
    return buildCollectedCallbackStatement({
      returnIdentifier: this.returnIdentifier,
      functionIdentifier: this.functionIdentifier,
      arrayIdentifier: this.arrayIdentifier,
      indexIdentifier: this.indexIdentifier,
    });
  }

  getPostCallbackStatements() {
    return [
      buildArrayPushingStatement({
        arrayIdentifier: this.resultArrayIdentifier,
        itemIdentifier: this.returnIdentifier,
      }),
    ];
  }

  getReturnValue() {
    return this.resultArrayIdentifier;
  }
}

const buildCollectedCallbackStatement = template(`
  returnIdentifier = functionIdentifier(arrayIdentifier[indexIdentifier], indexIdentifier, arrayIdentifier);
`);

const buildArrayPushingStatement = template(`
  arrayIdentifier.push(itemIdentifier);
`);


const HIGHER_ORDER_FUNCTION_TRANSFORMER = {
  forEach: ForEachTransformer,
  map: MapTransformer,
  // TODO
  // filter: ,
  // some: ,
  // every: ,
  // reduce: ',
};

let topLevelVisitor = {
  CallExpression(path) {
    // TODO support SKIP comment. necessary because methods may have same names of HOFs of array

    // Check if potential higher order function is called with arguments of known length.
    let argumentsLength = path.node.arguments.length;
    if (argumentsLength !== 1 && argumentsLength !== 2) {
      return;
    }

    // Check if name of higher order function is known.
    let methodName = getCalleeMethodName(path);
    let cls = HIGHER_ORDER_FUNCTION_TRANSFORMER[methodName];
    if (cls === undefined) {
      return;
    }

    // Do not transform if in ternary
    if (path.findParent(path => path.isConditionalExpression())) {
      return;
    }

    let transformer = new cls(path);

    // TODO Optimization: unwrapping function
    // if (DropFunctionTransformer.canDropFunctionWrapper(path)) {
    //   transformer = new DropFunctionTransformer(transformer);
    // }

    transformer.apply();
  },
};

function getCalleeMethodName(path) {
  let calleePath = path.get('callee');
  if (!calleePath.isMemberExpression()) {
    return null;
  }

  if (calleePath.node.computed) {
    // Do not handle nodes like object[method]
    if (!calleePath.get('property').isLiteral()) {
      return null;
    }
    // handle nodes like object['forEach']
    return calleePath.node.property.value;
  } else {
    // handle nodes like object.forEach
    return calleePath.node.property.name;
  }
}

class DropFunctionTransformer extends HigherOrderFunctionTransformer {
  constructor(higherOrderFunctionTransformer) {
    super();
    this.transformer = higherOrderFunctionTransformer;
  }

  static canDropFunctionWrapper(callExpressionPath) {
    let hasThisArg = callExpressionPath.get('arguments').node.length === 2;
    if (hasThisArg) {
      return false;
    }
    // TODO Can remove function if inline, anonymous, and has no reference to arguments

  }

  getFunctionDeclarationStatement() {
    return null;
  }

  getCallbackStatement() {
    return null;
  }

  getPreCallbackStatements() {
    let statements = this.transformer.getPreCallbackStatements();

    // TODO drop function, assign returned value to returnIdentifier

    return statements;
  }

  getPostCallbackStatements() {
    return this.transformer.getPostCallbackStatements();
  }

  getPreLoopStatements() {
    return this.transformer.getPreLoopStatements();
  }

  getPostLoopStatements() {
    return this.transformer.getPostLoopStatements();
  }
}

export default function () {
  return {
    visitor: topLevelVisitor,
  };
}
