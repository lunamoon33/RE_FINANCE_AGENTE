#!/usr/bin/env node
import fs from 'fs/promises';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}
const REST = SUPABASE_URL.replace(/\/?$/, '') + '/rest/v1';
const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

async function fetchJson(path) {
  const res = await fetch(REST + path, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} on ${path}: ${text}`);
  }
  return res.json();
}

try {
  // Get last 5 completed sessions
  const sessions = await fetchJson('/sessions?status=eq.completed&order=created_at.desc&limit=5');
  const sessionIds = sessions.map(s => s.id);
  let messages = [];
  if (sessionIds.length) {
    // Build in() filter: id=in.(a,b,c)
    const inList = sessionIds.map(id => encodeURIComponent(id)).join(',');
    messages = await fetchJson(`/messages?session_id=in.(${inList})&order=created_at.asc&limit=1000`);
  }
  // group messages by session_id
  const bySession = Object.fromEntries(sessionIds.map(id => [id, []]));
  for (const m of messages) {
    if (!bySession[m.session_id]) bySession[m.session_id] = [];
    bySession[m.session_id].push({
      id: m.id,
      role: m.role || m.sender || 'unknown',
      content: m.content || m.text || '',
      created_at: m.created_at
    });
  }
  const out = { fetched_at: new Date().toISOString(), sessions, conversations: bySession };
  const outPath = '/home/node/.openclaw/workspace/tmp/analizar_entrevistas.json';
  await fs.mkdir('/home/node/.openclaw/workspace/tmp', { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(outPath);
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(2);
}
