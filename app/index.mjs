import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { SuperDappAgent } = require('@superdapp/agents');
import express from 'express';
import Groq from 'groq-sdk';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SUPERDAPP_API_TOKEN = process.env.SUPERDAPP_API_KEY;
const WEBHOOK_PORT = process.env.SUPERDAPP_WEBHOOK_PORT || 3000;
const MODEL = 'llama-3.3-70b-versatile';
const MEMORY_FILE = path.join(__dirname, 'memory.json');
const groq = new Groq({ apiKey: GROQ_API_KEY });
const agent = new SuperDappAgent({ apiToken: SUPERDAPP_API_TOKEN, baseUrl: 'https://api.superdapp.ai' });
// Unir agente al Super Group — ejecutar solo una vez
function loadMemory() { try { if (fs.existsSync(MEMORY_FILE)) return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')); } catch {} return {}; }
function saveMemory(data) { fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2)); }
let memory = loadMemory();
const SOUL = fs.readFileSync(path.join(__dirname, '../workspace/SOUL.md'), 'utf8');
const sessions = new Map();
function getSession(userId) { if (!sessions.has(userId)) sessions.set(userId, []); return sessions.get(userId); }
async function askGroq(userId, userMessage) {
  const history = getSession(userId);
  history.push({ role: 'user', content: userMessage });
  try {
    const response = await groq.chat.completions.create({ model: MODEL, messages: [{ role: 'system', content: SOUL }, ...history], max_tokens: 1024, temperature: 0.7 });
    const reply = response.choices[0]?.message?.content || 'Lo siento, hubo un error.';
    history.push({ role: 'assistant', content: reply });
    if (history.length > 20) history.splice(0, 2);
    return reply;
  } catch (error) { console.error('Groq error:', error.message); return '⚠️ Dificultades técnicas. Intenta en unos minutos.'; }
}
agent.addCommand('/hola', async ({ roomId }) => {
  console.log('🔑 roomId SDK:', roomId);
  const reply = await askGroq('superdapp_' + roomId, 'Hola');
  await agent.sendConnectionMessage(roomId, reply);
});
agent.addCommand('/message', async ({ roomId, message }) => {
  const text = message?.body?.m?.body || message?.body?.m?.text || '';
  if (!text) return;
  console.log('📱 SuperDapp: "' + text + '"');
  const reply = await askGroq('superdapp_' + roomId, text);
  await agent.sendConnectionMessage(roomId, reply);
  console.log('✅ Respuesta enviada');
});
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages] });
client.once(Events.ClientReady, (c) => { console.log('✅ RE-FINANCE Agent online as ' + c.user.tag); console.log('🤖 Model: ' + MODEL); });
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  const isMentioned = message.mentions.has(client.user);
  const isDM = message.channel.type === 1;
  if (!isDM && !isMentioned) return;
  let content = message.content.replace('<@' + client.user.id + '>', '').trim();
  if (!content) content = 'Hola';
  await message.channel.sendTyping();
  const reply = await askGroq(message.author.id, content);
  if (reply.length > 2000) { const chunks = reply.match(/.{1,1900}/gs) || [reply]; for (const chunk of chunks) await message.reply(chunk); }
  else await message.reply(reply);
});
client.on('error', (error) => console.error('Discord error:', error.message));
process.on('unhandledRejection', (error) => console.error('Unhandled:', error.message));
const app = express();
app.use(express.json());
app.post('/webhook', async (req, res) => {
  res.status(200).send('OK');
  try {
    let body = req.body;
    if (body?.challenge) return;
    if (body?.body && typeof body.body === 'string') {
      try {
        const parsed = JSON.parse(body.body);
        if (parsed.m && typeof parsed.m === 'string') {
          const inner = JSON.parse(decodeURIComponent(parsed.m));
          body = { ...body, body: { m: inner } };
        }
      } catch(e) {}
    }
    await agent.processRequest(body);
  } catch(e) { console.error('❌ error:', e.message); }
});
app.listen(WEBHOOK_PORT, () => { console.log('🌐 SuperDapp webhook escuchando en puerto ' + WEBHOOK_PORT); });
client.login(DISCORD_TOKEN);
