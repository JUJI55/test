"use strict";
const $ = (selector) => document.querySelector(selector);
const form = $("#height-form");
const HC = window.HeightCalculator;
const STORAGE_KEY = "kids10.growth-report.v2";
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
let step = 0;
let activeReport = null;
let reportInput = null;
let calendarDate = null;
const fieldMap = {
  nickname: "nickname",
  birth: "birth",
  measured: "measured",
  height: "child-height",
  father: "father-height",
  mother: "mother-height",
};
const fmt = (n) => Number(n).toFixed(1);
const dateLabel = (value) => value.replaceAll("-", ".");
const signed = (n) => (n > 0 ? "+" : "") + fmt(n);
const status = (message) => {
  $("#studio-status").textContent = message;
};
function announceAndFocus(element) {
  element.focus({ preventScroll: true });
  element.scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
    block: "start",
  });
}
function readInput() {
  return {
    nickname: form.elements.nickname.value,
    sex: form.elements.sex.value,
    birth: form.elements.birth.value,
    measured: form.elements.measured.value,
    height: form.elements.height.value,
    father: form.elements.father.value,
    mother: form.elements.mother.value,
    historyEnabled: $("#history-enabled").checked,
    records: [...document.querySelectorAll(".history-row")].map((row) => ({
      date: row.querySelector('[type="date"]').value,
      height: row.querySelector('[inputmode="decimal"]').value,
    })),
  };
}
function clearErrors() {
  form
    .querySelectorAll("[aria-invalid]")
    .forEach((el) => el.removeAttribute("aria-invalid"));
  form.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
}
function showErrors(errors) {
  clearErrors();
  let first;
  for (const [key, message] of Object.entries(errors)) {
    const input = document.getElementById(fieldMap[key] || key);
    const error = document.getElementById(`${key}-error`);
    if (error) error.textContent = message;
    if (input) {
      input.setAttribute("aria-invalid", "true");
      first ||= input;
    }
  }
  if (first) first.focus();
  status("입력 내용을 확인해 주세요. 잘못된 항목 아래에 안내를 표시했어요.");
}
function validateStep(index, data) {
  if (index === 0) return HC.validateProfile(data, today);
  if (index === 1) {
    const errors = {};
    for (const key of ["father", "mother"]) {
      const error = HC.validateHeight(data[key]);
      if (error) errors[key] = error;
    }
    return errors;
  }
  return data.historyEnabled
    ? HC.validateRecords(data.records, data.birth, data.measured)
    : {};
}
function showStep(index, focus = true) {
  step = index;
  document
    .querySelectorAll(".wizard-step")
    .forEach((el, i) => (el.hidden = i !== index));
  document.querySelectorAll(".stepper li").forEach((el, i) => {
    if (i === index) el.setAttribute("aria-current", "step");
    else el.removeAttribute("aria-current");
    el.classList.toggle("is-complete", i < index);
    el.querySelector(":scope > span").textContent =
      i < index ? "✓" : String(i + 1);
  });
  $("#previous-button").hidden = index === 0;
  $("#next-button").innerHTML = [
    '부모님 정보 입력 <span aria-hidden="true">→</span>',
    '성장 기록 추가 <span aria-hidden="true">→</span>',
    '우리 아이 성장 리포트 보기 <span aria-hidden="true">→</span>',
  ][index];
  clearErrors();
  if (focus) announceAndFocus($(`#step-title-${index}`));
}
function renumberRecords() {
  document.querySelectorAll(".history-row").forEach((row, i) => {
    row.querySelector(".record-index").textContent = String(i + 1).padStart(
      2,
      "0",
    );
    for (const kind of ["date", "height"]) {
      const input = row.querySelector(`[data-kind="${kind}"]`);
      input.id = `record-${kind}-${i}`;
      input.setAttribute("aria-describedby", `${input.id}-error`);
      row.querySelector(`[data-label="${kind}"]`).htmlFor = input.id;
      row.querySelector(`[data-error="${kind}"]`).id = `${input.id}-error`;
    }
    row
      .querySelector(".remove-record")
      .setAttribute("aria-label", `${i + 1}번째 측정 기록 삭제`);
  });
  $("#add-record").disabled =
    document.querySelectorAll(".history-row").length >= 5;
}
function addRecord(values = {}, focus = false) {
  if (document.querySelectorAll(".history-row").length >= 5) return;
  const row = document.createElement("div");
  row.className = "history-row";
  row.innerHTML =
    '<span class="record-index"></span><div class="field"><label data-label="date">측정일</label><div class="input-wrap"><input type="date" data-kind="date"></div><p class="field-error" data-error="date"></p></div><div class="field"><label data-label="height">키</label><div class="input-wrap"><input type="text" inputmode="decimal" maxlength="5" placeholder="122.0" data-kind="height"><span>cm</span></div><p class="field-error" data-error="height"></p></div><button type="button" class="remove-record">×</button>';
  row.querySelector('[type="date"]').value = values.date || "";
  row.querySelector('[type="date"]').max =
    form.elements.measured.value || today;
  row.querySelector('[inputmode="decimal"]').value = values.height ?? "";
  row.querySelector(".remove-record").addEventListener("click", () => {
    row.remove();
    renumberRecords();
    if (!document.querySelector(".history-row")) {
      $("#history-enabled").checked = false;
      toggleHistory();
      $("#history-enabled").focus();
    } else $("#add-record").focus();
  });
  $("#history-rows").append(row);
  renumberRecords();
  if (focus) row.querySelector("input").focus();
}
function toggleHistory() {
  const enabled = $("#history-enabled").checked;
  $("#history-fields").hidden = !enabled;
  $("#no-history").hidden = enabled;
  if (enabled && !document.querySelector(".history-row")) addRecord();
}
$("#history-enabled").addEventListener("change", toggleHistory);
$("#add-record").addEventListener("click", () => addRecord({}, true));
$("#previous-button").addEventListener("click", () =>
  showStep(Math.max(0, step - 1)),
);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = readInput();
  const errors = validateStep(step, data);
  if (Object.keys(errors).length) {
    showErrors(errors);
    return;
  }
  if (step < 2) {
    showStep(step + 1);
    return;
  }
  const report = HC.createReport(data, today);
  if (Object.keys(report.errors).length) {
    const badStep =
      [0, 1, 2].find((i) => Object.keys(validateStep(i, data)).length) || 0;
    showStep(badStep, false);
    showErrors(report.errors);
    return;
  }
  reportInput = structuredClone(data);
  renderReport(report);
});
form.addEventListener("input", (event) => {
  event.target.removeAttribute("aria-invalid");
  const error = document.getElementById(
    event.target.getAttribute("aria-describedby"),
  );
  if (error) error.textContent = "";
  status("");
});
function setText(id, text) {
  document.getElementById(id).textContent = text;
}
function selectTab(tab, focus = false) {
  document.querySelectorAll('[role="tab"]').forEach((button) => {
    const selected = button === tab;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    document.getElementById(button.getAttribute("aria-controls")).hidden =
      !selected;
  });
  if (focus) tab.focus();
  if (tab.id === "timeline-tab" && activeReport) renderChart(activeReport);
}
const tabs = [...document.querySelectorAll('[role="tab"]')];
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (event) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      next = (index + tabs.length - 1) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      selectTab(tabs[next], true);
    }
  });
});
function renderChart(report) {
  const container = $("#growth-chart");
  const width = Math.max(260, Math.min(1050, container.clientWidth));
  const height = 260;
  const left = 48,
    right = width - 32,
    top = 38,
    bottom = 208;
  const values = report.points.map((p) => p.height);
  const low = Math.floor((Math.min(...values) - 3) / 5) * 5,
    high = Math.ceil((Math.max(...values) + 3) / 5) * 5;
  const first = +HC.parseDate(report.points[0].date),
    last = +HC.parseDate(report.measured);
  const x = (date) =>
    last === first
      ? (left + right) / 2
      : left +
        ((+HC.parseDate(date) - first) / (last - first)) * (right - left);
  const y = (value) => bottom - ((value - low) / (high - low)) * (bottom - top);
  let markup = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="입력한 ${report.points.length}개 실측 기록. 날짜별 수치는 아래 측정 기록 표에서 확인할 수 있습니다."><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a489df" stop-opacity=".2"/><stop offset="1" stop-color="#a489df" stop-opacity="0"/></linearGradient></defs>`;
  for (let i = 0; i < 5; i++) {
    const value = low + ((high - low) * i) / 4,
      py = y(value);
    markup += `<line x1="${left}" y1="${py}" x2="${right}" y2="${py}" stroke="#eeeaf4" stroke-dasharray="4 5"/><text x="${left - 12}" y="${py + 4}" text-anchor="end" fill="#7b7187" font-size="11">${Number(value.toFixed(1))}</text>`;
  }
  markup += `<text x="${left - 20}" y="18" fill="#7b7187" font-size="10">cm</text>`;
  const coords = report.points
    .map((p) => `${x(p.date)},${y(p.height)}`)
    .join(" ");
  if (report.points.length > 1)
    markup += `<polygon points="${left},${bottom} ${coords} ${right},${bottom}" fill="url(#chart-fill)"/><polyline points="${coords}" fill="none" stroke="#7751d2" stroke-width="3" stroke-linejoin="round"/>`;
  report.points.forEach((point, i) => {
    const cx = x(point.date),
      cy = y(point.height);
    markup += `<circle cx="${cx}" cy="${cy}" r="6" fill="#7751d2" stroke="white" stroke-width="3"><title>${dateLabel(point.date)} · ${fmt(point.height)} cm</title></circle>`;
    if (i === report.points.length - 1)
      markup += `<text x="${cx}" y="${cy - 16}" text-anchor="${report.points.length === 1 ? "middle" : "end"}" fill="#6340b9" font-size="14" font-weight="700">${fmt(point.height)} cm</text>`;
  });
  if (report.points.length === 1)
    markup += `<text x="${(left + right) / 2}" y="${bottom + 27}" text-anchor="middle" fill="#7b7187" font-size="11">${dateLabel(report.measured)}</text>`;
  else {
    const tickCount = width < 450 ? 2 : 4;
    for (let i = 0; i < tickCount; i++) {
      const ratio = i / (tickCount - 1),
        stamp = new Date(first + (last - first) * ratio)
          .toISOString()
          .slice(0, 10);
      markup += `<text x="${left + (right - left) * ratio}" y="${bottom + 27}" text-anchor="${i === 0 ? "start" : i === tickCount - 1 ? "end" : "middle"}" fill="#7b7187" font-size="11">${dateLabel(stamp)}</text>`;
    }
  }
  container.innerHTML = markup + "</svg>";
}
function renderReport(report) {
  activeReport = report;
  $("#studio-input").hidden = true;
  $("#growth-report").hidden = false;
  setText("report-title", `${report.nickname}의 성장 리포트`);
  setText(
    "report-meta",
    `${report.sex === "boy" ? "남아" : "여아"} · 만 ${report.age.years}세 ${report.age.months}개월 · ${dateLabel(report.measured)} 측정 기준`,
  );
  setText("result-height", fmt(report.prediction.height));
  setText("range-low", `${fmt(report.prediction.low)} cm`);
  setText("range-high", `${fmt(report.prediction.high)} cm`);
  setText("current-height", fmt(report.points.at(-1).height));
  setText("age-label", `만 ${report.age.years}세 ${report.age.months}개월`);
  const hasHistory = report.points.length > 1;
  setText("growth-gain", hasHistory ? signed(report.gain) : "첫 기록");
  setText("growth-gain-unit", hasHistory ? "cm" : "");
  setText(
    "growth-period",
    hasHistory
      ? `${report.days}일 동안 · ${report.points.length}회 측정`
      : "오늘부터 기록을 시작해요",
  );
  setText(
    "growth-rate",
    report.annualized === null
      ? "아직 계산하지 않아요"
      : fmt(report.annualized),
  );
  setText("growth-rate-unit", report.annualized === null ? "" : "cm/년");
  setText(
    "growth-rate-note",
    !hasHistory
      ? "이전 측정 기록을 추가하면 키 변화를 볼 수 있어요."
      : report.declining
        ? "이전보다 작은 키가 입력되어 있어요. 날짜와 측정 방법을 확인해 주세요."
        : report.days < 90
          ? "기록 간격이 90일 이상일 때 표시해요. 짧은 기간은 측정 오차의 영향이 커요."
          : `${report.days}일의 변화를 1년으로 환산한 평균이에요. 앞으로 1년에 자랄 키를 예측한 값이 아니에요.`,
  );
  const notice = $("#chart-notice");
  notice.hidden = hasHistory && !report.declining;
  notice.textContent = report.declining
    ? "일부 기록에서 키가 줄었어요. 입력값과 측정 조건을 먼저 확인해 주세요."
    : "첫 번째 기록이에요. 다음 측정이 더해지면 실제 변화가 선으로 이어져요.";
  $("#record-table").replaceChildren();
  report.points.forEach((point, i) => {
    const tr = document.createElement("tr");
    for (const value of [
      dateLabel(point.date),
      `${fmt(point.height)} cm`,
      i
        ? `${signed(point.height - report.points[i - 1].height)} cm`
        : "첫 기록",
    ]) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    }
    $("#record-table").append(tr);
  });
  setText("record-count", `${report.points.length}개`);
  setText("formula-sex", report.sex === "boy" ? "남아" : "여아");
  setText(
    "formula-text",
    `(${fmt(report.father)} + ${fmt(report.mother)} ${report.sex === "boy" ? "+" : "−"} 13) ÷ 2 = ${fmt(report.prediction.height)} cm`,
  );
  const next = new Date(+HC.parseDate(report.measured) + 90 * 86400000);
  calendarDate = next.toISOString().slice(0, 10);
  if (calendarDate <= today) {
    calendarDate = new Date(+HC.parseDate(today) + 86400000)
      .toISOString()
      .slice(0, 10);
    setText(
      "next-date-note",
      "마지막 측정에서 90일 이상 지났어요. 내일 새 기록을 남겨보는 건 어떨까요?",
    );
  } else
    setText(
      "next-date-note",
      "꾸준히 기록하기 위한 제안일이에요. 의료진이 안내한 일정이 있다면 그 일정을 따라주세요.",
    );
  setText("next-date", dateLabel(calendarDate));
  document.querySelector(".next-measurement > div > span").textContent =
    next.toISOString().slice(0, 10) <= today
      ? "새 기록을 남겨볼 날짜"
      : "현재 측정일에서 90일 뒤";
  selectTab(tabs[0]);
  status("성장 리포트를 만들었어요.");
  announceAndFocus($("#report-title"));
}
new ResizeObserver(() => {
  if (
    activeReport &&
    !$("#timeline-panel").hidden &&
    !$("#growth-report").hidden
  )
    renderChart(activeReport);
}).observe($("#growth-chart"));
function populate(data) {
  form.reset();
  for (const key of Object.keys(fieldMap))
    form.elements[key].value = data[key] ?? "";
  form.elements.sex.value = data.sex;
  $("#history-enabled").checked = Boolean(data.historyEnabled);
  $("#history-rows").replaceChildren();
  (data.records || []).forEach((record) => addRecord(record));
  toggleHistory();
}
$("#example-button").addEventListener("click", () => {
  const year = Number(today.slice(0, 4));
  const past = (days) =>
    new Date(+HC.parseDate(today) - days * 86400000).toISOString().slice(0, 10);
  const data = {
    nickname: "쑥쑥이",
    sex: "boy",
    birth: `${year - 8}-01-15`,
    measured: today,
    height: "128.5",
    father: "175",
    mother: "162",
    historyEnabled: true,
    records: [
      { date: past(365), height: "122.3" },
      { date: past(180), height: "125.4" },
    ],
  };
  populate(data);
  reportInput = structuredClone(data);
  renderReport(HC.createReport(data, today));
  status(
    "예시 데이터로 만든 리포트예요. 입력 수정에서 우리 아이 정보로 바꿔보세요.",
  );
});
$("#edit-button").addEventListener("click", () => {
  $("#growth-report").hidden = true;
  $("#studio-input").hidden = false;
  showStep(0);
  status("입력 내용을 수정한 뒤 리포트를 다시 만들어 주세요.");
});
$("#reset-button").addEventListener("click", () => {
  form.reset();
  form.elements.measured.value = today;
  $("#history-rows").replaceChildren();
  toggleHistory();
  activeReport = null;
  reportInput = null;
  $("#growth-report").hidden = true;
  $("#studio-input").hidden = false;
  showStep(0);
  status("새 리포트를 시작해요. 이 기기에 따로 저장한 기록은 유지됩니다.");
});
function reportSummary() {
  const r = activeReport;
  return `${r.nickname}의 성장 리포트\n${dateLabel(r.measured)} · 만 ${r.age.years}세 ${r.age.months}개월\n현재 키: ${fmt(r.points.at(-1).height)} cm\n부모 키 기반 예상 성인 키: ${fmt(r.prediction.height)} cm\n참고 범위: ${fmt(r.prediction.low)}~${fmt(r.prediction.high)} cm\n${r.points.length > 1 ? `${r.days}일간 키 변화: ${signed(r.gain)} cm\n` : ""}${r.annualized === null ? "" : `기록 기간의 연 환산 변화: ${fmt(r.annualized)} cm/년 (미래 예측 아님)\n`}최종 키를 보장하거나 의학적 진단을 대신하지 않는 참고용 리포트입니다.`;
}
$("#copy-button").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(reportSummary());
    status("리포트 요약을 복사했어요.");
  } catch {
    status(
      "이 브라우저에서는 복사를 사용할 수 없어요. 리포트 인쇄 / PDF 버튼으로 저장해 주세요.",
    );
  }
});
$("#print-button").addEventListener("click", () => window.print());
function refreshSavedBanner() {
  try {
    $("#saved-banner").hidden = !localStorage.getItem(STORAGE_KEY);
  } catch {
    $("#saved-banner").hidden = true;
  }
}
$("#save-button").addEventListener("click", () => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, savedAt: today, data: reportInput }),
    );
    refreshSavedBanner();
    status(
      "이 브라우저에 입력 기록을 저장했어요. 상단의 저장 기록 메뉴에서 불러오거나 삭제할 수 있어요.",
    );
  } catch {
    status(
      "브라우저의 저장 공간을 사용할 수 없어요. 리포트 인쇄 / PDF로 보관해 주세요.",
    );
  }
});
$("#load-button").addEventListener("click", () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version !== 2 || typeof saved.data?.historyEnabled !== "boolean")
      throw Error("Invalid saved data");
    const data = saved.data;
    if (
      !Array.isArray(data.records) ||
      data.records.length > 5 ||
      Object.keys(HC.createReport(data, today).errors).length
    )
      throw Error("Invalid saved report");
    populate(data);
    reportInput = structuredClone(data);
    renderReport(HC.createReport(data, today));
    status("이 기기에 저장한 기록을 불러왔어요.");
  } catch {
    status("저장된 기록을 읽을 수 없어요. 삭제 후 새 기록을 입력해 주세요.");
  }
});
$("#delete-button").addEventListener("click", () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    refreshSavedBanner();
    status(
      "이 기기에 저장한 기록을 삭제했어요. 현재 화면에 입력된 내용은 유지됩니다.",
    );
  } catch {
    status(
      "저장된 기록을 삭제하지 못했어요. 브라우저 설정에서 이 사이트의 저장 데이터를 확인해 주세요.",
    );
  }
});
$("#calendar-button").addEventListener("click", () => {
  if (!calendarDate) return;
  const end = new Date(+HC.parseDate(calendarDate) + 86400000)
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kids10//Growth reminder//KO",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID?.() || Date.now()}@kids10.local`,
    `DTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${calendarDate.replaceAll("-", "")}`,
    `DTEND;VALUE=DATE:${end}`,
    "SUMMARY:아이 키 측정 기록하기",
    "DESCRIPTION:맨발로 같은 장소와 비슷한 시간에 키를 측정하고 기록해 주세요.",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "kids10-growth-reminder.ics";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status(
    "캘린더 파일을 내려받았어요. 사용 중인 캘린더 앱에서 열어 추가해 주세요.",
  );
});
for (const id of ["birth", "measured"]) document.getElementById(id).max = today;
form.elements.measured.value = today;
refreshSavedBanner();
function openLinkedDetail() {
  const target = document.getElementById(location.hash.slice(1));
  if (target instanceof HTMLDetailsElement) target.open = true;
}
document.querySelectorAll('a[href^="#"]').forEach((link) =>
  link.addEventListener("click", () => {
    const target = document.getElementById(link.getAttribute("href").slice(1));
    if (target instanceof HTMLDetailsElement) target.open = true;
  }),
);
window.addEventListener("hashchange", openLinkedDetail);
openLinkedDetail();
