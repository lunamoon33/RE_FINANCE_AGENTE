import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import { Client, GatewayIntentBits, REST, Routes, Events } from 'discord.js';
import Groq from 'groq-sdk';
import { ethers } from 'ethers';
import express from 'express';
import { supabase } from './db.mjs';

const app = express();
app.use(express.json()); // Permitir que reciba JSONs en los endpoints

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

let SYSTEM_PROMPT = `Eres un asesor financiero experto de RE-FINANCE.
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
            const walletInput = message.content.trim();
            
            // Buscar si dentro del texto del usuario hay algo que parezca una dirección de Billetera
            const addressMatch = walletInput.match(/0x[a-fA-F0-9]{40}/);
            const wallet = addressMatch ? addressMatch[0] : null;

            if (!wallet || !ethers.isAddress(wallet)) {
                await message.reply("👀 No detecté una dirección Web3 válida en tu mensaje. Por favor envía tu wallet completa (empezando con `0x`...).");
                return;
            }

            await supabase.from('users').update({ wallet }).eq('id', session.user_id);
            
            await message.reply("⏳ Enviando transacción a la Rollux Testnet... (esto tomará unos segundos)");

            try {
                // Limpiar posibles comillas atrapadas en el .env
                const rpcUrl = process.env.ROLLUX_RPC_URL || 'https://rpc.tanenbaum.io';
                const adminPk = (process.env.ADMIN_PRIVATE_KEY || '').replace(/['"]/g, '').trim();
                const contractAddress = (process.env.CONTRACT_ADDRESS || '').replace(/['"]/g, '').trim();

                // Configurar Ethers Provider & Signer
                const provider = new ethers.JsonRpcProvider(rpcUrl);
                const adminWallet = new ethers.Wallet(adminPk, provider);

                // IMPORTANTE: Este ABI es un ejemplo. Si tienes un contrato real, debes cambiar esto.
                const abi = ["function publishScore(address userWallet, uint8 score) public"];
                const contract = new ethers.Contract(contractAddress, abi, adminWallet);

                await message.reply("⏳ `[Diagnóstico 1/3]` Obteniendo conexión y preparando la firma de la transacción...");

                // Ejecutando la transacción en la cadena (Agregando gas manual ESTÚPIDAMENTE ALTO para saltarse los bloqueos y forzar a los mineros a priorizarla)
                const tx = await contract.publishScore(wallet, session.score, { 
                    gasLimit: 600000,
                    gasPrice: ethers.parseUnits('100', 'gwei')
                });

                await message.reply(`⏳ \`[Diagnóstico 2/3]\` ¡Transacción empujada a la red exitosamente! (Hash: \`${tx.hash}\`). Esperando que los mineros la confirmen...`);

                await tx.wait(1); // Esperar a que se mine la transacción

                // EXPLORADOR ACTUAL (Tanenbaum NEVM L1)
                const txUrl = `https://explorer.tanenbaum.io/tx/${tx.hash}`;
                
                // MIGRACIÓN: Cuando te pases a zkTanenbaum, borra la línea de arriba y descomenta esta:
                // const txUrl = \`https://explorer-zk.tanenbaum.io/tx/\${tx.hash}\`;
                await supabase.from('sessions').update({ testnet_url: txUrl, status: 'completed' }).eq('id', session.id);
                
                await message.reply(`✅ Tus resultados han sido **publicados oficialmente** en la Blockchain (Rollux Testnet)\n🌍 Hash: ${txUrl}\n🎉 ¡Sesión finalizada exitosamente!`);
            } catch (error) {
                console.error("Error al publicar en blockchain:", error);
                await message.reply(`❌ Hubo un error al intentar publicar en la blockchain. Por favor revisa que tengas un Contrato de pruebas listo y tu Clave Privada configurada.`);
                // No actualizamos status = 'completed' para que el usuario pueda reintentar si lo desea
            }
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

// --- EXPRESS API (Rutas de Administración) ---
app.get('/api/system-prompt', (req, res) => {
    return res.json({ currentPrompt: SYSTEM_PROMPT });
});

app.post('/api/system-prompt', (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "Falta el campo 'prompt' en el cuerpo de tu JSON." });
    }
    
    SYSTEM_PROMPT = prompt; // Re-escribir el Prompt en Memoria RAM
    console.log(`🤖 [API] El Prompt de Sistema del Bot ha sido actualizado manualmente.`);
    
    return res.json({ 
        success: true, 
        message: "¡Prompt actualizado correctamente en vivo!", 
        currentPrompt: SYSTEM_PROMPT 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌍 API REST administrativa corriendo en el portal: http://localhost:${PORT}`);
});
