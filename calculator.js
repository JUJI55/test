(function (root) {
  "use strict";
  function validateHeight(value) {
    const text = String(value).trim();
    if (!text) return "키를 입력해 주세요.";
    if (!/^\d{2,3}(\.\d)?$/.test(text))
      return "숫자로 입력해 주세요. 소수점 첫째 자리까지 입력할 수 있어요.";
    const height = Number(text);
    if (height < 100 || height > 230)
      return "100~230 cm 사이의 키를 입력해 주세요.";
    return "";
  }
  function calculateHeight(father, mother, sex) {
    if (validateHeight(father) || validateHeight(mother))
      throw new RangeError("Invalid parent height");
    if (sex !== "boy" && sex !== "girl") throw new TypeError("Invalid sex");
    const height =
      (Number(father) + Number(mother) + (sex === "boy" ? 13 : -13)) / 2;
    return { height, low: height - 10, high: height + 10 };
  }
  const api = { validateHeight, calculateHeight };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HeightCalculator = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
