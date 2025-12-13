require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { solveQuizRequest } = require('./worker');

const PORT = process.env.PORT || 7860;

const APP_SECRET = process.env.SECRET;
const APP_EMAIL = process.env.SERVER_EMAIL;

const app = express();

/**
 * JSON parser
 */
app.use(bodyParser.json({ limit: '2mb' }));

/**
 * ✅ FIX: Handle invalid JSON explicitly
 */
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next();
});

app.post('/endpoint', async (req, res) => {
  // ✅ FIX: safer content-type check
  if (!req.headers['content-type']?.includes('application/json')) {
    return res.status(400).json({ error: 'Content-Type must be application/json' });
  }

  const { email, secret, url } = req.body;

  if (!secret || secret !== APP_SECRET) {
    return res.status(403).json({ error: 'Invalid secret' });
  }

  if (!url) {
    return res.status(400).json({ error: 'Missing quiz URL' });
  }

  // Respond immediately (async processing allowed)
  res.status(200).json({ status: 'accepted' });

  try {
    await solveQuizRequest({
      email,
      secret,
      url,
      serverEmail: APP_EMAIL,
    });
  } catch (err) {
    console.error("Quiz solving error:", err.message);
  }
});

app.get('/test', (req, res) => {
  res.send("Service is running");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on ${PORT}`);
});
