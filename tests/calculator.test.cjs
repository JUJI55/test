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

const {
  parseDate,
  ageAt,
  validateProfile,
  validateRecords,
  createReport,
} = require("../calculator.js");
const TODAY = "2026-10-01";
const profile = {
  nickname: "쑥쑥이",
  sex: "boy",
  birth: "2018-01-15",
  measured: TODAY,
  height: "128.5",
  father: "175",
  mother: "162",
  historyEnabled: true,
  records: [
    { date: "2025-10-01", height: "122.3" },
    { date: "2026-04-04", height: "125.4" },
  ],
};
test("날짜 검증은 존재하지 않는 날짜와 느슨한 표기를 거부한다", () => {
  for (const date of [
    "2026-02-29",
    "2026-04-31",
    "2026-1-1",
    "hello",
    "2026-10-01T12:00:00Z",
    "",
  ])
    assert.equal(parseDate(date), null);
  assert.equal(
    parseDate("2024-02-29").toISOString().slice(0, 10),
    "2024-02-29",
  );
});
test("만 나이는 측정일에 지난 생일과 개월 수로 계산한다", () => {
  assert.deepEqual(ageAt("2018-01-15", "2026-10-01"), {
    years: 8,
    months: 8,
    totalMonths: 104,
  });
  assert.deepEqual(ageAt("2018-10-02", "2026-10-01"), {
    years: 7,
    months: 11,
    totalMonths: 95,
  });
  assert.equal(ageAt("2027-01-01", TODAY), null);
});
test("만 2세와 18세는 허용하고 2세 미만·19세 이상은 거부한다", () => {
  for (const birth of ["2024-10-01", "2007-10-02"])
    assert.deepEqual(validateProfile({ ...profile, birth }, TODAY), {});
  for (const birth of ["2024-10-02", "2007-10-01"])
    assert.ok(validateProfile({ ...profile, birth }, TODAY).birth);
});
test("미래 날짜, 날짜 누락, 잘못된 아이 키를 검증한다", () => {
  for (const data of [
    { measured: "2026-10-02" },
    { birth: "2027-01-01" },
    { birth: "" },
    { height: "49.9" },
    { height: "230.1" },
    { height: "128.55" },
  ])
    assert.ok(
      Object.keys(validateProfile({ ...profile, ...data }, TODAY)).length,
    );
});
test("기록을 날짜순으로 정렬하고 실제 경과 일수로 연 환산한다", () => {
  const r = createReport(
    { ...profile, records: [...profile.records].reverse() },
    TODAY,
  );
  assert.deepEqual(r.errors, {});
  assert.equal(r.points[0].date, "2025-10-01");
  assert.equal(r.days, 365);
  assert.ok(Math.abs(r.gain - 6.2) < 1e-9);
  assert.ok(Math.abs(r.annualized - (6.2 / 365) * 365.25) < 1e-9);
});
test("기록이 없으면 점 하나만 제공하고 성장률을 만들지 않는다", () => {
  const r = createReport(
    {
      ...profile,
      historyEnabled: false,
      records: [{ date: "invalid", height: "invalid" }],
    },
    TODAY,
  );
  assert.deepEqual(r.errors, {});
  assert.equal(r.points.length, 1);
  assert.equal(r.annualized, null);
});
test("89일 기록은 연 환산하지 않고 90일부터 계산한다", () => {
  const record = (days) => ({
    date: new Date(+parseDate(TODAY) - days * 86400000)
      .toISOString()
      .slice(0, 10),
    height: "127",
  });
  assert.equal(
    createReport({ ...profile, records: [record(89)] }, TODAY).annualized,
    null,
  );
  assert.ok(
    createReport({ ...profile, records: [record(90)] }, TODAY).annualized > 0,
  );
});
test("중간에 감소한 기록도 감지하고 연 환산을 중단한다", () => {
  const r = createReport(
    {
      ...profile,
      records: [
        { date: "2025-10-01", height: "126" },
        { date: "2026-04-01", height: "125" },
      ],
    },
    TODAY,
  );
  assert.equal(r.declining, true);
  assert.equal(r.annualized, null);
  assert.equal(r.points.length, 3);
});
test("키가 동일하게 기록되면 변화량 0을 정상 처리한다", () => {
  const r = createReport(
    { ...profile, records: [{ date: "2025-10-01", height: "128.5" }] },
    TODAY,
  );
  assert.equal(r.gain, 0);
  assert.equal(r.annualized, 0);
  assert.equal(r.declining, false);
});
test("생일 전, 현재 측정일 이후, 중복 날짜의 기록을 거부한다", () => {
  for (const records of [
    [{ date: "2017-01-01", height: "90" }],
    [{ date: TODAY, height: "120" }],
    [{ date: "2027-01-01", height: "120" }],
    [
      { date: "2026-01-01", height: "120" },
      { date: "2026-01-01", height: "121" },
    ],
  ])
    assert.ok(
      Object.keys(validateRecords(records, profile.birth, TODAY)).length,
    );
});
test("기록 개수와 잘못된 입력 구조를 검증한다", () => {
  assert.ok(validateRecords(null, profile.birth, TODAY).records);
  assert.ok(
    validateRecords(
      Array(6).fill({ date: "2026-01-01", height: "120" }),
      profile.birth,
      TODAY,
    ).records,
  );
  assert.ok(Object.keys(validateRecords([null], profile.birth, TODAY)).length);
  assert.ok(createReport({ ...profile, records: [] }, TODAY).errors.records);
});
test("아이 현재 키와 측정 기록으로 유전적 예상 키를 조작하지 않는다", () => {
  const a = createReport(profile, TODAY),
    b = createReport(
      { ...profile, height: "150", historyEnabled: false },
      TODAY,
    );
  assert.deepEqual(a.prediction, b.prediction);
  assert.equal(a.prediction.height, 175);
});
