# RE-FINANCE AGENTE

Agente Financiero Autónomo para Emprendedoras - Built with OpenClaw

## Descripción

RE-FINANCE es un agente de IA que democratiza el acceso al crédito para emprendedoras informales, microempresarias y mujeres sin historial financiero tradicional, a través de un score crediticio alternativo generado por IA.

## Características

- **Canal:** Discord
- **IA:** Groq SDK
- **Planes:**
  - Básico (gratis): Score crediticio
  - Medium ($9.99/mes): Seguimiento + conexión Fintech
  - Premium ($24.99/mes): Asesoría completa
  - Comisión por match exitoso: 2-5% del crédito otorgado

## Requisitos

- Node.js >= 18.0.0
- nvm (recomendado)
- Discord Bot Token
- Groq API Key

## Instalación

```bash
# Instalar Node.js 22
nvm install 22
nvm use 22

# Instalar dependencias
cd app
npm install
```

## Configuración

1. Crear un bot en Discord Developer Portal
2. Obtener API key de Groq en groq.com
3. Configurar variables de entorno

## Uso

```bash
cd app
npm start
```

## Estructura

```
RE_FINANCE_AGENTE/
├── app/               # Código principal del bot
├── openclaw/          # Configuración del agente OpenClaw
├── workspace/         # Memoria y configuración del agente
├── docker-compose.yml
└── nixpacks.toml
```

## Tech Stack

- Node.js
- Discord.js
- Groq SDK
- OpenClaw

## Licencia

MIT
