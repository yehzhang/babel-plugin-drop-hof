# babel-plugin-drop-hof
> Transforms higher-order function calls to loops.

Currently supported higher-order functions are: `forEach`, `map`, `filter`, `every`, `some`, and `reduce`.

## Example
**In**
```javascript
var result = array.map(function (x) {
  return x * 2;
});
```

**Out**
```javascript
var _a = array;
var _i = 0;

var _f = function _f(x) {
  return x * 2;
};

var _r = [];

for (; _i < _a.length; _i++) {
  var _e = _a[_i];

  var _z;

  _z = _f(_e, _i, _a);

  _r.push(_z);
}

var result = _r;
```

Some corner cases are handled properly:

**In**
```javascript
isValid() && array.map(function (x) {
  return x * 2;
});

while (array.map(function (x) {
  return x * 2;
}));
```

**Out**
```javascript
// **Same as input**
```

## Installation
```sh
npm install --save babel-plugin-drop-hof
```

## Usage
### Via `.babelrc`

**.babelrc**

```json
{
  "plugins": ["babel-plugin-drop-hof"]
}
```

### Via CLI

```sh
babel --plugins babel-plugin-drop-hof script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["babel-plugin-drop-hof"]
});
```
