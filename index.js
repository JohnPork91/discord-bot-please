const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
app.use(express.json());

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DEFAULT_CHANNEL_ID = "1393951841238388816";

if (!DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN environment variable is not set.");
}

let client = null;
let connected = false;
let currentChannelId = DEFAULT_CHANNEL_ID;
let messages = [];

app.get('/', (req, res) => {
  res.send(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
  <title>Discord</title>
  <style>
    * {
      box-sizing: border-box;
      touch-action: manipulation;
    }
    body {
      font-family: "gg sans", "Whitney", "Helvetica Neue", Helvetica, Arial, sans-serif;
      background: #313338;
      color: #dbdee1;
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
    }
    
    /* Sidebar (Channel List) */
    .sidebar {
      width: 240px;
      background: #2b2d31;
      display: flex;
      flex-direction: column;
    }
    
    .sidebar-header {
      padding: 16px;
      font-weight: 600;
      font-size: 16px;
      color: #f2f3f5;
      border-bottom: 1px solid #1e1f22;
      height: 48px;
      display: flex;
      align-items: center;
    }
    
    .channel-list {
      padding: 8px;
      overflow-y: auto;
    }
    
    .channel-item {
      padding: 8px;
      margin: 2px 0;
      border-radius: 4px;
      cursor: pointer;
      color: #949ba4;
      font-size: 14px;
    }
    
    .channel-item:hover {
      background: #35373c;
      color: #dbdee1;
    }
    
    .channel-item.active {
      background: #404249;
      color: #f2f3f5;
    }
    
    .channel-item:before {
      content: "#";
      margin-right: 6px;
      color: #747f8d;
    }
    
    /* Main Chat Area */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    /* Chat Header */
    .chat-header {
      padding: 12px 16px;
      background: #313338;
      border-bottom: 1px solid #2b2d31;
      display: flex;
      align-items: center;
      height: 48px;
    }
    
    .chat-header-icon {
      color: #747f8d;
      margin-right: 10px;
      font-size: 20px;
    }
    
    .chat-header-title {
      font-weight: 600;
      font-size: 16px;
      color: #f2f3f5;
    }
    
    .chat-header-desc {
      font-size: 12px;
      color: #949ba4;
      margin-left: 10px;
    }
    
    /* Chat Messages */
    #chat {
      flex: 1;
      overflow-y: auto;
      padding: 0;
      background: #313338;
    }
    
    .msg {
      padding: 8px 16px;
      margin: 4px 0;
      display: flex;
      gap: 16px;
    }
    
    .msg:hover {
      background: #2e3035;
    }
    
    .msg-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #5865f2;
      flex-shrink: 0;
    }
    
    .msg-content {
      flex: 1;
      min-width: 0;
    }
    
    .msg-header {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 4px;
    }
    
    .msg-name {
      font-weight: 600;
      color: #f2f3f5;
      font-size: 14px;
    }
    
    .msg-bot-tag {
      background: #5865f2;
      color: #fff;
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }
    
    .msg-time {
      font-size: 11px;
      color: #949ba4;
    }
    
    .msg-text {
      color: #dbdee1;
      font-size: 14px;
      line-height: 1.4;
      word-break: break-word;
    }
    
    .msg-gif {
      margin-top: 8px;
      max-width: 300px;
      border-radius: 8px;
    }
    
    /* Message Input */
    .message-input-container {
      padding: 0 16px 24px;
    }
    
    .message-input-wrapper {
      background: #383a40;
      border-radius: 8px;
      padding: 0 16px;
      display: flex;
      align-items: center;
    }
    
    .message-input-wrapper input {
      width: 100%;
      padding: 12px 0;
      background: transparent;
      border: none;
      color: #dbdee1;
      font-size: 14px;
      outline: none;
    }
    
    .message-input-wrapper .icons {
      display: flex;
      gap: 8px;
      margin-left: 12px;
    }
    
    .message-input-wrapper .icon {
      color: #b5b6b8;
      cursor: pointer;
      font-size: 18px;
    }
    
    .message-input-wrapper .icon:hover {
      color: #dbdee1;
    }
    
    /* Input Group (Start/Stop Bot) */
    .input-group {
      background: #2b2d31;
      padding: 16px;
      border-radius: 8px;
      margin: 16px;
    }
    
    .input-group label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #b5b6b8;
      margin-bottom: 6px;
    }
    
    .input-group input[type="text"] {
      width: 100%;
      padding: 12px;
      background: #1e1f22;
      border: 1px solid #2b2d31;
      border-radius: 4px;
      color: #dbdee1;
      font-size: 14px;
    }
    
    .input-group input:focus {
      outline: none;
      border-color: #7289da;
    }
    
    .input-group .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 12px;
    }
    
    .input-group button {
      padding: 12px 16px;
      background: #7289da;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .input-group button:hover {
      background: #5b6eae;
    }
    
    .status {
      font-size: 12px;
      color: #949ba4;
      margin-top: 6px;
    }
    
    .status.connected {
      color: #3ba55c;
    }
  </style>
</head>
<body>
  <!-- Sidebar -->
  <div class="sidebar">
    <div class="sidebar-header">My Server</div>
    <div class="channel-list">
      <div class="channel-item active">General</div>
      <div class="channel-item">Chat</div>
      <div class="channel-item">Music</div>
      <div class="channel-item">Games</div>
    </div>
  </div>
  
  <!-- Main Chat -->
  <div class="main">
    <!-- Chat Header -->
    <div class="chat-header">
      <span class="chat-header-icon">#</span>
      <span class="chat-header-title">General</span>
      <span class="chat-header-desc">Main chat channel</span>
    </div>
    
    <!-- Messages -->
    <div id="chat"></div>
    
    <!-- Input Group (Bot Control) -->
    <div class="input-group">
      <label>Channel ID</label>
      <input id="channelId" type="text" value="1393951841238388816" placeholder="Channel ID" />
      
      <div class="row">
        <button onclick="startBot()">Start Bot</button>
        <button onclick="stopBot()" id="stopBtn" style="display:none; background: #4e5058;">Stop Bot</button>
      </div>
      
      <div class="status" id="status"></div>
    </div>
    
    <!-- Message Input -->
    <div class="message-input-container">
      <div class="message-input-wrapper">
        <input id="message" type="text" placeholder="Message @General" onkeydown="if(event.key==='Enter') sendMessage()" />
        <div class="icons">
          <span class="icon">🎵</span>
          <span class="icon">🎬</span>
          <span class="icon">😊</span>
          <span class="icon">📎</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    async function startBot() {
      const channelId = document.getElementById('channelId').value;
      if (!channelId) { alert('Please enter a channel ID.'); return; }
      
      const res = await fetch('/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId })
      });
      const data = await res.json();
      if (data.ok) {
        document.getElementById('status').textContent = 'Bot Running';
        document.getElementById('status').classList.add('connected');
        document.getElementById('stopBtn').style.display = 'inline-block';
        loadMessages();
      } else {
        alert(data.error);
      }
    }
    
    async function stopBot() {
      const res = await fetch('/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.ok) {
        document.getElementById('status').textContent = 'Bot Stopped';
        document.getElementById('status').classList.remove('connected');
        document.getElementById('stopBtn').style.display = 'none';
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
    }
    
    async function loadMessages() {
      const res = await fetch('/messages');
      const data = await res.json();
      const chat = document.getElementById('chat');
      chat.innerHTML = data.messages.map(m => {
        const gifMatch = m.content.match(/(https?:\/\/[^"\\s]+\\.(gif|gifv|mp4))/);
        let gifHTML = '';
        if (gifMatch) {
          gifHTML = \`<img class="msg-gif" src="\${gifMatch[0]}" alt="GIF">\\n\`;
        }
        
        return \`
          <div class="msg">
            <div class="msg-avatar"></div>
            <div class="msg-content">
              <div class="msg-header">
                <span class="msg-name">\${escapeHtml(m.author.replace('[Bot] ', ''))}</span>
                \${m.author.includes('[Bot]') ? '<span class="msg-bot-tag">BOT</span>' : ''}
                <span class="msg-time">\${escapeHtml(m.time)}</span>
              </div>
              <div class="msg-text">\${escapeHtml(m.content)}</div>
              \${gifHTML}
            </div>
          </div>
        \`;
      }).join('');
      chat.scrollTop = chat.scrollHeight;
    }
    
    function escapeHtml(text) {
      return String(text).replace(/[&<>"']/g, m => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":\"&#39;\"
      }[m]));
    }
    
    setInterval(loadMessages, 2000);
  </script>
</body>
</html>
  `);
});

app.post('/start', async (req, res) => {
  try {
    if (!DISCORD_TOKEN) {
      return res.json({ ok: false, error: 'DISCORD_TOKEN is not set in Railway Variables.' });
    }
    
    console.log('Starting bot...');
    
    const { channelId } = req.body;
    const finalChannelId = channelId || DEFAULT_CHANNEL_ID;
    
    currentChannelId = finalChannelId;
    messages = [];
    
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
      console.log(`✅ Bot connected as ${client.user.tag}`);
    });
    
    client.on('error', (err) => {
      console.error('❌ Bot error:', err);
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
    
    console.log('Logging in with token...');
    await client.login(DISCORD_TOKEN.trim());
    console.log('Login call completed');
    
    const channel = await client.channels.fetch(finalChannelId);
    if (!channel || !channel.isTextBased()) {
      console.error('Channel not found:', finalChannelId);
      return res.json({ ok: false, error: 'Channel not found or not text-based.' });
    }
    
    console.log('Fetching messages from channel...');
    const fetched = await channel.messages.fetch({ limit: 100 });
    console.log('Fetched', fetched.size, 'messages');
    
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
    
    console.log('Bot started successfully, total messages:', messages.length);
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Start error:', err);
    res.json({ ok: false, error: err.message });
  }
});

app.post('/stop', async (req, res) => {
  try {
    if (!client) return res.json({ ok: false, error: 'Bot is not running.' });
    await client.destroy();
    client = null;
    connected = false;
    messages = [];
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

app.post('/send', async (req, res) => {
  try {
    if (!client || !connected) return res.json({ ok: false, error: 'Bot is not running.' });
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
