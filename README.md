# NextRally

Badminton queueing, courts, scores and session payment. Next.js (App Router) + React + Tailwind CSS.

## Run on localhost

You need Node.js 18.18 or newer.

```bash
cd nextrally-app
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:3000 and sign in with the password from `.env.local` (default `badminton`).
The email field is decorative — only the password is checked.

## Where to host it

Any of these work. Pick one:

| Host                                                | Why                                              | Steps                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **Vercel** (recommended)                            | Made by the Next.js team, free tier, zero config | Push the folder to a GitHub repo → vercel.com → New Project → import repo → add env var `ADMIN_PASSWORD` → Deploy |
| **Netlify**                                         | Free tier, similar flow                          | New site from Git → it detects Next.js → add env var `ADMIN_PASSWORD`                                             |
| **Cloudflare Pages**                                | Free, fast globally                              | Connect repo → framework preset "Next.js" → add env var                                                           |
| **Your own VPS** (Hostinger, DigitalOcean, Contabo) | Full control, ~$5/mo                             | `npm run build` then `npm start` behind nginx, keep alive with `pm2`                                              |

On every host, set the environment variable `ADMIN_PASSWORD` to your real password. Never commit `.env.local`.

## What's built

- **Login** — one admin password, stored server-side in an env var, session in an httpOnly cookie. Players never log in.
- **Live board** — courts with 4 slots (doubles), a running timer, score entry per side, and three queue rules you can switch mid-session:
  - _First in, first out_ — next four in line, seats 1 & 2 vs 3 & 4
  - _Level-balanced_ — fills from the deepest single level; otherwise takes the four closest levels and splits them evenly across the net
  - _Manual_ — drag names from the waiting list onto any slot; tap a filled slot to send that player back
- **Players** — add with level (Low / Mid / High), division (Men / Women) and type (Member / Guest); check people in and out.
- **Courts** — add or remove courts, adjust the hourly rate.
- **Stats** — games, wins, losses, win rate, most-played-with partner, amount owed.
- **Payment** — `(courts × hours × rate) + (shuttles × price)`, minus guest fees collected per game, split across checked-in members only, plus a per-member **clan fund** add-on (default ₱20). Guests pay per game and stay out of both the split and the fund. Each person has a **Mark paid** button with a running "collected of expected" total, and closing the session warns you about anyone who hasn't paid.
- **History** — this session's finished games, plus an archive of every closed session with its own games and payment total.
- **Sessions** — stats and payment are per session. When the night ends (or when you open the app on a new day and the previous session still has games), NextRally prompts you to close it out: the session is filed with its games and money, tonight's record folds into each player's lifetime totals, and the board starts clean. The Stats screen toggles between _Tonight_ and _All time_.

## Data storage

Everything (players, courts, queue, scores, this session's history and the archive of closed sessions)
lives in the browser's `localStorage` under the key `nextrally.session.v2`. It survives refreshes and
signing out — signing out only clears the admin cookie, never the data. Clearing browser data, or using
a different device or browser, is what loses it.

Two counters per player: **session** (games / wins / losses, reset when you close the session) and
**lifetime** (the sum of every closed session). Payment only ever counts the current session.

**When you want multiple devices to see the same board**, swap that for a database. The smallest path:

1. Add [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) or [Supabase](https://supabase.com) (both have free tiers).
2. Tables: `players`, `courts`, `games`, `sessions`.
3. Replace the `localStorage` read/write in `components/NextRally.jsx` (the two `useEffect` blocks near the top) with `fetch` calls to new route handlers under `app/api/`.
4. For a live shared board, poll every few seconds or use Supabase Realtime.

## Next vs Node — why Next

One deployable app holds the React UI, the API routes and the auth cookie, so there's no separate
Express server to run or keep in sync. Reach for a standalone Node/Express service only if you later
want persistent websockets pushing the board to many screens at once — and even then Next stays the
frontend.

## Files

```
app/
  layout.jsx           fonts, metadata, global CSS
  page.jsx             checks the admin cookie, renders login or the app
  globals.css          Tailwind entry + base styles
  api/login/route.js   POST password -> sets httpOnly cookie
  api/logout/route.js  POST -> clears cookie
components/
  LoginForm.jsx        admin sign-in screen
  NextRally.jsx        the whole app (six screens)
tailwind.config.js     the colour palette and fonts
.env.example           copy to .env.local and set ADMIN_PASSWORD
```
