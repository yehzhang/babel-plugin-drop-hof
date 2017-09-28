// @formatter:off
// 1
while (true) {
  array.FUN(function f() {
  });
}

// 2
while (true) {
  array3.FUN(function f3() {
  });
  array4.FUN(function f4() {
  });
}

// 3
while (array2.FUN(function f2() {
}));

// 4
do {
} while (array4.FUN(function f4() {
}));
