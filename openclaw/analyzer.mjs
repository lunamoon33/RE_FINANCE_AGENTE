import { REST, Routes } from 'discord.js';
import Groq from 'groq-sdk';
import { supabase } from '../app/db.mjs';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENCLAW_CHANNEL_ID = process.env.DISCORD_OPENCLAW_CHANNEL_ID;

const groq = new Groq({ apiKey: GROQ_API_KEY });
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function runAnalysis() {
    console.log("🔍 Iniciando análisis pasivo de OpenClaw...");

    // Traer las sesiones más recientes completadas (ej. últimas 5)
    const { data: sessions, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error leyendo Supabase:", error);
        return;
    }

    if (!sessions || sessions.length === 0) {
        console.log("No hay sesiones completadas nuevas para analizar.");
        return;
    }

    console.log(`Analizando ${sessions.length} sesiones completadas...`);
    let dataset = [];

    for (let s of sessions) {
        const { data: messages } = await supabase.from('messages').select('role, content').eq('session_id', s.id).order('created_at', { ascending: true });
        if (messages) {
            dataset.push(`--- SESION ${s.id} (Score: ${s.score}) ---`);
            dataset.push(...messages.map(m => `${m.role.toUpperCase()}: ${m.content}`));
        }
    }

    const reportPrompt = `
Eres OpenClaw, el agente de IA encargado de analizar las interacciones con los usuarios de RE-FINANCE.
Aquí tienes transcripciones de sesiones recientes.
Tu objetivo es:
1. Resumir la efectividad de las entrevistas de forma súper concisa.
2. Proveer 2 recomendaciones claras para mejorar las preguntas financieras del bot, basadas en cómo respondieron los usuarios.

No saludes, genera directamente el reporte en formato Markdown.
`;

    const groqMessages = [
        { role: 'system', content: reportPrompt },
        { role: 'user', content: dataset.join('\n') }
    ];

    try {
        console.log("⏳ Generando insights con Groq...");
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: groqMessages,
            max_tokens: 1500,
            temperature: 0.3
        });

        const reportContent = completion.choices[0]?.message?.content || "No se pudo generar el reporte.";

        console.log("✅ Reporte generado.");

        if (OPENCLAW_CHANNEL_ID && OPENCLAW_CHANNEL_ID !== 'insert_channel_here') {
            await rest.post(Routes.channelMessages(OPENCLAW_CHANNEL_ID), {
                body: {
                    content: `📊 **Reporte Automático de OpenClaw**\n\n${reportContent}`
                }
            });
            console.log(`✉️ Reporte enviado al canal de Discord: ${OPENCLAW_CHANNEL_ID}`);
        } else {
            console.warn("⚠️ DISCORD_OPENCLAW_CHANNEL_ID no configurado en .env. El reporte solo se mostrará en consola:");
            console.log(reportContent);
        }

    } catch (e) {
        console.error("Error generando o enviando reporte:", e);
    }
}

// Ejecutar script
runAnalysis().catch(e => console.error("Error general:", e));
