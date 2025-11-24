const { parse: csvParse } = require("csv-parse");
const ExcelJS = require("exceljs");
const pdfParse = require("pdf-parse");

async function parseCSVBuffer(buf) {
  return csvParse(buf.toString("utf8"), { columns: true, skip_empty_lines: true });
}

async function parseXLSXBuffer(buf) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const sheet = wb.worksheets[0];

  const rows = [];
  let header = [];

  sheet.eachRow((row, rowNum) => {
    const cells = row.values.slice(1);
    if (rowNum === 1) header = cells.map(v => String(v || "").trim());
    else {
      const obj = {};
      for (let i = 0; i < header.length; i++) obj[header[i]] = cells[i];
      rows.push(obj);
    }
  });

  return rows;
}

async function parsePDFBuffer(buf) {
  const data = await pdfParse(buf);
  return data.text;
}

function sumColumnFromRecords(records, col = null) {
  if (!records.length) return null;

  let column = col;
  if (column && records[0][column] === undefined) {
    column = Object.keys(records[0])[0]; // fallback
  }

  return records.reduce((sum, row) => {
    const v = Number(String(row[column]).replace(/,/g, ""));
    return isFinite(v) ? sum + v : sum;
  }, 0);
}

module.exports = {
  parseCSVBuffer,
  parseXLSXBuffer,
  parsePDFBuffer,
  sumColumnFromRecords
};
