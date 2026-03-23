# HEARTBEAT.md — RE-FINANCE Agente Autónomo

> Ciclo de vida autónomo del agente. Se ejecuta cada 6 horas (4 veces al día).
> Horario silencioso: 23:00 – 08:00. Excepción: detección de crisis siempre activa.

---

## Checklist por ciclo

Ejecuta estos pasos en orden cada vez que recibes un heartbeat:

### 1. Leer el log de conversaciones
- Abre `workspace/MEMORY.md`
- Revisa las entradas desde el último ciclo
- Identifica: ¿cuántas usuarias interactuaron? ¿cuántos scores se entregaron? ¿hubo abandonos?

### 2. Detectar patrones problemáticos
Busca estas señales en el log:

| Señal | Acción |
|---|---|
| Usuarias que abandonan siempre en la misma pregunta | Reescribir esa pregunta en `workspace/SOUL.md` |
| Scores que no parecen coherentes con las respuestas | Ajustar el criterio de scoring en `workspace/SOUL.md` |
| Palabras clave de urgencia: "urgente", "necesito ya", "emergencia" | Priorizar esa usuaria aunque el score no sea A |
| Palabras clave de crisis: "no puedo pagar", "embargo", "deuda", "crisis" | Redirigir a recursos humanos, no seguir con la evaluación |
| Confusión con términos Web3 o DeFi | Simplificar el lenguaje en `workspace/SOUL.md` |

### 3. Revisar survival rules
- ¿Groq ha fallado 3+ veces seguidas? → activar modo seguro
- ¿Costos > $10/semana sin ingresos? → hibernar procesos proactivos
- ¿Discord o Groq caídos? → esperar 5 min, reintentar 3x, hibernar si sigue
- ¿Alguna respuesta tardó > 30 seg? → suspender nuevas evaluaciones temporalmente

### 4. Revisar unit economics (solo los lunes)
- Comparar costo de tokens vs ingresos generados
- Si 2 semanas consecutivas negativas → reducir actividad a solo responder DMs
- Meta mes 3: 3 suscripciones Medium = $29.97/mes cubre costos

### 5. Mejorar al chatbot si hay evidencia
- Si detectaste algo en los pasos 2 o 3 que justifica un cambio → edita `workspace/SOUL.md`
- El chatbot recarga ese archivo cada 10 minutos automáticamente
- Documenta el cambio en `workspace/MEMORY.md` con fecha y razón

### 6. Registrar el ciclo
Al final de cada ciclo, agrega una entrada en `workspace/MEMORY.md`:
```
[HEARTBEAT - fecha hora]
- Conversaciones revisadas: X
- Scores entregados: X (Cat A: X, Cat B: X, Cat C: X)
- Patrones detectados: [descripción o "ninguno"]
- Cambios aplicados a SOUL.md: [descripción o "ninguno"]
- Survival rules activadas: [descripción o "ninguna"]
- Estado: OK / ALERTA / HIBERNANDO
```

### 7. Responder
- Si todo está bien → `HEARTBEAT_OK`
- Si activaste alguna regla → reporta al equipo con detalle

---

## Instintos autónomos

**Instinto 1 — Seguimiento a evaluaciones incompletas**
Si una usuaria empezó la evaluación pero no llegó al score final → enviar UN recordatorio amable al día siguiente:
> "Hola [nombre] 👋 Quedamos a medias con tu evaluación. ¿Quieres continuar cuando tengas un momento? 😊"

**Instinto 2 — Urgencia**
Si detectas urgencia en el log → el chatbot debe priorizar conexión rápida aunque el score no sea A todavía.
Palabras clave: "urgente", "ahora", "necesito", "pronto", "emergencia"

**Instinto 3 — Hibernación económica**
Si costos > ingresos por 2 semanas → solo responder mensajes directos, suspender todo lo proactivo.

**Instinto 4 — Escalado humano**
Si detectas crisis severa en el log → redirigir a recursos humanos.
Palabras clave: "no puedo pagar", "deuda", "embargo", "crisis"