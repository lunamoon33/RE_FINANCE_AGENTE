import Groq from 'groq-sdk';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GROQ_API_KEY  = process.env.GROQ_API_KEY;
const MODEL         = 'llama-3.3-70b-versatile';
const MEMORY_FILE   = path.join(__dirname, 'memory.json');

const groq = new Groq({ apiKey: GROQ_API_KEY });

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
  } catch {}
  return {};
}

function saveMemory(data) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
}

let memory = loadMemory();

const SOUL = `Eres RE-FINANCE, un agente financiero autónomo que ayuda a emprendedoras latinoamericanas a acceder a crédito Web3.

Tu misión: generar un score crediticio alternativo para emprendedoras informales y conectarlas con Fintechs y DAOs.

FLUJO OBLIGATORIO:
1. Primero pregunta si el usuario es: (A) Emprendedora, (B) Fintech/DAO, (C) Solo explorando
2. Si es Emprendedora → realiza las 9 preguntas UNA POR UNA:
   1. ¿Qué tipo de negocio tienes?
   2. ¿Cómo es tu dinámica de venta?
   3. ¿Cuánto percibes de ingresos en una semana?
   4. ¿Ahorras actualmente?
   5. ¿Cuánto ahorras al mes?
   6. La última vez que accediste a crédito ¿a cuánto accediste?
   7. ¿Cuál fue tu experiencia con préstamos pasados?
   8. Del 1 al 10, ¿qué tanto conoces de finanzas?
   9. Si accedieras a financiamiento, ¿en qué lo invertirías?
3. Al terminar → calcula score (0-100) y categoría A/B/C
4. Categoría A (70-100) → conectar con Moola, Aave, Credit Collective
   Categoría B (40-69) → 3 recomendaciones + seguimiento
   Categoría C (0-39) → plan de mejora 30/60/90 días

PERSONALIDAD: Cálida, empática, español simple, no juzgas a nadie.
REGLAS: Una pregunta a la vez. Siempre responde en español.`;

const sessions = new Map();

function getSession(userId) {
  if (!sessions.has(userId)) sessions.set(userId, []);
  return sessions.get(userId);
}

async function askGroq(userId, userMessage) {
  const history = getSession(userId);
  history.push({ role: 'user', content: userMessage });

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: SOUL }, ...history],
      max_tokens: 1024,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content || 'Lo siento, hubo un error. Intenta de nuevo.';
    history.push({ role: 'assistant', content: reply });
    if (history.length > 20) history.splice(0, 2);

    if (reply.match(/[ABC]\s*\(/)) {
      if (!memory[userId]) memory[userId] = {};
      memory[userId].lastInteraction = new Date().toISOString();
      saveMemory(memory);
    }

    return reply;
  } catch (error) {
    console.error('Groq error:', error.message);
    return '⚠️ Estoy teniendo dificultades técnicas. Por favor intenta en unos minutos.';
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ RE-FINANCE Agent online as ${c.user.tag}`);
  console.log(`🤖 Model: ${MODEL}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  const isMentioned = message.mentions.has(client.user);
  const isDM = message.channel.type === 1;
  if (!isDM && !isMentioned) return;

  let content = message.content.replace(`<@${client.user.id}>`, '').trim();
  if (!content) content = 'Hola';

  await message.channel.sendTyping();
  const reply = await askGroq(message.author.id, content);

  if (reply.length > 2000) {
    const chunks = reply.match(/.{1,1900}/gs) || [reply];
    for (const chunk of chunks) await message.reply(chunk);
  } else {
    await message.reply(reply);
  }
});

client.on('error', (error) => console.error('Discord error:', error.message));
process.on('unhandledRejection', (error) => console.error('Unhandled:', error.message));

client.login(DISCORD_TOKEN);
