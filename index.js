const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "mytoken123";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const SYSTEM_PROMPT = `Aap Kabir Industries ke WhatsApp assistant ho.

Aapke products:
- LOTA (Heavy): ₹1070 per kg + GST + Packing charges
  - Size 6": ₹30 per kg extra
  - Size 7": ₹10 per kg extra

Rules:
- Sirf Kabir Industries ke products ke baare mein batao
- Hindi aur English dono mein reply karo
- Polite aur professional raho
- Agar koi order karna chahe toh unka naam aur quantity poochho
- GST alag lagega ye zaroor batao`;

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (message?.type === 'text') {
      const userText = message.text.body;
      const phoneNumber = message.from;
      console.log('Message received:', userText);
      const claudeReply = await askClaude(userText);
      console.log('Claude reply:', claudeReply);
      await sendWhatsApp(phoneNumber, claudeReply);
    }
  } catch (err) {
    console.error('Error:', err);
  }
  res.sendStatus(200);
});

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
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }]
    })
  });
  const data = await response.json();
  console.log('Claude API response:', JSON.stringify(data));
  if (data.content && data.content[0]) {
    return data.content[0].text;
  }
  return "Sorry, kuch error hua!";
}

async function sendWhatsApp(to, message) {
  const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
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
  const data = await response.json();
  console.log('WhatsApp response:', JSON.stringify(data));
}

app.listen(3000, () => console.log('Server running!'));
