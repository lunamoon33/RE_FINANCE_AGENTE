import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import { Client, GatewayIntentBits, REST, Routes, Events } from 'discord.js';
import Groq from 'groq-sdk';
import { supabase } from './db.mjs';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const BOT_CHANNEL_ID = process.env.DISCORD_BOT_CHANNEL_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
let groq;
try {
    groq = new Groq({ apiKey: GROQ_API_KEY });
} catch (e) {
    console.warn("⚠️ Groq client initialization failed, ensure GROQ_API_KEY is correct.");
}

const SYSTEM_PROMPT = `Eres un asesor financiero experto de RE-FINANCE.
Tu objetivo es realizar una breve entrevista de unas 3 a 4 preguntas para evaluar la salud crediticia/financiera del usuario.
Reglas Críticas:
1. BLOQUEO TEMÁTICO: No respondas ni fomentes temas que no sean estrictamente de finanzas, crédito o emprendimiento. Si el usuario se desvía, córtalo amablemente y vuélvelo a la entrevista.
2. Haz una pregunta a la vez. Sé amable, pero extremadamente conciso.
3. Al terminar la entrevista, despídete brevemente y escribe SIEMPRE exactamente la palabra "ENTREVISTA_FINALIZADA" al final de tu último mensaje.`;

const SCORING_PROMPT = `Basado en la siguiente conversación financiera, calcula un score financiero del 1 al 100 del usuario. Devuelve SOLO un número entero, nada de texto adicional.`;

client.once(Events.ClientReady, async (c) => {
    console.log(`✅ RE-FINANCE MVP Bot online as ${c.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
            body: [
                {
                    name: 'refinance',
                    description: 'Inicia una entrevista financiera'
                }
            ]
        });
        console.log('✅ Comando /refinance registrado');
    } catch (e) {
        console.error('Error al registrar comando. Revisa DISCORD_CLIENT_ID y DISCORD_TOKEN.', e.message);
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'refinance') {
        // Validación de canal
        if (BOT_CHANNEL_ID && interaction.channelId !== BOT_CHANNEL_ID && BOT_CHANNEL_ID !== 'insert_channel_here') {
            return interaction.reply({ content: `Por favor usa este comando en el canal designado para el bot.`, ephemeral: true });
        }
        
        await interaction.reply({ content: 'Iniciando sesión en la base de datos...', ephemeral: true });

        try {
            // Verificar si el usuario existe
            let { data: dbUser } = await supabase.from('users').select('*').eq('discord_id', interaction.user.id).single();
            if (!dbUser) {
                const { data: newUser } = await supabase.from('users').insert({ discord_id: interaction.user.id }).select().single();
                dbUser = newUser;
            }

            // Crear Thread
            const threadName = `Entrevista - ${interaction.user.username}`;
            const thread = await interaction.channel.threads.create({
                name: threadName,
                type: 11, // GUILD_PUBLIC_THREAD
                reason: 'Sesión RE-FINANCE'
            });

            // Insertar sesión
            const { data: session } = await supabase.from('sessions').insert({
                thread_id: thread.id,
                user_id: dbUser.id,
                status: 'active'
            }).select().single();

            // Mensaje inicial
            const msg = `¡Hola <@${interaction.user.id}>! Soy tu agente RE-FINANCE. Vamos a revisar tu perfil financiero para darte las mejores recomendaciones.\n\nPara empezar, ¿cuáles son tus principales fuentes de ingresos actuales?`;
            await thread.send(msg);
            
            // Guardar primer mensaje
            await supabase.from('messages').insert({ session_id: session.id, role: 'assistant', content: msg });
        } catch (e) {
            console.error('Database/Thread error:', e);
            await interaction.followUp({ content: 'Error al iniciar sesión. Revisa las credenciales de Supabase.', ephemeral: true });
        }
    }
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;
    if (!message.channel.isThread()) return;

    try {
        // Verificar existencia de sesión activa para este thread
        const { data: session } = await supabase.from('sessions').select('*').eq('thread_id', message.channel.id).single();
        if (!session) return; // No es un thread del bot
        
        if (session.status === 'completed') return;

        if (session.status === 'awaiting_decision') {
            const text = message.content.toLowerCase();
            if (text.includes('si') || text.includes('sí') || text.includes('yes')) {
                await supabase.from('sessions').update({ publish_decision: true, status: 'awaiting_wallet' }).eq('id', session.id);
                await message.reply("¡Genial! Por favor envía la dirección de tu **wallet** para publicar los resultados.");
            } else {
                await supabase.from('sessions').update({ publish_decision: false, status: 'completed' }).eq('id', session.id);
                await message.reply("Entendido. No publicaremos los datos. ¡Gracias por usar RE-FINANCE!");
            }
            return;
        }

        if (session.status === 'awaiting_wallet') {
            const wallet = message.content.trim();
            await supabase.from('users').update({ wallet }).eq('id', session.user_id);
            
            const testnetUrl = process.env.TESTNET_URL || 'https://testnet.re-finance.com';
            await supabase.from('sessions').update({ testnet_url: testnetUrl, status: 'completed' }).eq('id', session.id);
            
            await message.reply(`✅ Tus resultados han sido mock-publicados para la wallet \`${wallet}\` en el endpoint: ${testnetUrl}\n¡Sesión finalizada exitosamente!`);
            return;
        }

        // --- MODO ENTREVISTA (status: 'active') ---
        await message.channel.sendTyping();

        // 1. Guardar query de usuario
        await supabase.from('messages').insert({ session_id: session.id, role: 'user', content: message.content });

        // 2. Traer historial
        const { data: messages } = await supabase.from('messages').select('role, content').eq('session_id', session.id).order('created_at', { ascending: true });
        
        const groqMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map(m => ({ role: m.role, content: m.content }))
        ];

        if (!groq) {
            return message.reply("Error interno: Cliente Groq no configurado.");
        }

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: groqMessages,
            max_tokens: 1024,
            temperature: 0.5
        });

        let aiReply = completion.choices[0]?.message?.content || "Hubo un error evaluando, intenta de nuevo.";
        let isFinished = false;

        if (aiReply.includes('ENTREVISTA_FINALIZADA')) {
            isFinished = true;
            aiReply = aiReply.replace('ENTREVISTA_FINALIZADA', '').trim();
        }

        // 3. Guardar respuesta asistente
        if (aiReply) {
            await supabase.from('messages').insert({ session_id: session.id, role: 'assistant', content: aiReply });
            
            // Fragmentar si excede limite de discord
            if (aiReply.length > 2000) {
                const chunks = aiReply.match(/.{1,1900}/gs) || [aiReply];
                for (const chunk of chunks) await message.reply(chunk);
            } else {
                await message.reply(aiReply);
            }
        }

        // 4. Calcular score si terminó
        if (isFinished) {
            await message.channel.sendTyping();
            
            const scoreCompletion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: SCORING_PROMPT },
                    ...messages.map(m => ({ role: m.role, content: m.content }))
                ],
                max_tokens: 10,
                temperature: 0.1
            });

            const rawScoreReply = scoreCompletion.choices[0]?.message?.content || "";
            let scoreMatch = rawScoreReply.match(/\d+/);
            let score = scoreMatch ? parseInt(scoreMatch[0]) : 50;

            let categoryText = '';
            if (score >= 70) {
                categoryText = "**Categoría A (Excelente)**: Calificas para conexión directa con protocolos como Moola, Aave o Credit Collective.";
            } else if (score >= 40) {
                categoryText = "**Categoría B (Intermedio)**: Tienes buen potencial. Te generaremos 3 recomendaciones financieras personalizadas.";
            } else {
                categoryText = "**Categoría C (Mejorable)**: Te brindaremos un plan de mejora financiera estructurado a 30, 60 y 90 días.";
            }

            await supabase.from('sessions').update({ score, status: 'awaiting_decision' }).eq('id', session.id);
            await message.reply(`\n📊 **Tu Score Financiero estimado es: ${score}/100**\n\n${categoryText}\n\n¿Te gustaría publicar este resultado en nuestra plataforma Web3 para ofertas? (Responde "Sí" o "No")`);
        }
    } catch (e) {
        console.error("Error en flujo de mensaje:", e);
    }
});

client.on('error', (e) => console.error('Discord error:', e.message));
process.on('unhandledRejection', (e) => console.error('Unhandled:', e.message));

client.login(DISCORD_TOKEN).catch(e => {
    console.error("❌ Falló inicio de sesión en Discord. Revisa el token en .env");
});
