import Groq from 'groq-sdk';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'deepseek-r1-distill-llama-70b';
const MEMORY_FILE = path.join(__dirname, 'memory.json');
const groq = new Groq({ apiKey: GROQ_API_KEY });

function loadMemory() {
  try { if (fs.existsSync(MEMORY_FILE)) return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')); } catch {}
  return {};
}
function saveMemory(data) { fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2)); }
let memory = loadMemory();

const SOUL = `Eres RE-FINANCE, agente financiero autónomo para emprendedoras latinoamericanas.
FLUJO: 1) Pregunta si es (A) Emprendedora (B) Fintech/DAO (C) Explorando
2) Si es emprendedora, haz las 9 preguntas UNA POR UNA:
1.Tipo de negocio 2.Dinámica de venta 3.Ingresos semanales 4.¿Ahorras? 5.Cuánto ahorras/mes 6.Último crédito 7.Experiencia con préstamos 8.Conocimiento finanzas 1-10 9.En qué invertiría el crédito
3) Calcula score 0-100: A(70-100) B(40-69) C(0-39)
4) A→conectar con Moola/Aave/Credit Collective. B→3 recomendaciones. C→plan 30/60/90 días.
PERSONALIDAD: Cálida, empática, español simple, una pregunta a la vez.`;

const sessions = new Map();
function getSession(uid) { if (!sessions.has(uid)) sessions.set(uid, []); return sessions.get(uid); }

async function askGroq(userId, userMessage) {
  const history = getSession(userId);
  history.push({ role: 'user', content: userMessage });
  try {
    const res = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: SOUL }, ...history],
      max_tokens: 1024,
      temperature: 0.7,
    });
    const reply = res.choices[0]?.message?.content || 'Error, intenta de nuevo.';
    history.push({ role: 'assistant', content: reply });
    if (history.length > 20) history.splice(0, 2);
    if (reply.match(/[ABC]\s*\(/)) {
      if (!memory[userId]) memory[userId] = {};
      memory[userId].lastInteraction = new Date().toISOString();
      saveMemory(memory);
    }
    return reply;
  } catch (e) {
    console.error('Groq error:', e.message);
    return 'Dificultades técnicas, intenta en unos minutos.';
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
});

client.once(Events.ClientReady, (c) => {
  console.log(`RE-FINANCE online: ${c.user.tag} | Model: ${MODEL}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  const isDM = message.channel.type === 1;
  const isMentioned = message.mentions.has(client.user);
  if (!isDM && !isMentioned) return;
  let content = message.content.replace(`<@${client.user.id}>`, '').trim() || 'Hola';
  await message.channel.sendTyping();
  const reply = await askGroq(message.author.id, content);
  if (reply.length > 2000) {
    for (const chunk of reply.match(/.{1,1900}/gs)) await message.reply(chunk);
  } else {
    await message.reply(reply);
  }
});

client.on('error', (e) => console.error('Discord error:', e.message));
process.on('unhandledRejection', (e) => console.error('Unhandled:', e.message));
client.login(DISCORD_TOKEN);
