"use strict";
const form = document.querySelector("#height-form");
const father = document.querySelector("#father-height");
const mother = document.querySelector("#mother-height");
const emptyResult = document.querySelector("#empty-result");
const result = document.querySelector("#calculated-result");
const copyStatus = document.querySelector("#copy-status");
let currentResult = null;

function setError(input, message) {
  input.setAttribute("aria-invalid", String(Boolean(message)));
  document.getElementById(input.getAttribute("aria-describedby")).textContent =
    message;
}

function clearResult() {
  currentResult = null;
  emptyResult.hidden = false;
  result.hidden = true;
  copyStatus.textContent = "";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = [father, mother];
  const errors = fields.map((input) =>
    HeightCalculator.validateHeight(input.value),
  );
  fields.forEach((input, index) => setError(input, errors[index]));
  const invalid = errors.findIndex(Boolean);
  if (invalid !== -1) {
    clearResult();
    fields[invalid].focus();
    return;
  }
  const sex = form.elements.sex.value;
  const value = HeightCalculator.calculateHeight(
    father.value,
    mother.value,
    sex,
  );
  currentResult = {
    ...value,
    sex,
    father: Number(father.value),
    mother: Number(mother.value),
  };
  document.querySelector("#result-height").textContent =
    value.height.toFixed(1);
  document.querySelector("#range-low").textContent =
    `${value.low.toFixed(1)} cm`;
  document.querySelector("#range-high").textContent =
    `${value.high.toFixed(1)} cm`;
  document.querySelector("#range-text").textContent =
    `${value.low.toFixed(1)}~${value.high.toFixed(1)} cm`;
  emptyResult.hidden = true;
  result.hidden = false;
  copyStatus.textContent = "";
  result.focus({ preventScroll: true });
  if (window.matchMedia("(max-width: 700px)").matches) {
    result.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
    });
  }
});

for (const input of [father, mother]) {
  input.addEventListener("input", () => {
    setError(input, "");
    clearResult();
  });
  input.addEventListener("blur", () => {
    if (input.value.trim())
      setError(input, HeightCalculator.validateHeight(input.value));
  });
}
form
  .querySelectorAll('[name="sex"]')
  .forEach((input) => input.addEventListener("change", clearResult));

document.querySelector("#example-button").addEventListener("click", () => {
  father.value = "175";
  mother.value = "162";
  form.requestSubmit();
});

document.querySelector("#reset-button").addEventListener("click", () => {
  form.reset();
  [father, mother].forEach((input) => setError(input, ""));
  clearResult();
  father.focus();
});

document.querySelector("#copy-button").addEventListener("click", async () => {
  if (!currentResult) return;
  const snapshot = currentResult;
  const text = `우리 아이 예상 성인 키: ${snapshot.height.toFixed(1)} cm\n참고 범위: ${snapshot.low.toFixed(1)}~${snapshot.high.toFixed(1)} cm\n${snapshot.sex === "boy" ? "남아" : "여아"} · 아빠 ${snapshot.father} cm · 엄마 ${snapshot.mother} cm\n부모 키 기반 참고용 추정치이며 최종 키를 보장하거나 의학적 진단을 대신하지 않습니다.`;
  try {
    if (!navigator.clipboard?.writeText)
      throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    if (currentResult === snapshot)
      copyStatus.textContent = "결과를 복사했어요.";
  } catch {
    if (currentResult === snapshot)
      copyStatus.textContent =
        "복사 기능을 사용할 수 없어요. 표시된 결과를 직접 선택해 복사해 주세요.";
  }
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => {
    const id = link.getAttribute("href").slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (target instanceof HTMLDetailsElement) target.open = true;
  });
});
function openLinkedDetail() {
  const target = document.getElementById(location.hash.slice(1));
  if (target instanceof HTMLDetailsElement) target.open = true;
}
window.addEventListener("hashchange", openLinkedDetail);
openLinkedDetail();
