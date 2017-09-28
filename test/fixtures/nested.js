// @formatter:off
// 1
array.FUN(function f() {
  array2.FUN(function f2() {
  });
});

// 2
function f3() {
  array3.FUN(f3);
}
array3.FUN(f3);
