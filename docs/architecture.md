# Architecture - RE-FINANCE Agent

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DISCORD PLATFORM                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│
│  │   DM        │  │   MENTION   │  │   GUILD CHANNELS        ││
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘│
└─────────┼────────────────┼─────────────────────┼───────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RE-FINANCE BOT (Node.js)                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Discord.js Client                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │ MessageCreate│  │  Events    │  │  Error Handler │  │   │
│  │  └──────┬──────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────┼───────────────────────────────────────────────┘   │
│            │                                                      │
│            ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Application Layer                     │   │
│  │  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐  │   │
│  │  │ Session Mgmt │  │ Memory Store│  │ Response Router│  │   │
│  │  └──────────────┘  └─────────────┘  └────────────────┘  │   │
│  └───────────────────────────┬──────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    AI Layer (Groq SDK)                   │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │              LLaMA 3.3-70b-versatile               │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
            │                                    │
            ▼                                    ▼
┌──────────────────────┐            ┌──────────────────────────────┐
│    GROQ API          │            │      EXTERNAL SERVICES       │
│  ┌────────────────┐   │            │  ┌────────┐  ┌────────────┐  │
│  │ LLM Inference │   │            │  │ Moola  │  │ Aave       │  │
│  └────────────────┘   │            │  ├────────┤  ├────────────┤  │
└──────────────────────┘            │  │ Credit │  │ DAO        │  │
                                    │  │Collect.│  │ Governance │  │
                                    │  └────────┘  └────────────┘  │
                                    └──────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-------------|---------|
| Runtime | Node.js 18+ | JavaScript runtime |
| Framework | Discord.js | Discord bot framework |
| AI | Groq SDK + LLaMA 3.3-70b | LLM inference |
| Storage | JSON File (memory.json) | Persistent session data |
| Deployment | Docker + Render.com | Container orchestration |
| Platform | Discord | User interface |

## Component Architecture

### 1. Discord Bot (`index.mjs`)

```
┌─────────────────────────────────────────────────────────────┐
│                    Discord Bot Core                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Client Init  │───▶│ Event Router │───▶│ Message      │  │
│  │              │    │              │    │ Processor    │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
│                                                  │           │
│                                                  ▼           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Response   │◀───│    AI Core   │◀───│  Session     │  │
│  │   Formatter  │    │   (Groq)     │    │  Manager     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Session Management

```
┌─────────────────────────────────────────────────────────────┐
│                   Session Flow                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User ──▶ DM/Mention ──▶ Check Session ──▶ Get History     │
│                           │                    │            │
│                           ▼                    ▼            │
│                     [New User]          [Existing User]     │
│                           │                    │            │
│                           ▼                    ▼            │
│                     Init Session ──▶ Append to History      │
│                           │                    │            │
│                           └────────┬───────────┘            │
│                                    │                        │
│                                    ▼                        │
│                           Send to Groq API                  │
│                                    │                        │
│                                    ▼                        │
│                           Store Response                    │
│                                    │                        │
│                                    ▼                        │
│                           Send to Discord                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Memory Persistence

```
┌─────────────────────────────────────────────────────────────┐
│                   Memory Architecture                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Load       │───▶│   Process   │───▶│   Save      │     │
│  │  memory.json│    │   + Update  │    │   memory.json│    │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                              │
│  Data Structure:                                            │
│  {                                                          │
│    "user_id_1": {                                           │
│      "lastInteraction": "2026-03-16T...",                  │
│      "score": 75,                                          │
│      "category": "A"                                       │
│    }                                                        │
│  }                                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Data Flow Diagram                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DISCORD USER                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────┐                                           │
│  │  Message Event  │                                           │
│  └────────┬────────┘                                           │
│           │                                                    │
│           ▼                                                    │
│  ┌─────────────────┐                                           │
│  │  Validate       │──── If not DM or mention ──▶ IGNORE       │
│  │  (isDM || mention)                                        │
│  └────────┬────────┘                                           │
│           │                                                    │
│           ▼                                                    │
│  ┌─────────────────┐                                           │
│  │  Extract Content│                                           │
│  └────────┬────────┘                                           │
│           │                                                    │
│           ▼                                                    │
│  ┌─────────────────┐                                           │
│  │  Get/Create     │                                           │
│  │  Session        │                                           │
│  └────────┬────────┘                                           │
│           │                                                    │
│           ▼                                                    │
│  ┌─────────────────┐                                           │
│  │  Build Prompt   │──── SYSTEM (SOUL) + History              │
│  │  (Groq)         │                                           │
│  └────────┬────────┘                                           │
│           │                                                    │
│           ▼                                                    │
│  ┌─────────────────┐                                           │
│  │  Call Groq API │──── If error ──▶ Fallback Response       │
│  │  (LLaMA 3.3)    │                                           │
│  └────────┬────────┘                                           │
│           │                                                    │
│           ▼                                                    │
│  ┌─────────────────┐                                           │
│  │  Parse Response │                                           │
│  │  (Extract A/B/C)│                                           │
│  └────────┬────────┘                                           │
│           │                                                    │
│           ▼                                                    │
│  ┌─────────────────┐                                           │
│  │  Update Memory  │──── If category detected                │
│  │  (if needed)    │                                           │
│  └────────┬────────┘                                           │
│           │                                                    │
│           ▼                                                    │
│  ┌─────────────────┐                                           │
│  │  Send Response  │──── Chunk if > 2000 chars               │
│  │  to Discord     │                                           │
│  └─────────────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Bot token from Discord Developer Portal |
| `GROQ_API_KEY` | Yes | API key from groq.com |
| `MODEL` | No | LLM model (default: llama-3.3-70b-versatile) |

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Production Deployment                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐                                               │
│   │   Discord   │                                               │
│   │   Platform  │                                               │
│   └──────┬──────┘                                               │
│          │                                                      │
│          │ HTTPS                                                │
│          ▼                                                      │
│   ┌─────────────┐      ┌─────────────────┐                     │
│   │   Render    │─────▶│   Docker        │                     │
│   │   (Cloud)   │      │   Container     │                     │
│   └─────────────┘      └────────┬────────┘                     │
│                                 │                              │
│                                 ▼                              │
│                          ┌─────────────┐                       │
│                          │   Node.js   │                       │
│                          │   Runtime   │                       │
│                          └──────┬──────┘                       │
│                                 │                              │
│          ┌──────────────────────┼──────────────────────┐       │
│          │                      │                      │       │
│          ▼                      ▼                      ▼       │
│   ┌─────────────┐       ┌─────────────┐       ┌─────────────┐  │
│   │   Groq API  │       │  Discord    │       │  Memory     │  │
│   │  (External) │       │  Gateway    │       │  (JSON)     │  │
│   └─────────────┘       └─────────────┘       └─────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Security

- **Token Storage**: Environment variables (no hardcoded tokens)
- **Rate Limiting**: Controlled via Groq API quotas
- **Error Handling**: No sensitive data in logs
- **Input Sanitization**: Discord message content sanitized

## Scalability Considerations

| Aspect | Current | Future |
|--------|---------|--------|
| Users | Single instance | Horizontal scaling |
| Storage | JSON file | Database (PostgreSQL) |
| Cache | In-memory | Redis |
| Queue | Sync | Async (BullMQ) |
