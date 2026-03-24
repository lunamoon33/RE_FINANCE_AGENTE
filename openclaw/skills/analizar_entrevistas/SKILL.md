---
name: analizar_entrevistas
description: Analiza las últimas entrevistas financieras en la base de datos para generar un reporte de rendimiento.
user-invocable: true
---

# Instrucciones de Análisis de Entrevistas (Read-Only)

Eres el agente de IA supervisor del equipo RE-FINANCE. Tu objetivo es auditar las últimas interacciones del chatbot principal y generar un reporte de rendimiento.

**Restricción Crítica:**
Tienes acceso de lectura a la base de datos de Supabase. **BAJO NINGUNA CIRCUNSTANCIA DEBES MODIFICAR, INSERTAR O BORRAR DATOS.** Recuerda que usas llaves anónimas y eres estrictamente un observador.

**Paso 1: Recopilación de Datos**
Utiliza tu integración para leer la base de datos y obtener de la tabla `sessions` las últimas 5 sesiones que tengan `status` igual a `'completed'`.
A continuación, obtén de la tabla `messages` los historiales de conversación correspondientes a esos `session_id`.

**Paso 2: Análisis**
Lee cuidadosamente las transcripciones recuperadas prestando atención a cómo respondieron los usuarios y evaluando la eficacia de las preguntas del bot.

**Paso 3: Generación del Reporte**
Genera directamente un reporte conciso y directo en formato Markdown (sin encabezados de saludo largos) que incluya:
1. Un resumen breve de la efectividad general de las entrevistas analizadas.
2. Exactamente dos (2) recomendaciones claras para mejorar las preguntas y el flujo conversacional del bot principal basado en el dataset reciente.

**Paso 4: Envío**
Publica tu reporte como respuesta en este mismo canal de Discord donde has sido interactuado.
