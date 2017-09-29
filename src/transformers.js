import template from 'babel-template';
import * as t from 'babel-types';

const buildLoopStatements = template(`
  var arrayIdentifier = arrayValue;
  var indexIdentifier = 0;
  functionDeclarationStatement
  preLoopStatements 
  for (; indexIdentifier < arrayIdentifier.length; indexIdentifier++) {
    preCallbackStatements
    callbackStatement
    postCallbackStatements
  }
  postLoopStatements
`);

// TODO replace all with template? could template('[]') produce an ExpressionStatement?
const UNDEFINED = t.identifier('undefined');
const EMPTY_ARRAY_LITERAL = t.arrayExpression([]);
const ZERO = t.numericLiteral(0);
const FALSE = t.booleanLiteral(false);
const TRUE = t.booleanLiteral(true);

const buildInitializedVariableDeclarationStatement = template(`
  var identifier = initialization;
`);

const buildVariableDeclarationStatement = template(`
  var identifier;
`);

const buildArrayAccessExpression = template(`
  arrayIdentifier[indexIdentifier]
`);

const buildAssignmentStatement = template(`
  left = right;
`);

const buildStatement = template(`
  expression;
`);

const buildNegationExpression = template(`
  !value
`);

const buildThrowErrorStatement = template(`
  throw new TypeError(messageValue);
`);

/**
 * Transformers should be applied in exit() of a visitor.
 */
class HigherOrderFunctionTransformer {
  constructor(path) {
    this.path = path;
    this.arrayIdentifier = path.scope.generateUidIdentifier('a');
    this.indexIdentifier = path.scope.generateUidIdentifier('i');
    this.itemIdentifier = path.scope.generateUidIdentifier('e');
    this.functionIdentifier = path.scope.generateUidIdentifier('f');
  }

  static canApply(callExpressionPath) {
    // Check if potential higher order function is called with arguments of known length.
    let argumentsLength = callExpressionPath.node.arguments.length;
    if (!this.getValidArgumentsLengths().includes(argumentsLength)) {
      return false;
    }

    // Check if in short-circuitable places
    // TODO instead wrap in another function
    if (callExpressionPath.findParent(path => path.isConditionalExpression())) {
      return false;
    }
    if (this._isInSegmentOfDirectParentStatement(
            callExpressionPath,
            'isLogicalExpression',
            'right')) {
      return false;
    }

    // Check if in for loop test or update
    if (this._isInSegmentOfDirectParentStatement(callExpressionPath, 'isForStatement', 'test')
        || this._isInSegmentOfDirectParentStatement(callExpressionPath, 'isForStatement', 'update')
        || this._isInSegmentOfDirectParentStatement(callExpressionPath, 'isWhileStatement', 'test')
        || this._isInSegmentOfDirectParentStatement(
            callExpressionPath, 'isDoWhileStatement', 'test')) {
      return false;
    }

    return true;
  }

  static getValidArgumentsLengths() {
    // TODO handle thisArg
    return [1];
  }

  static _isInSegmentOfDirectParentStatement(path, parentPredicate, segment) {
    let statementPath = path.getStatementParent();
    for (let currPath = path; currPath !== statementPath; currPath = currPath.parentPath) {
      let extraPredicates = {};
      extraPredicates[segment] = currPath.node;
      if (currPath.parentPath[parentPredicate](extraPredicates)) {
        return true;
      }
    }
    return false;
  }

  apply() {
    let transformedStatements = this._getTransformedLoopStatement();
    if (this.path.parentPath.isExpressionStatement()) {
      // A bare HOF call like `array.forEach(...);`
      this.path.parentPath.replaceWithMultiple(transformedStatements);
    } else {
      // A HOF call whose return value is collected like `var result = array.map(...);`
      let statementPath = this.path.getStatementParent();
      statementPath.insertBefore(transformedStatements);
      this.path.replaceWith(this.getReturnValue());
    }

    // TODO skip transformed paths
    // transformedStatements.forEach(path.skip());
  }

  _getTransformedLoopStatement() {
    return buildLoopStatements({
      arrayIdentifier: this.arrayIdentifier,
      arrayValue: this.path.get('callee').get('object').node,
      indexIdentifier: this.indexIdentifier,
      functionDeclarationStatement: this.getFunctionDeclarationStatement(),
      preLoopStatements: this.getPreLoopStatements(),
      preCallbackStatements: this.getPreCallbackStatements(),
      callbackStatement: this.getCallbackStatement(),
      postCallbackStatements: this.getPostCallbackStatements(),
      postLoopStatements: this.getPostLoopStatements(),
    });
  }

  getFunctionDeclarationStatement() {
    // TODO optimize: return null if `forEach(f)` and set `this.functionIdentifier` to `f`.
    return buildInitializedVariableDeclarationStatement({
      identifier: this.functionIdentifier,
      initialization: this.path.get('arguments.0').node,
    });
  }

  getCallbackStatement() {
    throw new Error('NotImplemented');
  }

  getCallbackCallExpression() {
    return this.constructor.buildCallbackCallExpression({
      functionIdentifier: this.functionIdentifier,
      arrayIdentifier: this.arrayIdentifier,
      indexIdentifier: this.indexIdentifier,
      itemIdentifier: this.itemIdentifier,
    });
  }

  getPreCallbackStatements() {
    return [
      buildInitializedVariableDeclarationStatement({
        identifier: this.itemIdentifier,
        initialization: buildArrayAccessExpression({
          arrayIdentifier: this.arrayIdentifier,
          indexIdentifier: this.indexIdentifier,
        }),
      }),
    ];
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

HigherOrderFunctionTransformer.buildCallbackCallExpression = template(`
  functionIdentifier(itemIdentifier, indexIdentifier, arrayIdentifier);
`);

class ForEachTransformer extends HigherOrderFunctionTransformer {
  getCallbackStatement() {
    return buildStatement(this.getCallbackCallExpression());
  }

  getReturnValue() {
    return UNDEFINED;
  }
}

class CollectCallbackReturnTransformer extends HigherOrderFunctionTransformer {
  constructor(path) {
    super(path);
    this.collectorIdentifier = path.scope.generateUidIdentifier('z');
  }

  getPreCallbackStatements() {
    return super.getPreCallbackStatements().concat(
        [
          buildVariableDeclarationStatement({
            identifier: this.collectorIdentifier,
          }),
        ]
    );
  }

  getCallbackStatement() {
    return buildAssignmentStatement({
      left: this.collectorIdentifier,
      right: this.getCallbackCallExpression(),
    });
  }
}

class MapTransformer extends CollectCallbackReturnTransformer {
  constructor(path) {
    super(path);
    this.resultArrayIdentifier = path.scope.generateUidIdentifier('r');
  }

  getPreLoopStatements() {
    return [
      buildInitializedVariableDeclarationStatement({
        identifier: this.resultArrayIdentifier,
        initialization: EMPTY_ARRAY_LITERAL,
      }),
    ];
  }

  getPostCallbackStatements() {
    return [
      this.constructor.buildArrayPushingStatement({
        arrayIdentifier: this.resultArrayIdentifier,
        itemIdentifier: this.collectorIdentifier,
      }),
    ];
  }

  getReturnValue() {
    return this.resultArrayIdentifier;
  }
}

MapTransformer.buildArrayPushingStatement = template(`
  arrayIdentifier.push(itemIdentifier);
`);

class FilterTransformer extends CollectCallbackReturnTransformer {
  constructor(path) {
    super(path);
    this.resultArrayIdentifier = path.scope.generateUidIdentifier('r');
  }

  getPreLoopStatements() {
    return [
      buildInitializedVariableDeclarationStatement({
        identifier: this.resultArrayIdentifier,
        initialization: EMPTY_ARRAY_LITERAL,
      }),
    ];
  }

  getPostCallbackStatements() {
    return [
      this.constructor.buildArrayPushingIfNecessaryStatement({
        ifNecessaryValue: this.collectorIdentifier,
        arrayIdentifier: this.resultArrayIdentifier,
        itemIdentifier: this.itemIdentifier,
      }),
    ];
  }

  getReturnValue() {
    return this.resultArrayIdentifier;
  }
}

FilterTransformer.buildArrayPushingIfNecessaryStatement = template(`
  if (ifNecessaryValue) {
    arrayIdentifier.push(itemIdentifier);
  }
`);

class EveryTransformer extends CollectCallbackReturnTransformer {
  constructor(path) {
    super(path);
    this.resultIdentifier = path.scope.generateUidIdentifier('r');
  }

  getPreLoopStatements() {
    return [
      buildInitializedVariableDeclarationStatement({
        identifier: this.resultIdentifier,
        initialization: TRUE,
      }),
    ];
  }

  getPostCallbackStatements() {
    return [
      buildUpdateAndBreakIfNecessaryStatement({
        ifNecessaryValue: buildNegationExpression({
          value: this.collectorIdentifier,
        }),
        resultIdentifier: this.resultIdentifier,
        resultValue: FALSE,
      }),
    ];
  }

  getReturnValue() {
    return this.resultIdentifier;
  }
}

function buildUpdateAndBreakIfNecessaryStatement(opts) {
  opts = Object.assign({}, opts);
  opts.breakStatement = t.breakStatement();
  return _buildUpdateAndBreakIfNecessaryStatement(opts);
}

const _buildUpdateAndBreakIfNecessaryStatement = template(`
  if (ifNecessaryValue) {
    resultIdentifier = resultValue;
    breakStatement
  }
`);

class SomeTransformer extends CollectCallbackReturnTransformer {
  constructor(path) {
    super(path);
    this.resultIdentifier = path.scope.generateUidIdentifier('r');
  }

  getPreLoopStatements() {
    return [
      buildInitializedVariableDeclarationStatement({
        identifier: this.resultIdentifier,
        initialization: FALSE,
      }),
    ];
  }

  getPostCallbackStatements() {
    return [
      buildUpdateAndBreakIfNecessaryStatement({
        ifNecessaryValue: this.collectorIdentifier,
        resultIdentifier: this.resultIdentifier,
        resultValue: TRUE,
      }),
    ];
  }

  getReturnValue() {
    return this.resultIdentifier;
  }
}

class ReduceTransformer extends CollectCallbackReturnTransformer {
  constructor(path) {
    super(path);
    this.accumulatorIdentifier = path.scope.generateUidIdentifier('c');
  }

  static getValidArgumentsLengths() {
    return [1, 2];
  }

  getPreLoopStatements() {
    let statements = [];

    let accumulatorInitializer;
    let callerArguments = this.path.node.arguments;
    if (callerArguments.length === 1) {
      statements.push(this.constructor.buildPreconditionsStatement({
        arrayIdentifier: this.arrayIdentifier,
        statements: buildThrowErrorStatement(this.constructor.emptyArrayErrorMessage),
      }));

      accumulatorInitializer = buildArrayAccessExpression({
        arrayIdentifier: this.arrayIdentifier,
        indexIdentifier: ZERO,
      });
    } else {
      accumulatorInitializer = callerArguments[1];
    }
    statements.push(buildInitializedVariableDeclarationStatement({
      identifier: this.accumulatorIdentifier,
      initialization: accumulatorInitializer,
    }));

    return statements;
  }

  getCallbackCallExpression() {
    return this.constructor.buildCallbackCallExpression({
      functionIdentifier: this.functionIdentifier,
      accumulatorIdentifier: this.accumulatorIdentifier,
      itemIdentifier: this.itemIdentifier,
      indexIdentifier: this.indexIdentifier,
      arrayIdentifier: this.arrayIdentifier,
    });
  }

  getPostCallbackStatements() {
    return [
      buildAssignmentStatement({
        left: this.accumulatorIdentifier,
        right: this.collectorIdentifier,
      }),
    ];
  }

  getReturnValue() {
    return this.accumulatorIdentifier;
  }
}

ReduceTransformer.buildPreconditionsStatement = template(`
  if (arrayIdentifier.length === 0) {
    statements
  }
`);

ReduceTransformer.emptyArrayErrorMessage =
    t.stringLiteral('Reduce of empty array with no initial value');

ReduceTransformer.buildCallbackCallExpression = template(`
  functionIdentifier(accumulatorIdentifier, itemIdentifier, indexIdentifier, arrayIdentifier)
`);

const HIGHER_ORDER_FUNCTION_TRANSFORMER = {
  forEach: ForEachTransformer,
  map: MapTransformer,
  filter: FilterTransformer,
  every: EveryTransformer,
  some: SomeTransformer,
  reduce: ReduceTransformer,
};

function getCalleeMethodName(callExpressionPath) {
  let calleePath = callExpressionPath.get('callee');
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

export function getTransformer(callExpressionPath) {
  // Check if name of higher order function is known.
  let methodName = getCalleeMethodName(callExpressionPath);
  let cls = HIGHER_ORDER_FUNCTION_TRANSFORMER[methodName];
  if (cls === undefined) {
    return null;
  }
  return cls;
}
