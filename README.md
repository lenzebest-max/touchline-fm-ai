# Touchline FM — AI Chat API

This adds a small HTTP API so an AI chat with Actions/API support can inspect and control the live Touchline FM save. The browser game must remain open while commands execute.

## What the AI can do
- Read your current club, balance, league, players, fixtures and scout reports (`GET /api/state`).
- Play one week or advance up to 10 weeks.
- Set formation and balanced/attack/defend tactic.
- Search players by name, overall and age.
- Hire scouts.
- Sign a player, subject to club attraction, transfer budget and wage budget rules.

## Run locally
1. Install Node.js 18+.
2. Copy `.env.example` to `.env` and replace `TFM_API_KEY` with a long private random secret.
3. In a terminal, set the environment variable and run `node server.js`.
   - Windows PowerShell: `$env:TFM_API_KEY='your-long-secret'; node server.js`
   - macOS/Linux: `TFM_API_KEY='your-long-secret' node server.js`
4. Open `http://localhost:3000`, load your game/save, go to **Settings → AI Chat API**, paste the same key and click **Connect AI API**.
5. For use from an external chat, deploy this folder to a Node.js host with persistent HTTP support, set `TFM_API_KEY` in the host's environment, and use its public HTTPS URL in `openapi.yaml`. Do not expose the key in public messages.
6. Add `openapi.yaml` as an Action/API schema to a chat agent that supports custom API Actions. Set its authentication to **API Key → Bearer** using the same secret.

## Example action request
`POST /api/action` with JSON body:
```json
{"action":{"type":"set_tactics","formation":"4-3-3","tactic":"attack"}}
```
The API responds with a command id. Poll `GET /api/result/{id}` until the result is complete. The browser receives queued commands approximately every 1.5 seconds.

## Important limitations
- This is a companion API, not a public hosted service. You must deploy it to a public HTTPS host before an external chat can reach it.
- The game must be open in a browser and connected; it is not a headless simulator.
- Commands are restricted to the documented action types. Keep the API key private and use a private deployment.
