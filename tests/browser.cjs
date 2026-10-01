// Optional Linux browser checks. See README for isolated tool installation.
const { chromium } = require("playwright-core");
const bundledChromium = require("@sparticuz/chromium").default;
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000/";
(async () => {
  const browser = await chromium.launch({
    executablePath: await bundledChromium.executablePath(),
    args: bundledChromium.args,
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      locale: "ko-KR",
    });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date("2026-10-01T03:00:00Z"));
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(baseURL, { waitUntil: "networkidle" });
    async function audit(label) {
      if (!(await page.evaluate(() => Boolean(window.axe))))
        await page.addScriptTag({
          path: require.resolve("axe-core/axe.min.js"),
        });
      const result = await page.evaluate(() =>
        axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        }),
      );
      assert.deepEqual(
        result.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
        [],
        label,
      );
    }
    await audit("step 1 accessibility");
    await page.locator("#next-button").click();
    assert.equal(
      await page.locator("#birth").getAttribute("aria-invalid"),
      "true",
    );
    assert.equal(
      await page.locator("#child-height").getAttribute("aria-invalid"),
      "true",
    );
    await page.locator("#nickname").fill("테스트아이");
    await page.locator("#birth").fill("2018-01-15");
    await page.locator("#measured").fill("2026-10-01");
    await page.locator("#child-height").fill("128.5");
    await page.locator("#next-button").click();
    await audit("step 2 accessibility");
    await page.locator("#next-button").click();
    assert.equal(
      await page.locator("#father-height").getAttribute("aria-invalid"),
      "true",
    );
    await page.locator("#father-height").fill("175");
    await page.locator("#mother-height").fill("162");
    await page.locator("#next-button").click();
    await audit("step 3 accessibility");
    await page.locator(".history-toggle").click();
    await page.locator("#next-button").click();
    assert.equal(
      await page.locator("#record-date-0").getAttribute("aria-invalid"),
      "true",
    );
    await page.locator("#record-date-0").fill("2025-10-01");
    await page.locator("#record-height-0").fill("122.3");
    await page.locator("#add-record").click();
    await page.locator("#record-date-1").fill("2025-10-01");
    await page.locator("#record-height-1").fill("125.4");
    await page.locator("#next-button").click();
    assert.equal(
      await page.locator("#record-date-1").getAttribute("aria-invalid"),
      "true",
    );
    await page.locator("#record-date-1").fill("2026-04-04");
    await page.locator("#next-button").click();
    assert.equal(await page.locator("#result-height").textContent(), "175.0");
    assert.equal(await page.locator("#growth-gain").textContent(), "+6.2");
    assert.equal(await page.locator("#growth-rate").textContent(), "6.2");
    assert.equal(await page.locator("#growth-chart circle").count(), 3);
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await audit("report timeline accessibility");
    await page.locator("#timeline-tab").focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page.locator("#insight-tab").getAttribute("aria-selected"),
      "true",
    );
    assert.match(
      await page.locator("#formula-text").textContent(),
      /175.0 \+ 162.0 \+ 13/,
    );
    await audit("report interpretation accessibility");
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page.locator("#next-tab").getAttribute("aria-selected"),
      "true",
    );
    await audit("report next measurement accessibility");
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#calendar-button").click();
    const download = await downloadPromise;
    const content = await fs.readFile(await download.path(), "utf8");
    assert.match(content, /DTSTART;VALUE=DATE:20261230/);
    assert.match(content, /BEGIN:VCALENDAR/);
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator("#timeline-panel").isVisible(), true);
    assert.equal(await page.locator("#insight-panel").isVisible(), true);
    assert.equal(await page.locator("#next-panel").isVisible(), true);
    await page.pdf({
      path: "/tmp/kids10-growth-report-test.pdf",
      format: "A4",
      printBackground: true,
    });
    assert.ok(
      (await fs.stat("/tmp/kids10-growth-report-test.pdf")).size > 10000,
    );
    await page.emulateMedia({ media: "screen" });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.locator("#copy-button").click();
    assert.match(
      await page.evaluate(() => navigator.clipboard.readText()),
      /175.0 cm/,
    );
    await page.locator("#save-button").click();
    assert.equal(await page.locator("#saved-banner").isVisible(), true);
    await page.reload();
    assert.equal(await page.locator("#growth-report").isVisible(), false);
    await page.locator("#load-button").click();
    assert.equal(
      await page.locator("#report-title").textContent(),
      "테스트아이의 성장 리포트",
    );
    await page.locator("#delete-button").click();
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await page.locator("#edit-button").click();
    assert.equal(await page.locator("#growth-report").isVisible(), false);
    await page
      .locator("label")
      .filter({ has: page.locator('input[value="girl"]') })
      .click();
    await page.locator("#next-button").click();
    await page.locator("#next-button").click();
    await page.locator(".history-toggle").click();
    await page.locator("#next-button").click();
    assert.equal(await page.locator("#result-height").textContent(), "162.0");
    assert.equal(await page.locator("#growth-chart circle").count(), 1);
    assert.equal(await page.locator("#growth-gain").textContent(), "첫 기록");
    await page.locator("#reset-button").click();
    assert.equal(await page.locator("#birth").inputValue(), "");
    // Check every responsive state, including date controls and the wide report chart.
    for (const width of [320, 375, 390, 700, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(baseURL);
      await page.locator("#example-button").click();
      for (const tab of ["timeline-tab", "insight-tab", "next-tab"]) {
        await page.locator("#" + tab).click();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${width}px overflow in ${tab}`,
        );
      }
      await page.locator("#edit-button").click();
      for (let i = 0; i < 3; i++) {
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${width}px overflow in step ${i}`,
        );
        if (i < 2) await page.locator("#next-button").click();
      }
    }
    // Corrupt browser storage must fail visibly, without executing its data.
    await page.evaluate(() =>
      localStorage.setItem(
        "kids10.growth-report.v2",
        '{"version":2,"data":null}',
      ),
    );
    await page.reload();
    await page.locator("#load-button").click();
    assert.match(
      await page.locator("#studio-status").textContent(),
      /읽을 수 없어요/,
    );
    await page.locator("#delete-button").click();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 3-step validation, duplicate records, live chart, gender, no-history, keyboard tabs, ICS download, print/PDF, copy, opt-in save/load/delete, reset, corrupt storage, 7 widths × 6 states, 6 accessibility scans, no JS errors",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
