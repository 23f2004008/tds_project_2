# LLM Analysis Quiz Solver (TDS Project)

This project exposes an HTTP endpoint that solves the TDS LLM Analysis Quiz.
It handles:

- Secret validation
- Scraping dynamic JavaScript-rendered quiz pages via Playwright
- Extraction of base64 HTML from the DOM
- Handling of shadow DOM, iframes, and dynamic scripts
- Download & parsing of CSV, XLSX, and PDF files
- Multi-step quiz chaining (fetch → answer → next URL)
- Playback of audio/video tasks if required
- Submission to the provided quiz `/submit` endpoint
- Respecting 3-minute time limits

## Tech Stack
- Node.js
- Express
- Axios
- Playwright (Chromium)
- PDF-parse
- exceljs
- csv-parse
- dotenv

## API Endpoint
POST `/endpoint`

Expected JSON:
```json
{
  "email": "your_email@example.com",
  "secret": "your_secret",
  "url": "quiz-url-provided-by-tds"
}
