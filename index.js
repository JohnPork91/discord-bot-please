const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
app.use(express.json());

// Token from Railway environment variable
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DEFAULT_CHANNEL_ID = "1393951841238388816";

if (!DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN environment variable is not set.");
}

let client = null;
let connected = false;
let currentChannelId = DEFAULT_CHANNEL_ID;
let messages = [];
let channelMembers = []; // { id, username }

app.get('/', (req, res) => {
  res.send(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Discord Chat Bot</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: "Whitney", "Helvetica Neue", Helvetica, Arial, sans-serif;
      background: #313338;
      color: #dbdee1;
      margin: 0;
      padding: 0;
      min-height: 100vh;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    h2 {
      margin: 0 0 20px;
      font-size: 24px;
      font-weight: 600;
      color: #f2f3f5;
    }

    .input-group {
      background: #2b2d31;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #b5b6b8;
      margin-bottom: 6px;
    }

    input[type="text"],
    input[type="password"] {
      width: 100%;
      padding: 12px;
      background: #1e1f22;
      border: 1px solid #2b2d31;
      border-radius: 4px;
      color: #dbdee1;
      font-size: 14px;
    }
    input:focus {
      outline: none;
      border-color: #7289da;
    }

    button {
      padding: 12px 16px;
      background: #7289da;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover {
      background: #5b6eae;
    }
    button:disabled {
      background: #4e5058;
      cursor: not-allowed;
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 12px;
    }

    .chat-container {
      background: #2b2d31;
      border-radius: 8px;
      overflow: hidden;
    }

    .chat-header {
      padding: 12px 16px;
      background: #313338;
      border-bottom: 1px solid #2b2d31;
      font-weight: 600;
      color: #f2f3f5;
    }

    #chat {
      height: 420px;
      overflow-y: auto;
      padding: 16px;
      background: #313338;
      display: flex;
      flex-direction: column;
    }

    .msg {
      margin-bottom: 16px;
      padding: 8px 12px;
      background: #2b2d31;
      border-radius: 8px;
    }

    .msg .name {
      font-weight: 600;
      color: #f2f3f5;
      margin-bottom: 4px;
    }

    .msg .message-content {
      color: #dbdee1;
      font-size: 14px;
      line-height: 1.4;
      word-break: break-word;
    }

    .msg .meta {
      font-size: 11px;
      color: #949ba4;
      margin-top: 4px;
    }

    .message-input {
      padding: 16px;
      background: #2b2d31;
    }

    .message-input input {
      width: 100%;
      padding: 12px 16px;
      background: #1e1f22;
      border: none;
      border-radius: 8px;
      color: #dbdee1;
      font-size: 14px;
    }
    .message-input input:focus {
      outline: none;
    }

    .message-input button {
      margin-top: 8px;
      width: 100%;
    }

    .status {
      font-size: 12px;
      color: #949ba4;
      margin-top: 6px;
    }
    .status.connected {
      color: #3ba55c;
    }

    /* User suggestion box */
    .suggestions {
      position: absolute;
      background: #1e1f22;
      border: 1px solid #2b2d31;
      border-radius: 6px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
    }
    .suggestion-item {
      padding: 8px 12px;
      cursor: pointer;
      font-size: 13px;
      color: #dbdee1;
    }
    .suggestion-item:hover {
      background: #7289da;
      color: #fff;
    }
    .message-input-wrapper {
      position: relative;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Discord Chat Bot</h2>

    <div class="input-group">
      <label>Channel ID</label>
      <input id="channelId" type="text" value="1393951841238388816" placeholder="Channel ID" />

      <div class="row">
        <button onclick="connectBot()">Connect Bot</button>
        <button onclick="disconnectBot()" id="disconnectBtn" style="display:none; background: #4e5058;">Disconnect Bot</button>
      </div>

      <div class="status" id="status"></div>
    </div>

    <div class="chat-container">
      <div class="chat-header">Channel Messages</div>
      <div id="chat"></div>
      <div class="message-input">
        <div class="message-input-wrapper">
          <input id="message" type="text" placeholder="Type a message... (use @ to ping)" oninput="handleInput()" onkeydown="handleKeyDown(event)" />
          <div id="suggestions" class="suggestions" style="display:none;"></div>
        </div>
        <button onclick="sendMessage()">Send Message</button>
      </div>
    </div>
  </div>

  <script>
    let userIndex = -1;
    let currentSuggestions = [];

    async function connectBot() {
      const channelId = document.getElementById('channelId').value;
      if (!channelId) { alert('Please enter a channel ID.'); return; }

      const res = await fetch('/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId })
      });
      const data = await res.json();
      if (data.ok) {
        document.getElementById('status').textContent = 'Connected';
        document.getElementById('status').classList.add('connected');
        document.getElementById('disconnectBtn').style.display = 'inline-block';
        loadMessages();
      } else {
        alert(data.error);
      }
    }

    async function disconnectBot() {
      const res = await fetch('/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.ok) {
        document.getElementById('status').textContent = 'Disconnected';
        document.getElementById('status').classList.remove('connected');
        document.getElementById('disconnectBtn').style.display = 'none';
      } else {
        alert(data.error);
      }
    }

    async function sendMessage() {
      const input = document.getElementById('message');
      const message = input.value;
      if (!message) return;

      const res = await fetch('/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (!data.ok) alert(data.error);
      input.value = '';
      hideSuggestions();
    }

    async function loadMessages() {
      const res = await fetch('/messages');
      const data = await res.json();
      const chat = document.getElementById('chat');
      chat.innerHTML = data.messages.map(m => \`
        <div class="msg">
          <div class="name">\${escapeHtml(m.author)}</div>
          <div class="message-content">\${escapeHtml(m.content)}</div>
          <div class="meta">\${escapeHtml(m.time)}</div>
        </div>
      \`).join('');
      chat.scrollTop = chat.scrollHeight;
    }

    function escapeHtml(text) {
      return String(text).replace(/[&<>"']/g, m => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":\"&#39;\"
      }[m]));
    }

    function handleInput() {
      const input = document.getElementById('message');
      const value = input.value;
      const pos = input.selectionStart;

      // Find last @ before current position
      const lastAtIndex = value.lastIndexOf('@', pos - 1);
      if (lastAtIndex === -1) {
        hideSuggestions();
        return;
      }

      const afterAt = value.slice(lastAtIndex + 1, pos);
      if (afterAt.length === 0) {
        showAllSuggestions();
      } else {
        filterSuggestions(afterAt);
      }
    }

    function handleKeyDown(event) {
      // Navigate suggestions with ArrowUp / ArrowDown
      if (event.key === 'ArrowDown') {
        if (currentSuggestions.length > 0) {
          userIndex = (userIndex + 1) % currentSuggestions.length;
          highlightSuggestion(userIndex);
        }
        return;
      }
      if (event.key === 'ArrowUp') {
        if (currentSuggestions.length > 0) {
          userIndex = (userIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
          highlightSuggestion(userIndex);
        }
        return;
      }

      // Select suggestion with Enter
      if (event.key === 'Enter' && currentSuggestions.length > 0) {
        if (userIndex >= 0) {
          const user = currentSuggestions[userIndex];
          insertPing(document.getElementById('message'), user);
        }
        hideSuggestions();
        return;
      }

      // Hide suggestions on Escape
      if (event.key === 'Escape') {
        hideSuggestions();
        return;
      }
    }

    function showAllSuggestions() {
      const suggestionsEl = document.getElementById('suggestions');
      suggestionsEl.innerHTML = channelMembers.map(u => \`
        <div class="suggestion-item" data-userid="\${u.id}" data-username="\${u.username}">
          @\${escapeHtml(u.username)}
        </div>
      \`).join('');
      suggestionsEl.style.display = 'block';
      userIndex = 0;
      highlightSuggestion(0);
    }

    function filterSuggestions(text) {
      const filtered = channelMembers.filter(u =>
        u.username.toLowerCase().includes(text.toLowerCase())
      );
      currentSuggestions = filtered;

      const suggestionsEl = document.getElementById('suggestions');
      if (filtered.length === 0) {
        suggestionsEl.style.display = 'none';
        return;
      }

      suggestionsEl.innerHTML = filtered.map(u => \`
        <div class="suggestion-item" data-userid="\${u.id}" data-username="\${u.username}">
          @\${escapeHtml(u.username)}
        </div>
      \`).join('');
      suggestionsEl.style.display = 'block';
      userIndex = 0;
      highlightSuggestion(0);
    }

    function highlightSuggestion(index) {
      const items = document.querySelectorAll('.suggestion-item');
      items.forEach((item, i) => {
        if (i === index) {
          item.style.background = '#7289da';
          item.style.color = '#fff';
        } else {
          item.style.background = '';
          item.style.color = '';
        }
      });
    }

    function hideSuggestions() {
      const suggestionsEl = document.getElementById('suggestions');
      suggestionsEl.style.display = 'none';
      currentSuggestions = [];
      userIndex = -1;
    }

    function insertPing(input, user) {
      const value = input.value;
      const pos = input.selectionStart;

      const lastAtIndex = value.lastIndexOf('@', pos - 1);
      if (lastAtIndex === -1) return;

      const before = value.slice(0, lastAtIndex);
      const discordPing = \`<@\${user.id}>\`;
      const after = value.slice(pos);

      input.value = before + discordPing + after;
      input.selectionStart = input.selectionEnd = before.length + discordPing.length;
    }

    setInterval(loadMessages, 2000);
  </script>
</body>
</html>
  `);
});

app.post('/connect', async (req, res) => {
  try {
    if (!DISCORD_TOKEN) {
      return res.json({ ok: false, error: 'DISCORD_TOKEN is not set in Railway Variables.' });
    }

    const { channelId } = req.body;
    const finalChannelId = channelId || DEFAULT_CHANNEL_ID;

    currentChannelId = finalChannelId;
    messages = [];
    channelMembers = [];

    if (client) {
      try { await client.destroy(); } catch {}
    }

    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ],
      partials: [Partials.Channel]
    });

    client.once('ready', () => {
      connected = true;
      console.log(`Logged in as ${client.user.tag}`);
    });

    client.on('messageCreate', (msg) => {
      if (msg.channel.id !== currentChannelId) return;
      messages.push({
        author: msg.author.bot ? `[Bot] ${msg.author.username}` : msg.author.username,
        content: msg.content || '[no text]',
        time: new Date(msg.createdTimestamp).toLocaleString()
      });
      if (messages.length > 100) messages.shift();
    });

    await client.login(DISCORD_TOKEN.trim());

    const channel = await client.channels.fetch(finalChannelId);
    if (!channel || !channel.isTextBased()) {
      return res.json({ ok: false, error: 'Channel not found or not text-based.' });
    }

    // Fetch last 100 messages
    const fetched = await channel.messages.fetch({ limit: 100 });
    const fetchedArray = Array.from(fetched.values());
    fetchedArray.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    for (const msg of fetchedArray) {
      messages.push({
        author: msg.author.bot ? `[Bot] ${msg.author.username}` : msg.author.username,
        content: msg.content || '[no text]',
        time: new Date(msg.createdTimestamp).toLocaleString()
      });
    }

    if (messages.length > 100) messages = messages.slice(0, 100);

    // Fetch channel members for @ ping
    try {
      const members = await channel.members.fetch();
      channelMembers = members.map((m, id) => ({
        id: id,
        username: m.user.username
      }));
    } catch (err) {
      console.error('Could not fetch members:', err.message);
    }

    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.post('/disconnect', async (req, res) => {
  try {
    if (!client) return res.json({ ok: false, error: 'Bot is not connected.' });
    await client.destroy();
    client = null;
    connected = false;
    messages = [];
    channelMembers = [];
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.post('/send', async (req, res) => {
  try {
    if (!client || !connected) return res.json({ ok: false, error: 'Bot is not connected.' });
    const { message } = req.body;
    if (!message) return res.json({ ok: false, error: 'Message is empty.' });

    const channel = await client.channels.fetch(currentChannelId);
    if (!channel || !channel.isTextBased()) return res.json({ ok: false, error: 'Channel not found or not text-based.' });

    await channel.send(message);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.get('/messages', (req, res) => {
  res.json({ messages });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
