# Features - RE-FINANCE Agent

## Overview

RE-FINANCE es un agente financiero autónomo que opera en Discord y utiliza IA (Groq + LLaMA) para evaluar el perfil crediticio de emprendedoras y conectarles con alternativas de financiamiento.

## Core Features

### 1. Evaluación Crediticia

**Descripción:** Sistema de scoring alternativo que evalúa a emprendedoras a través de 9 preguntas dinámicas.

**Flujo de Evaluación:**
1. Clasificación inicial del usuario (Emprendedora / Fintech / Explorando)
2. 9 preguntas secuenciales para construir perfil:
   - Tipo de negocio
   - Dinámica de ventas
   - Ingresos semanales
   - Hábitos de ahorro
   - Monto de ahorro mensual
   - Historial de crédito anterior
   - Experiencia con préstamos pasados
   - Nivel de conocimiento financiero
   - Destino del financiamiento
3. Cálculo de score (0-100)
4. Categorización automática (A/B/C)

**Categorías:**
| Categoría | Score | Acción |
|-----------|-------|--------|
| A | 70-100 | Conexión directa con Moola, Aave, Credit Collective |
| B | 40-69 | 3 recomendaciones + seguimiento |
| C | 0-39 | Plan de mejora 30/60/90 días |

### 2. Interacción por Discord

**Canales Soportados:**
- Mensajes Directos (DM)
- Menciones en servidores
- Guild channels (con mención)

**Características:**
- Respuesta a menciones del bot
- Soporte para DM directo
- Typing indicator mientras procesa
- Manejo de respuestas largas (chunking)
- Persistencia de sesiones por usuario

### 3. Sistema de Memoria

**Funcionalidades:**
- Almacenamiento persistente en JSON
- Historial de conversaciones por usuario
- Tracking de última interacción
- Detección de categoría (A/B/C) en respuestas
- Límite de 20 mensajes por sesión (rotación)

**Estructura de Memoria:**
```json
{
  "user_id": {
    "lastInteraction": "2026-03-16T23:00:00Z",
    "score": 75,
    "category": "A"
  }
}
```

### 4. Motor de Recomendaciones

**Basado en Categoría:**

**Categoría A (Score 70-100):**
- Moola (préstamos DeFi)
- Aave (liquidity)
- Credit Collective (micro-préstamos)

**Categoría B (Score 40-69):**
- 3 recomendaciones personalizadas
- Consejos de mejora de score
- Seguimiento automático

**Categoría C (Score 0-39):**
- Plan de mejora 30 días
- Plan de mejora 60 días
- Plan de mejora 90 días
- Recursos educativos

### 5. Manejo de Errores

**Survival Rules implementadas:**

| Regla | Condición | Acción |
|-------|-----------|--------|
| Confianza | 3 errores de Groq seguidos | Modo seguro, respuesta estándar |
| Economía | Costo > $10/semana sin ingresos | Hibernar procesos proactivos |
| Dependencias | Fallo Discord/Groq | Esperar 5min, reintentar 3x, hibernar |
| Ejecución | Respuesta > 30 segundos | Suspender nuevas entrevistas |
| Unit Economics | 2 semanas negativas | Reducir actividad |

**Manejo de Errores:**
- Fallback response cuando Groq falla
- Logging de errores
- Error handling global
- Reintentos automáticos

### 6. Configuración de IA

**Modelo:**
- Provider: Groq
- Modelo: LLaMA 3.3-70b-versatile
- Temperature: 0.7
- Max tokens: 1024

**Prompt System (SOUL):**
- Identidad del agente
- Misión y visión
- Flujo obligatorio de preguntas
- Personalidad (cálida, empática)
- Reglas de interacción

## Features Técnicas

### 1. Gestión de Sesiones

- Mapa en memoria para sesiones activas
- Historial por usuario
- Rotación de mensajes (mantiene últimos 20)
- Persistencia entre reinicios

### 2. Procesamiento de Mensajes

- Detección de menciones al bot
- Identificación de DM vs Guild
- Sanitización de contenido
- Chunking de respuestas largas (>2000 chars)

### 3. Logging

- Timestamp de inicio
- Modelo utilizado
- Errores de Groq
- Errores de Discord
- Unhandled rejections

## APIs y Servicios

### Groq SDK

**Uso:**
- Chat completions
- Modelo: `llama-3.3-70b-versatile`
- Contexto: Historial de sesión + prompt system

### Discord.js

**Intents utilizados:**
- Guilds
- GuildMessages
- MessageContent
- DirectMessages

**Eventos:**
- ClientReady
- MessageCreate

## Configuración

### Variables de Entorno

```bash
DISCORD_TOKEN=your_bot_token
GROQ_API_KEY=your_groq_api_key
MODEL=llama-3.3-70b-versatile  # opcional
```

### Dependencias

```json
{
  "discord.js": "^14.14.1",
  "groq-sdk": "^0.3.3"
}
```

## Roadmap de Features

### Próximas Funciones

- [ ] Panel de seguimiento para usuarios
- [ ] Integración con APIs de Fintechs
- [ ] Notificaciones automáticas
- [ ] Dashboard administrativo
- [ ] Historial de score en el tiempo
- [ ] Plan Medium ($9.99/mes)
- [ ] Plan Premium ($24.99/mes)
- [ ] Integración con protocolos DeFi
- [ ] Sistema de referrals
- [ ] Analytics y métricas

### Features Futuras

- [ ] Múltiples idiomas
- [ ] Integración con WhatsApp
- [ ] Integración con Telegram
- [ ] API pública para Fintechs
- [ ] Dashboard de préstamos
- [ ] Notificaciones de nuevos productos
