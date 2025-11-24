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
    console.log("Opening URL:", currentUrl);
    await page.goto(currentUrl, { waitUntil: "networkidle" });

    // Print the full page content for debugging
    const pageHtml = await page.content();
    console.log("\n=== PAGE CONTENT START ===\n");
    console.log(pageHtml);
    console.log("\n=== PAGE CONTENT END ===\n");

    // Try to extract #result (real quizzes sometimes use this)
    let resultHtml = await page
      .$eval("#result", (el) => el.innerHTML)
      .catch(() => null);

    // Try Shadow DOM (#app)
    let shadowHtml = await page
      .$eval("#app", (el) => el.shadowRoot?.innerHTML)
      .catch(() => null);

    // Try full body
    let bodyHtml = await page.textContent("body").catch(() => "");

    // Pick whichever contains useful content
    let bodyText =
      shadowHtml && shadowHtml.trim().length > 0
        ? shadowHtml
        : resultHtml && resultHtml.trim().length > 0
        ? resultHtml
        : bodyHtml;

    console.log("Extracted bodyText:\n", bodyText, "\n");

    // 1️⃣ Extract file URL (csv, xlsx, pdf)
    let fileUrlMatch = bodyText.match(
      /https?:\/\/[^\s"'<>]+\.(csv|xlsx|pdf)/i
    );
    let fileUrl = fileUrlMatch ? fileUrlMatch[0] : null;

    console.log("File detected:", fileUrl);

    // 2️⃣ Extract submit URL
    let submitMatch = bodyText.match(
      /https?:\/\/[^\s"'<>]+\/submit[^\s"'<>]*/i
    );
    let submitUrl = submitMatch ? submitMatch[0] : null;

    console.log("Submit URL:", submitUrl);

    let answer = null;

    // ============================================
    // 🚨 DEMO MODE: No file, no quiz → submit something
    // ============================================
    if (!fileUrl) {
      console.log("No file found — demo mode. Submitting fallback answer.");
      answer = "demo-answer"; // anything allowed
      submitUrl = "https://tds-llm-analysis.s-anand.net/submit"; // from demo page
    }

    // 3️⃣ Download & parse real files (real quiz)
    if (fileUrl) {
      try {
        const buffer = await downloadFile(fileUrl);
        const ext = fileUrl.split(".").pop().toLowerCase();

        if (ext === "csv") {
          const rows = await parseCSVBuffer(buffer);
          answer = sumColumnFromRecords(rows, "value");
        } else if (ext === "xlsx") {
          const rows = await parseXLSXBuffer(buffer);
          answer = sumColumnFromRecords(rows, "value");
        } else if (ext === "pdf") {
          const text = await parsePDFBuffer(buffer);
          const nums = [...text.matchAll(/-?\d[\d,.]*/g)].map((m) =>
            Number(m[0].replace(/,/g, ""))
          );
          answer = nums.reduce((a, b) => a + b, 0);
        }
      } catch (err) {
        console.log("File parse error:", err);
      }
    }

    console.log("Computed answer:", answer);

    if (!submitUrl) {
      console.log("No submit URL found. Ending task.");
      break;
    }

    // 4️⃣ Submit answer
    const payload = {
      email: email || serverEmail,
      secret,
      url: currentUrl,
      answer,
    };

    console.log("Submitting answer:", payload);

    let resp;
    try {
      resp = await axios.post(submitUrl, payload);
      console.log("Submit response:", resp.data);
    } catch (err) {
      console.log("Submit error:", err.response?.data);
      break;
    }

    // Continue quiz chain
    if (resp.data.url) {
      currentUrl = resp.data.url;
    } else {
      console.log("Quiz completed.");
      break;
    }
  }

  await browser.close();
  return { ok: true };
}

module.exports = { solveQuizRequest };
