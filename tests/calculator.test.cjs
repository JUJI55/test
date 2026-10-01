const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateHeight, calculateHeight } = require("../calculator.js");

test("남아: 175 cm + 162 cm → 175 cm, ±10 cm 참고 범위", () => {
  assert.deepEqual(calculateHeight("175", "162", "boy"), {
    height: 175,
    low: 165,
    high: 185,
  });
});
test("여아 계산은 성별 보정값을 반대로 적용한다", () => {
  assert.deepEqual(calculateHeight(175, 162, "girl"), {
    height: 162,
    low: 152,
    high: 172,
  });
});
test("소수점 입력은 계산 중 반올림하지 않는다", () => {
  assert.equal(calculateHeight("180.5", "165.2", "boy").height, 179.35);
});
test("빈 값, 비숫자, 범위 밖, 지수 표기, 과도한 소수점을 거부한다", () => {
  for (const value of [
    "",
    " ",
    "abc",
    "99",
    "231",
    "-175",
    "1e2",
    "175.55",
    "Infinity",
    "175cm",
  ]) {
    assert.notEqual(validateHeight(value), "", `should reject ${value}`);
    assert.throws(() => calculateHeight(value, 160, "boy"), RangeError);
  }
});
test("경계값과 양끝 공백을 허용한다", () => {
  for (const value of ["100", "230", "100.0", " 175.5 "])
    assert.equal(validateHeight(value), "");
});
test("미지원 성별은 조용히 잘못 계산하지 않는다", () => {
  assert.throws(() => calculateHeight(175, 162, "other"), TypeError);
});
