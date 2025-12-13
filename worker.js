const axios = require("axios");
const { chromium } = require("playwright");
const { downloadFile } = require("./utils/download");
const {
  parseCSVBuffer,
  parseXLSXBuffer,
  parsePDFBuffer,
  sumColumnFromRecords,
} = require("./utils/parsers");

async function solveQuizRequest({ email, secret, url, serverEmail }) {
  const TIME_LIMIT_MS = 2.5 * 60 * 1000;
  const start = Date.now();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let currentUrl = url;

  while (currentUrl && Date.now() - start < TIME_LIMIT_MS) {
    await page.goto(currentUrl, { waitUntil: "networkidle" });

    let resultHtml = await page.$eval("#result", el => el.innerHTML).catch(() => null);
    let shadowHtml = await page.$eval("#app", el => el.shadowRoot?.innerHTML).catch(() => null);
    let bodyText = shadowHtml || resultHtml || (await page.textContent("body"));

    // 🔍 Extract submit URL (MANDATORY)
    const submitMatch = bodyText.match(/https?:\/\/[^\s"'<>]+\/submit[^\s"'<>]*/i);
    if (!submitMatch) {
      throw new Error("Submit URL not found on quiz page");
    }
    const submitUrl = submitMatch[0];

    // 🔍 Extract file URL (optional)
    const fileMatch = bodyText.match(/https?:\/\/[^\s"'<>]+\.(csv|xlsx|pdf)/i);
    const fileUrl = fileMatch ? fileMatch[0] : null;

    let answer = null;

    /**
     * 🧠 Basic instruction-aware logic
     */
    if (/true|false/i.test(bodyText)) {
      answer = /true/i.test(bodyText);
    }

    else if (fileUrl) {
      const buffer = await downloadFile(fileUrl);
      const ext = fileUrl.split(".").pop().toLowerCase();

      if (ext === "csv") {
        const rows = await parseCSVBuffer(buffer);
        answer = sumColumnFromRecords(rows, "value");
      }

      else if (ext === "xlsx") {
        const rows = await parseXLSXBuffer(buffer);
        answer = sumColumnFromRecords(rows, "value");
      }

      else if (ext === "pdf") {
        const text = await parsePDFBuffer(buffer);
        const nums = [...text.matchAll(/-?\d[\d,.]*/g)]
          .map(m => Number(m[0].replace(/,/g, "")))
          .filter(n => isFinite(n));
        answer = nums.reduce((a, b) => a + b, 0);
      }
    }

    else if (/sum/i.test(bodyText)) {
      throw new Error("Sum requested but no file found");
    }

    else {
      answer = bodyText.trim().slice(0, 200);
    }

    const payload = {
      email: email || serverEmail,
      secret,
      url: currentUrl,
      answer,
    };

    const resp = await axios.post(submitUrl, payload);

    if (resp.data?.url) {
      currentUrl = resp.data.url;
    } else {
      break;
    }
  }

  await browser.close();
  return { ok: true };
}

module.exports = { solveQuizRequest };
