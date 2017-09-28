// @formatter:off
// 1
true || array.FUN(function f() {
});

// 2
true && array.FUN(function f() {
});

// 3
array.FUN(function f() {
}) && false;

// 4
array.FUN(function f() {
}) || false;

// 5
while (true)
  false && array5.FUN(function f5() {
  });
