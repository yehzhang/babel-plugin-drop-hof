// @formatter:off
// 1
while (true) {
  array.FUN(function f() {
  });
}

// 2
while (true) {
  array2.FUN(function f2() {
  });
  array3.FUN(function f3() {
  });
}

// 3
while (array4.FUN(function f4() {
}));

// 4
do {
} while (array5.FUN(function f5() {
}));
