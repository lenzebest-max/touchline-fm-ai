const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.TFM_API_KEY;
if (!API_KEY || API_KEY.length < 24) {
  console.error('Set TFM_API_KEY to a private random string of at least 24 characters.');
  process.exit(1);
}
const root = __dirname;
let latestState = { started: false, message: 'Open Touchline FM in the browser and connect the API in Settings.' };
const queue = [];
const results = new Map();
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.yaml': 'text/yaml; charset=utf-8' };
function send(res, status, data) { const body = typeof data === 'string' ? data : JSON.stringify(data); res.writeHead(status, { 'Content-Type': typeof data === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }); res.end(body); }
function authorized(req) { const h = req.headers.authorization || ''; const got = h.startsWith('Bearer ') ? h.slice(7) : ''; const a = Buffer.from(got), b = Buffer.from(API_KEY); return a.length === b.length && crypto.timingSafeEqual(a, b); }
async function body(req) { let s = ''; for await (const c of req) { s += c; if (s.length > 1_000_000) throw new Error('Request body too large'); } return s ? JSON.parse(s) : {}; }
const allowed = new Set(['play_week', 'advance_weeks', 'set_tactics', 'hire_scout', 'sign_player', 'search_players']);
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    if (!authorized(req)) return send(res, 401, { error: 'Unauthorized. Use Bearer TFM_API_KEY.' });
    try {
      if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, latestState);
      if (req.method === 'POST' && url.pathname === '/api/state') { latestState = await body(req); latestState.updatedAt = new Date().toISOString(); return send(res, 200, { ok: true }); }
      if (req.method === 'POST' && url.pathname === '/api/action') {
        const input = await body(req); if (!input || !input.action || !allowed.has(input.action.type)) return send(res, 400, { error: 'Unsupported action type.' });
        if (queue.length >= 100) return send(res, 429, { error: 'Action queue is full.' });
        const command = { id: crypto.randomUUID(), action: input.action, createdAt: new Date().toISOString() }; queue.push(command);
        return send(res, 202, { accepted: true, id: command.id, status: 'queued', poll: `/api/result/${command.id}` });
      }
      if (req.method === 'GET' && url.pathname === '/api/poll') return send(res, 200, { command: queue.shift() || null });
      const match = url.pathname.match(/^\/api\/result\/([0-9a-f-]+)$/i);
      if (match && req.method === 'POST') { const result = await body(req); results.set(match[1], { ...result, completedAt: new Date().toISOString() }); return send(res, 200, { ok: true }); }
      if (match && req.method === 'GET') return send(res, results.has(match[1]) ? 200 : 202, results.get(match[1]) || { status: 'pending', id: match[1] });
      return send(res, 404, { error: 'API route not found' });
    } catch (e) { return send(res, 400, { error: e.message || 'Bad request' }); }
  }
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.resolve(root, '.' + requested);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'Not found');
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(file).pipe(res);
});
server.listen(PORT, () => console.log(`Touchline FM AI API listening on port ${PORT}`));
