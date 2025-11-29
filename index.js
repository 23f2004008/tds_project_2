require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { solveQuizRequest } = require('./worker');

const PORT = process.env.PORT || 3000;
const APP_SECRET = process.env.SECRET;
const APP_EMAIL = process.env.SERVER_EMAIL;

console.log("Loaded SECRET:", APP_SECRET);
console.log("Loaded SERVER_EMAIL:", APP_EMAIL);

const app = express();
app.use(bodyParser.json({ limit: '2mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({ status: "running", message: "Use POST to submit quiz." });
});

app.post('/endpoint', async (req, res) => {
  const { email, secret, url } = req.body;

  console.log("Received secret:", secret);
  console.log("Expected secret:", APP_SECRET);

  if (secret !== APP_SECRET) {
    return res.status(403).json({ error: 'Invalid secret' });
  }

  res.status(200).json({ status: 'accepted', message: 'Working on quiz now...' });

  try {
    console.log("Solving quiz:", url);
    const result = await solveQuizRequest({ 
      email, 
      secret, 
      url, 
      serverEmail: APP_EMAIL 
    });
    console.log("Task finished:", result);
  } catch (err) {
    console.error("Error solving quiz:", err);
  }
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
