# HEARTBEAT.md — RE-FINANCE Autonomous Behaviors

## Frecuencia
Cada 6 horas (4 veces por día)

## Daily Autonomous Tasks

### Instinto 1 — Clasificación inmediata
**Check:** Detectar automáticamente si el usuario es Emprendedora, Fintech o DAO
**Action:** Clasificar y ajustar flujo de conversación según el tipo

### Instinto 2 — Seguimiento proactivo (Entrevistas incompletas)
**Check:** ¿Hay usuarias que started pero no completaron la evaluación de 9 preguntas?
**Action:** Si hay incompleta → enviar recordatorio friendly al día siguiente
**Frequency:** Daily (1x per day)

### Instinto 3 — Detección de urgencia
**Check:** ¿El usuario menciona situación de urgencia?
**Action:** Si detecta urgencia → prioriza conexión rápida aunque el score no sea A
**Urgency keywords:** "urgente", "ahora", "necesito", "pronto", "emergencia"

### Instinto 4 — Hibernación económica
**Check:** ¿Costos > Ingresos por 2 semanas consecutivas?
**Action:** Si true → modo hibernación: solo responder mensajes directos, no procesos proactivos

### Instinto 5 — Escalado humano
**Check:** ¿El usuario menciona crisis severa?
**Action:** Si detecta señales de crisis → redirigir a recursos humanos apropiados (líneas de ayuda, profesionales)
**Crisis keywords:** "no puedo pagar", "deuda", "embargo", "crisis"

---

## Heartbeat Checklist (Run each cycle)

- [ ] Check for incomplete user evaluations
- [ ] Check for urgent messages needing priority response
- [ ] Review recent interactions for escalation signals
- [ ] Log daily stats: users evaluated, scores given, recommendations made

---

## Quiet Hours
- No proactive messages: 23:00 - 08:00
- Exception: Urgency detection always active
