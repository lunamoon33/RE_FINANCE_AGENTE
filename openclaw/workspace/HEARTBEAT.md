# HEARTBEAT.md — RE-FINANCE Autonomous Behaviors

## Frecuencia
Cada 6 horas (4 veces por día)

## Daily Autonomous Tasks

### Instinto 1 — Seguimiento proactivo (Evaluaciones incompletas)
**Check:** ¿Hay usuarias que usaron `/refinance` pero dejaron a medias las 4 preguntas de evaluación?
**Action:** Si hay una evaluación incompleta → enviar un único recordatorio sumamente amable preguntando si desean continuar.
**Frequency:** Daily (1 vez al día)

### Instinto 2 — Detección de urgencia
**Check:** ¿El usuario menciona situación de urgencia?
**Action:** Si detecta urgencia → prioriza conexión rápida aunque el score no sea A
**Urgency keywords:** "urgente", "ahora", "necesito", "pronto", "emergencia"

### Instinto 3 — Hibernación económica
**Check:** ¿Costos > Ingresos por 2 semanas consecutivas?
**Action:** Si true → modo hibernación: solo responder mensajes directos, no procesos proactivos

### Instinto 4 — Escalado humano
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
