const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = "mytoken123";
const WHATSAPP_TOKEN = "YAHAN_APNA_ACCESS_TOKEN_DAALO";
const ANTHROPIC_API_KEY = "YAHAN_APNA_CLAUDE_KEY_DAALO";
const PHONE_NUMBER_ID = "938913972648319";

// Webhook verify
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// Message receive
app.post('/webhook', async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (message?.type === 'text') {
    const userText = message.text.body;
    const phoneNumber = message.from;
    const claudeReply = await askClaude(userText);
    await sendWhatsApp(phoneNumber, claudeReply);
  }
  res.sendStatus(200);
});

// Claude API
async function askClaude(userMessage) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: userMessage }]
    })
  });
  const data = await response.json();
  return data.content[0].text;
}

// WhatsApp bhejo
async function sendWhatsApp(to, message) {
  await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      text: { body: message }
    })
  });
}

app.listen(3000, () => console.log('Server running!'));
