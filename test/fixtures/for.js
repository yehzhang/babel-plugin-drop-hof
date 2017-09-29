// @formatter:off
// 1
for (; ;) {
  array.FUN(function f() {
  });
}

// 2
for (var i = array2.FUN(function f2() {
}); ;) {
}

// 3
for (; i !== array3.FUN(function f3() {
}););

// 4
for (; ; i += array4.FUN(function f4() {
}));
