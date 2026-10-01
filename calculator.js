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
  const DAY = 86400000;
  function parseDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return null;
    const date = new Date(value + "T00:00:00Z");
    return Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
      ? date
      : null;
  }
  function ageAt(birth, measured) {
    const start = parseDate(birth),
      end = parseDate(measured);
    if (!start || !end || end < start) return null;
    let months =
      (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      end.getUTCMonth() -
      start.getUTCMonth();
    if (end.getUTCDate() < start.getUTCDate()) months--;
    return {
      years: Math.floor(months / 12),
      months: months % 12,
      totalMonths: months,
    };
  }
  function validateChildHeight(value) {
    const text = String(value ?? "").trim();
    if (!/^\d{2,3}(\.\d)?$/.test(text))
      return "키를 숫자로 입력해 주세요. 소수점 첫째 자리까지 가능해요.";
    return Number(text) >= 50 && Number(text) <= 230
      ? ""
      : "50~230 cm 사이로 입력해 주세요.";
  }
  function validateProfile(data, today) {
    const errors = {};
    if (!parseDate(today)) throw new TypeError("Invalid current date");
    if (!["boy", "girl"].includes(data.sex))
      errors.sex = "성별을 선택해 주세요.";
    if (typeof data.nickname !== "string" || data.nickname.length > 12)
      errors.nickname = "별명은 12자 이내로 입력해 주세요.";
    const birth = parseDate(data.birth),
      measured = parseDate(data.measured);
    if (!birth) errors.birth = "생년월일을 입력해 주세요.";
    else if (data.birth > today) errors.birth = "생년월일은 미래일 수 없어요.";
    if (!measured) errors.measured = "키를 측정한 날짜를 입력해 주세요.";
    else if (data.measured > today)
      errors.measured = "미래의 측정일은 입력할 수 없어요.";
    if (birth && measured && !errors.birth && !errors.measured) {
      const age = ageAt(data.birth, data.measured);
      if (!age || age.totalMonths < 24 || age.totalMonths >= 228)
        errors.birth = "측정일 기준 만 2~18세의 성장 기록을 입력해 주세요.";
    }
    const heightError = validateChildHeight(data.height);
    if (heightError) errors.height = heightError;
    return errors;
  }
  function validateRecords(records, birth, measured) {
    const errors = {};
    if (!Array.isArray(records) || records.length > 5)
      return { records: "이전 기록은 최대 5개까지 입력할 수 있어요." };
    const dates = new Set();
    records.forEach((record, index) => {
      if (!record || !parseDate(record.date))
        errors[`record-date-${index}`] = "측정일을 입력해 주세요.";
      else if (record.date < birth || record.date >= measured)
        errors[`record-date-${index}`] =
          "출생일 이후, 현재 측정일보다 이전 날짜를 입력해 주세요.";
      else if (dates.has(record.date))
        errors[`record-date-${index}`] = "같은 날짜의 기록이 있어요.";
      if (record) dates.add(record.date);
      const error = validateChildHeight(record?.height);
      if (error) errors[`record-height-${index}`] = error;
    });
    return errors;
  }
  function createReport(data, today) {
    const records = data.historyEnabled ? data.records : [];
    const errors = {
      ...validateProfile(data, today),
      ...(validateHeight(data.father)
        ? { father: validateHeight(data.father) }
        : {}),
      ...(validateHeight(data.mother)
        ? { mother: validateHeight(data.mother) }
        : {}),
      ...validateRecords(records, data.birth, data.measured),
    };
    if (data.historyEnabled && Array.isArray(records) && records.length === 0)
      errors.records = "이전 기록을 추가하거나 기록 없음으로 변경해 주세요.";
    if (Object.keys(errors).length) return { errors };
    const points = [
      ...records.map((r) => ({ date: r.date, height: Number(r.height) })),
      { date: data.measured, height: Number(data.height) },
    ].sort((a, b) => a.date.localeCompare(b.date));
    const first = points[0],
      last = points.at(-1);
    const days = (parseDate(last.date) - parseDate(first.date)) / DAY;
    const gain = last.height - first.height;
    const declining = points.some(
      (point, index) => index > 0 && point.height < points[index - 1].height,
    );
    // A rate extrapolated from less than 90 days is too sensitive to measurement error.
    // This is a display policy, not a clinical classification or final-height model.
    const annualized =
      points.length > 1 && days >= 90 && !declining
        ? (gain / days) * 365.25
        : null;
    return {
      errors: {},
      nickname: data.nickname.trim() || "우리 아이",
      sex: data.sex,
      age: ageAt(data.birth, data.measured),
      measured: data.measured,
      points,
      prediction: calculateHeight(data.father, data.mother, data.sex),
      father: Number(data.father),
      mother: Number(data.mother),
      days,
      gain,
      annualized,
      declining,
    };
  }
  const api = {
    validateHeight,
    calculateHeight,
    parseDate,
    ageAt,
    validateChildHeight,
    validateProfile,
    validateRecords,
    createReport,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HeightCalculator = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
