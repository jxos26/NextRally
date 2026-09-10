"use client";

import { useEffect, useRef, useState } from "react";

const LV = {
  Low: { short: "LOW", bg: "#1E2A33", fg: "#8FBEDA" },
  Mid: { short: "MID", bg: "#2A2A1E", fg: "#D9CE84" },
  High: { short: "HIGH", bg: "#2A1E28", fg: "#E29CC4" }
};
const ORDER = ["Low", "Mid", "High"];

const SEED = [
  ["Rico Alvarez", "High", 0, "Men"], ["Mika Tan", "High", 0, "Women"],
  ["Josh Delos Reyes", "Mid", 0, "Men"], ["Anna Bautista", "Mid", 0, "Women"],
  ["Paolo Cruz", "Low", 0, "Men"], ["Leah Santos", "Mid", 0, "Women"],
  ["Denver Yu", "High", 0, "Men"], ["Carla Mendoza", "Low", 0, "Women"],
  ["Bryan Lim", "Mid", 0, "Men"], ["Trisha Ong", "High", 0, "Women"],
  ["Kevin Ramos", "Low", 0, "Men"], ["Faye Navarro", "Mid", 1, "Women"],
  ["Marco Villar", "High", 1, "Men"], ["Ivy Reyes", "Low", 0, "Women"]
];

const newPlayers = () =>
  SEED.map((s, i) => ({
    id: "p" + i, name: s[0], level: s[1], guest: s[2] === 1, gender: s[3],
    life: { games: 0, wins: 0, losses: 0 },
    games: 0, wins: 0, losses: 0, partners: {}, active: true
  }));

const dayKey = (d) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const dayLabel = (key) =>
  new Date(key + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const newCourts = () =>
  [["Court 1", 350], ["Court 2", 350], ["Court 3", 400], ["Court 4", 400]].map((c, i) => ({
    id: "c" + (i + 1), name: c[0], rate: c[1],
    slots: [null, null, null, null], startedAt: null, games: 0, scoreA: "", scoreB: ""
  }));

const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const peso = (n) => "\u20B1" + Math.round(n).toLocaleString("en-PH");
const chip = (lv) => LV[lv] || LV.Mid;
const STORE = "nextrally.session.v2";

const NAV = [
  ["live", "Live board"], ["players", "Players"], ["courts", "Courts"],
  ["stats", "Stats"], ["payment", "Payment"], ["history", "History"]
];
const MODES = [
  ["fifo", "First in, first out"],
  ["balanced", "Level-balanced"],
  ["manual", "Manual"]
];
const MODE_HINT = {
  fifo: "Next four in line go on together, in order. Seats 1 & 2 play 3 & 4.",
  balanced:
    "Fills a court from the deepest single level first; if no level has four waiting, it takes the four closest levels and splits them evenly across the net.",
  manual:
    "Nothing auto-fills. Drag names from the waiting list onto the slots, tap a filled slot to send that player back."
};

export default function NextRally() {
  const [screen, setScreen] = useState("live");
  const [mode, setMode] = useState("fifo");
  const [players, setPlayers] = useState(newPlayers);
  const [courts, setCourts] = useState(newCourts);
  const [queue, setQueue] = useState(() => SEED.map((s, i) => "p" + i));
  const [history, setHistory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionDate, setSessionDate] = useState(() => dayKey(new Date()));
  const [statsView, setStatsView] = useState("tonight");
  const [historyView, setHistoryView] = useState("tonight");
  const [closePrompt, setClosePrompt] = useState(false);
  const [hours, setHours] = useState("3");
  const [shuttles, setShuttles] = useState("8");
  const [shuttlePrice, setShuttlePrice] = useState("160");
  const [guestFee, setGuestFee] = useState("80");
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState("Mid");
  const [newGender, setNewGender] = useState("Men");
  const [newGuest, setNewGuest] = useState(false);
  const [newCourtName, setNewCourtName] = useState("");
  const [newCourtRate, setNewCourtRate] = useState("");
  const [, setTick] = useState(0);

  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.players) setPlayers(d.players.map((p) => (p.life ? p : { ...p, life: { games: 0, wins: 0, losses: 0 } })));
        if (d.courts) setCourts(d.courts);
        if (d.queue) setQueue(d.queue);
        if (d.history) setHistory(d.history);
        if (d.sessions) setSessions(d.sessions);
        if (d.hours) setHours(d.hours);
        if (d.shuttles) setShuttles(d.shuttles);
        if (d.shuttlePrice) setShuttlePrice(d.shuttlePrice);
        if (d.guestFee) setGuestFee(d.guestFee);
        if (d.mode) setMode(d.mode);
        if (d.sessionDate) {
          setSessionDate(d.sessionDate);
          const stale = d.sessionDate !== dayKey(new Date());
          const played = (d.history && d.history.length) || (d.players || []).some((p) => p.games);
          if (stale && played) setClosePrompt(true);
        }
      }
    } catch (e) {
      /* first run */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(
        STORE,
        JSON.stringify({ players, courts, queue, history, sessions, sessionDate, hours, shuttles, shuttlePrice, guestFee, mode })
      );
    } catch (e) {
      /* storage full or blocked */
    }
  }, [players, courts, queue, history, sessions, sessionDate, hours, shuttles, shuttlePrice, guestFee, mode]);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const P = (id) => players.find((p) => p.id === id);

  function pick4() {
    if (queue.length < 4) return null;
    if (mode !== "balanced") return queue.slice(0, 4);
    const byLevel = { Low: [], Mid: [], High: [] };
    queue.forEach((id) => { const p = P(id); if (p) byLevel[p.level].push(id); });
    for (const lv of ORDER) if (byLevel[lv].length >= 4) return byLevel[lv].slice(0, 4);
    const sorted = queue.slice().sort((a, b) => ORDER.indexOf(P(a).level) - ORDER.indexOf(P(b).level));
    let best = null, bestSpread = 9, bestWait = 1e9;
    for (let i = 0; i + 4 <= sorted.length; i++) {
      const win = sorted.slice(i, i + 4);
      const idxs = win.map((id) => ORDER.indexOf(P(id).level));
      const spread = Math.max(...idxs) - Math.min(...idxs);
      const wait = Math.min(...win.map((id) => queue.indexOf(id)));
      if (spread < bestSpread || (spread === bestSpread && wait < bestWait)) {
        best = win; bestSpread = spread; bestWait = wait;
      }
    }
    return best;
  }

  function fillCourt(courtId) {
    const four = pick4();
    if (!four) return;
    const seat = mode === "balanced" ? [four[0], four[3], four[1], four[2]] : four;
    setQueue(queue.filter((id) => !four.includes(id)));
    setCourts(courts.map((c) => (c.id === courtId ? { ...c, slots: seat.slice() } : c)));
  }

  function place(courtId, slotIdx, playerId) {
    if (!playerId) return;
    let bumped = null;
    const next = courts.map((c) => {
      const slots = c.slots.map((x) => (x === playerId ? null : x));
      if (c.id === courtId && !c.startedAt) {
        let i = slotIdx;
        if (i == null || slots[i]) i = slots.indexOf(null);
        if (i !== -1) { bumped = slots[i]; slots[i] = playerId; }
      }
      return { ...c, slots };
    });
    setCourts(next);
    const q = queue.filter((id) => id !== playerId);
    setQueue(bumped ? q.concat([bumped]) : q);
  }

  function clearSlot(courtId, i) {
    const c = courts.find((x) => x.id === courtId);
    if (!c || c.startedAt || !c.slots[i]) return;
    const id = c.slots[i];
    setQueue(queue.concat([id]));
    setCourts(courts.map((x) => (x.id === courtId ? { ...x, slots: x.slots.map((v, j) => (j === i ? null : v)) } : x)));
  }

  function clearCourt(courtId) {
    const c = courts.find((x) => x.id === courtId);
    if (!c) return;
    setQueue(queue.concat(c.slots.filter(Boolean)));
    setCourts(courts.map((x) => (x.id === courtId ? { ...x, slots: [null, null, null, null], startedAt: null, scoreA: "", scoreB: "" } : x)));
  }

  function startGame(courtId) {
    setCourts(courts.map((c) => (c.id === courtId ? { ...c, startedAt: Date.now(), scoreA: "", scoreB: "" } : c)));
  }

  function setScore(courtId, team, val) {
    const clean = String(val).replace(/[^0-9]/g, "").slice(0, 2);
    setCourts(courts.map((c) => (c.id === courtId ? { ...c, [team === 0 ? "scoreA" : "scoreB"]: clean } : c)));
  }

  function bumpScore(courtId, team, delta) {
    const c = courts.find((x) => x.id === courtId);
    if (!c) return;
    const cur = num(team === 0 ? c.scoreA : c.scoreB);
    setScore(courtId, team, String(Math.max(0, Math.min(99, cur + delta))));
  }

  function endGame(courtId) {
    const c = courts.find((x) => x.id === courtId);
    if (!c || !c.startedAt) return;
    const sA = num(c.scoreA), sB = num(c.scoreB);
    if (sA === sB) return;
    const winTeam = sA > sB ? 0 : 1;
    const A = c.slots.slice(0, 2), B = c.slots.slice(2, 4);
    const winners = winTeam === 0 ? A : B, losers = winTeam === 0 ? B : A;
    const mate = {};
    [A, B].forEach((t) => { if (t[0] && t[1]) { mate[t[0]] = t[1]; mate[t[1]] = t[0]; } });
    const nameOf = (id) => { const p = P(id); return p ? p.name : "\u2014"; };

    setHistory([
      {
        id: "g" + Date.now(), court: c.name,
        teamA: A.map(nameOf).join(" & "), teamB: B.map(nameOf).join(" & "),
        winner: winTeam === 0 ? "Left" : "Right", winTeam,
        score: sA + " \u2013 " + sB,
        duration: Math.max(1, Math.round((Date.now() - c.startedAt) / 60000)) + " min",
        time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      },
      ...history
    ]);
    setPlayers(
      players.map((p) => {
        if (!c.slots.includes(p.id)) return p;
        const partners = { ...p.partners };
        const m = mate[p.id];
        if (m) partners[m] = (partners[m] || 0) + 1;
        return {
          ...p,
          games: p.games + 1,
          wins: p.wins + (winners.includes(p.id) ? 1 : 0),
          losses: p.losses + (losers.includes(p.id) ? 1 : 0),
          partners
        };
      })
    );
    setCourts(courts.map((x) => (x.id === courtId ? { ...x, slots: [null, null, null, null], startedAt: null, games: x.games + 1, scoreA: "", scoreB: "" } : x)));
    setQueue(queue.concat(c.slots.filter(Boolean)));
  }

  function togglePlayer(p) {
    if (p.active) {
      setPlayers(players.map((x) => (x.id === p.id ? { ...x, active: false } : x)));
      setQueue(queue.filter((id) => id !== p.id));
      setCourts(courts.map((c) => ({ ...c, slots: c.slots.map((v) => (v === p.id ? null : v)) })));
    } else {
      setPlayers(players.map((x) => (x.id === p.id ? { ...x, active: true } : x)));
      setQueue(queue.concat([p.id]));
    }
  }

  function addPlayer() {
    const n = newName.trim();
    if (!n) return;
    const id = "p" + Date.now();
    setPlayers(players.concat([{ id, name: n, level: newLevel, gender: newGender, guest: newGuest, games: 0, wins: 0, losses: 0, partners: {}, active: true }]));
    setQueue(queue.concat([id]));
    setNewName("");
  }

  function addCourt() {
    const n = newCourtName.trim() || "Court " + (courts.length + 1);
    setCourts(courts.concat([{ id: "c" + Date.now(), name: n, rate: num(newCourtRate) || 350, slots: [null, null, null, null], startedAt: null, games: 0, scoreA: "", scoreB: "" }]));
    setNewCourtName("");
    setNewCourtRate("");
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.reload();
  }

  const hasPlay = history.length > 0 || players.some((p) => p.games > 0);

  function closeSession() {
    if (!hasPlay) {
      setSessionDate(dayKey(new Date()));
      setClosePrompt(false);
      return;
    }
    const lines = players
      .filter((p) => p.games > 0 || (p.active && !p.guest))
      .map((p) => ({
        name: p.name, type: p.guest ? "Guest" : "Member", games: p.games,
        pays: p.guest ? p.games * fee : perMember
      }));
    setSessions([
      {
        id: "s" + Date.now(), date: sessionDate, label: dayLabel(sessionDate),
        games: history, gameCount: history.length,
        playerCount: players.filter((p) => p.active).length,
        hours, shuttles, courtCost, shuttleCost, guestTotal, total, perMember, lines
      },
      ...sessions
    ]);
    setPlayers(
      players.map((p) => ({
        ...p,
        life: { games: p.life.games + p.games, wins: p.life.wins + p.wins, losses: p.life.losses + p.losses },
        games: 0, wins: 0, losses: 0
      }))
    );
    setCourts(courts.map((c) => ({ ...c, slots: [null, null, null, null], startedAt: null, games: 0, scoreA: "", scoreB: "" })));
    setQueue(players.filter((p) => p.active).map((p) => p.id));
    setHistory([]);
    setSessionDate(dayKey(new Date()));
    setHistoryView("tonight");
    setClosePrompt(false);
  }

  function keepSession() {
    setSessionDate(dayKey(new Date()));
    setClosePrompt(false);
  }

  // ---- money ----
  const hoursN = num(hours);
  const courtCost = courts.reduce((t, c) => t + c.rate * hoursN, 0);
  const shuttleCost = num(shuttles) * num(shuttlePrice);
  const total = courtCost + shuttleCost;
  const fee = num(guestFee);
  const guests = players.filter((p) => p.guest && p.active);
  const guestTotal = guests.reduce((t, p) => t + p.games * fee, 0);
  const members = players.filter((p) => !p.guest && p.active);
  const perMember = members.length ? Math.max(0, total - guestTotal) / members.length : 0;

  const rates = courts.map((c) => c.rate);
  const rateSpan = !rates.length
    ? peso(0)
    : Math.min(...rates) === Math.max(...rates)
      ? peso(rates[0])
      : peso(Math.min(...rates)) + "\u2013" + peso(Math.max(...rates));

  const onCourt = courts.reduce((t, c) => t + c.slots.filter(Boolean).length, 0);

  const TITLES = {
    live: ["Live board", `Courts, timers and who is up next. ${onCourt} on court, ${queue.length} waiting.`],
    players: ["Players", "Levels drive the balanced queue. Check people out when they leave so the split stays right."],
    courts: ["Courts", "Rates here feed the payment calculator."],
    stats: ["Player stats", "Games, record and what each person owes for tonight."],
    payment: ["Payment", "Courts and shuttles split across members; guests pay per game."],
    history: ["Session history", "Every finished game, newest first."]
  };
  const badge = {
    live: queue.length ? String(queue.length) : "",
    players: String(players.filter((p) => p.active).length),
    courts: String(courts.length),
    stats: "",
    payment: peso(perMember),
    history: history.length ? String(history.length) : ""
  };

  const stopDrag = (e) => e.preventDefault();

  const tally = (p) =>
    statsView === "alltime"
      ? { g: (p.life?.games || 0) + p.games, w: (p.life?.wins || 0) + p.wins, l: (p.life?.losses || 0) + p.losses }
      : { g: p.games, w: p.wins, l: p.losses };

  const slotBox = (c, i) => {
    const id = c.slots[i];
    const p = id ? P(id) : null;
    return (
      <div
        key={i}
        onDragOver={stopDrag}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); place(c.id, i, e.dataTransfer.getData("text/plain")); }}
        onClick={() => clearSlot(c.id, i)}
        className="rounded-[10px] px-2.5 py-2.5 border border-dashed min-h-[52px]"
        style={{
          borderColor: p ? "#2C4239" : "#24352E",
          background: p ? "#16241E" : "transparent",
          cursor: p && !c.startedAt ? "pointer" : "default"
        }}
      >
        <div className="text-sm font-semibold truncate" style={{ color: p ? "#F2F7F4" : "#6E8279" }}>
          {p ? p.name : "Empty"}
        </div>
        <div
          className="text-[11px] font-bold uppercase tracking-[1px] mt-0.5"
          style={{ color: p ? chip(p.level).fg : "#7F9389" }}
        >
          {p ? p.level : c.startedAt ? "" : "drop here"}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen grid grid-cols-[200px_minmax(0,1fr)]">
      {/* sidebar */}
      <aside className="bg-panel border-r border-line px-3.5 py-5 flex flex-col gap-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-[30px] h-[30px] rounded-[9px] bg-lime grid place-items-center text-ink font-black text-[15px]">N</div>
          <div className="font-black text-lg tracking-[-0.4px]">NextRally</div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(([id, label]) => {
            const on = screen === id;
            return (
              <button
                key={id}
                onClick={() => setScreen(id)}
                className="flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-[10px] text-sm font-semibold"
                style={{ background: on ? "#C9F24A" : "transparent", color: on ? "#0C1210" : "#9FB3A8" }}
              >
                <span>{label}</span>
                <span className="text-xs font-semibold" style={{ color: on ? "#0C1210" : "#5A6B63" }}>
                  {badge[id]}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="mt-auto p-3 rounded-xl bg-[#131D19] border border-line">
          <div className="text-[11px] tracking-[1.4px] uppercase text-mute">Session</div>
          <div className="text-[15px] font-bold mt-1">{dayLabel(sessionDate)}</div>
          <div className="text-[13px] text-mute mt-0.5">
            {history.length} games &middot; {players.filter((p) => p.active).length} players
          </div>
          <button onClick={() => setClosePrompt(true)} className="mt-3 w-full py-2 border border-[#3F5C1E] rounded-[9px] bg-limedark hover:bg-[#22351A] text-[13px] font-semibold text-lime">
            Close out session
          </button>
          <button onClick={logout} className="mt-1.5 w-full py-2 border border-line3 rounded-[9px] text-[13px] text-soft hover:text-chalk">
            Sign out
          </button>
        </div>
      </aside>

      <main className="px-[26px] pt-7 pb-14 min-w-0">
        <header className="flex flex-wrap gap-4 gap-x-6 items-end justify-between mb-6">
          <div>
            <h1 className="text-[29px] font-bold tracking-[-0.8px] m-0">{TITLES[screen][0]}</h1>
            <div className="mt-1.5 text-sm text-mute max-w-[52ch] text-pretty">{TITLES[screen][1]}</div>
          </div>
          <div className="flex gap-2.5 items-center">
            <div className="text-right">
              <div className="text-[11px] tracking-[1.4px] uppercase text-mute">On court</div>
              <div className="text-xl font-bold tnum">{onCourt}</div>
            </div>
            <div className="w-px h-8 bg-line" />
            <div className="text-right">
              <div className="text-[11px] tracking-[1.4px] uppercase text-mute">Waiting</div>
              <div className="text-xl font-bold tnum text-lime">{queue.length}</div>
            </div>
          </div>
        </header>

        {/* LIVE */}
        {screen === "live" && (
          <div className="grid gap-5 items-start" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2 items-center mb-4">
                <span className="text-xs tracking-[1.4px] uppercase text-mute mr-1">Queue rule</span>
                {MODES.map(([id, label]) => {
                  const on = mode === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setMode(id)}
                      className="px-3.5 py-2 rounded-full border text-[13px] font-semibold"
                      style={{
                        background: on ? "#C9F24A" : "#141F1A",
                        color: on ? "#0C1210" : "#9FB3A8",
                        borderColor: on ? "#C9F24A" : "#24352E"
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[13px] text-mute mb-4 max-w-[70ch]">{MODE_HINT[mode]}</p>

              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(310px,1fr))" }}>
                {courts.map((c) => {
                  const filled = c.slots.filter(Boolean).length;
                  const playing = !!c.startedAt;
                  const sec = playing ? Math.floor((Date.now() - c.startedAt) / 1000) : 0;
                  const status = playing
                    ? Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0")
                    : filled === 4 ? "Ready" : filled ? filled + " / 4" : "Open";
                  const statusColor = playing ? "#C9F24A" : filled === 4 ? "#D9CE84" : filled ? "#9FB3A8" : "#5A6B63";
                  const tied = num(c.scoreA) === num(c.scoreB);
                  return (
                    <div
                      key={c.id}
                      onDragOver={stopDrag}
                      onDrop={(e) => { e.preventDefault(); place(c.id, null, e.dataTransfer.getData("text/plain")); }}
                      className="rounded-2xl border p-4 min-h-[250px] flex flex-col"
                      style={{ background: playing ? "#122A22" : "#0F1714", borderColor: playing ? "#2F5C49" : "#1C2823" }}
                    >
                      <div className="flex justify-between items-baseline gap-2.5">
                        <div className="text-[17px] font-bold">{c.name}</div>
                        <div className="text-xs font-bold tracking-[1.2px] uppercase tnum" style={{ color: statusColor }}>
                          {status}
                        </div>
                      </div>
                      <div className="text-xs text-mute mt-0.5">
                        {peso(c.rate)} / hour &middot; {c.games} games tonight
                      </div>

                      <div className="mt-3.5 grid gap-1.5 items-stretch" style={{ gridTemplateColumns: "minmax(0,1fr) 22px minmax(0,1fr)" }}>
                        <div className="flex flex-col gap-1.5">{[0, 1].map((i) => slotBox(c, i))}</div>
                        <div className="grid place-items-center text-[11px] font-bold tracking-[1px] text-[#4C5F57]">VS</div>
                        <div className="flex flex-col gap-1.5">{[2, 3].map((i) => slotBox(c, i))}</div>
                      </div>

                      {playing && (
                        <div className="mt-3 grid gap-1.5 items-center" style={{ gridTemplateColumns: "minmax(0,1fr) 22px minmax(0,1fr)" }}>
                          <div className="flex items-stretch gap-1.5">
                            <input
                              value={c.scoreA}
                              onChange={(e) => setScore(c.id, 0, e.target.value)}
                              placeholder="0"
                              inputMode="numeric"
                              className="min-w-0 flex-1 p-2 rounded-[9px] border border-slotline bg-slot text-[22px] font-bold text-center tnum"
                              style={{ color: num(c.scoreA) > num(c.scoreB) ? "#C9F24A" : "#F2F7F4" }}
                            />
                            <button onClick={() => bumpScore(c.id, 0, 1)} className="w-[34px] border border-slotline rounded-[9px] bg-slot text-soft hover:text-lime text-base font-bold">+</button>
                          </div>
                          <div className="grid place-items-center text-[13px] text-[#4C5F57]">&ndash;</div>
                          <div className="flex items-stretch gap-1.5">
                            <input
                              value={c.scoreB}
                              onChange={(e) => setScore(c.id, 1, e.target.value)}
                              placeholder="0"
                              inputMode="numeric"
                              className="min-w-0 flex-1 p-2 rounded-[9px] border border-slotline bg-slot text-[22px] font-bold text-center tnum"
                              style={{ color: num(c.scoreB) > num(c.scoreA) ? "#C9F24A" : "#F2F7F4" }}
                            />
                            <button onClick={() => bumpScore(c.id, 1, 1)} className="w-[34px] border border-slotline rounded-[9px] bg-slot text-soft hover:text-lime text-base font-bold">+</button>
                          </div>
                        </div>
                      )}

                      <div className="mt-auto pt-3.5 flex flex-wrap gap-2">
                        {!playing && filled < 4 && mode !== "manual" && queue.length >= 4 && (
                          <button onClick={() => fillCourt(c.id)} className="flex-1 min-w-[120px] py-2.5 rounded-[10px] bg-[#22332C] hover:bg-[#2C4239] text-[#DCEFD9] text-[13px] font-bold">
                            {mode === "balanced" ? "Fill by level" : "Fill next four"}
                          </button>
                        )}
                        {!playing && filled === 4 && (
                          <button onClick={() => startGame(c.id)} className="flex-1 min-w-[120px] py-2.5 rounded-[10px] bg-lime text-ink text-[13px] font-bold">
                            Start game
                          </button>
                        )}
                        {playing && (
                          <button
                            onClick={() => endGame(c.id)}
                            className="flex-1 min-w-[150px] py-2.5 rounded-[10px] text-[13px] font-bold"
                            style={{
                              background: tied ? "#1A241F" : "#C9F24A",
                              color: tied ? "#9FB3A8" : "#0C1210",
                              cursor: tied ? "default" : "pointer"
                            }}
                          >
                            {tied ? "Enter the final score" : "End game \u00B7 " + (num(c.scoreA) > num(c.scoreB) ? "left" : "right") + " wins"}
                          </button>
                        )}
                        {!playing && filled > 0 && (
                          <button onClick={() => clearCourt(c.id)} className="px-3 py-2.5 border border-line3 rounded-[10px] text-soft text-[13px]">
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border border-line rounded-2xl bg-panel p-4 min-w-0">
              <div className="flex justify-between items-baseline">
                <div className="text-[15px] font-bold">Waiting list</div>
                <div className="text-xs text-mute">{queue.length} players</div>
              </div>
              <p className="text-xs text-dim mt-1 leading-relaxed">Drag a name onto a court slot to place them by hand.</p>
              <div className="mt-3.5 flex flex-col gap-1.5 max-h-[60vh] overflow-auto">
                {queue.map((id, i) => {
                  const p = P(id);
                  if (!p) return null;
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", id)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] bg-panel2 border border-[#1F2E28] cursor-grab"
                    >
                      <div className="w-[22px] text-xs text-dim tnum">{i + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{p.name}</div>
                        <div className="text-[11px] text-mute mt-px">
                          {p.gender} &middot; {p.games} games{p.guest ? " \u00B7 guest" : ""}
                        </div>
                      </div>
                      <div className="text-[10px] font-bold tracking-[0.8px] px-[7px] py-[3px] rounded-md" style={{ background: chip(p.level).bg, color: chip(p.level).fg }}>
                        {chip(p.level).short}
                      </div>
                    </div>
                  );
                })}
              </div>
              {!queue.length && <div className="mt-3 text-[13px] text-dim">Everyone is on court.</div>}
            </div>
          </div>
        )}

        {/* PLAYERS */}
        {screen === "players" && (
          <div className="grid gap-5 items-start" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
            <div className="border border-line rounded-2xl bg-panel overflow-x-auto min-w-0">
              <div className="min-w-[680px]">
                <div className="grid gap-2.5 px-4 py-3 border-b border-line text-[11px] tracking-[1.2px] uppercase text-mute" style={{ gridTemplateColumns: "minmax(140px,2fr) 74px 76px 76px 86px 100px" }}>
                  <div>Player</div><div>Level</div><div>Div</div><div>Type</div><div>Status</div><div />
                </div>
                {players.map((p) => {
                  const onCourtNow = courts.some((c) => c.slots.includes(p.id));
                  return (
                    <div key={p.id} className="grid gap-2.5 px-4 py-3 border-b border-[#16211D] items-center" style={{ gridTemplateColumns: "minmax(140px,2fr) 74px 76px 76px 86px 100px" }}>
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold truncate">{p.name}</div>
                        <div className="text-xs text-mute">{p.games} games &middot; {p.wins}W {p.losses}L</div>
                      </div>
                      <div className="text-[11px] font-bold tracking-[0.8px] px-2 py-1 rounded-md justify-self-start" style={{ background: chip(p.level).bg, color: chip(p.level).fg }}>
                        {chip(p.level).short}
                      </div>
                      <div className="text-[13px] text-soft">{p.gender || "\u2014"}</div>
                      <div className="text-[13px]" style={{ color: p.guest ? "#D9CE84" : "#9FB3A8" }}>{p.guest ? "Guest" : "Member"}</div>
                      <div className="text-[13px]" style={{ color: !p.active ? "#5A6B63" : onCourtNow ? "#C9F24A" : "#9FB3A8" }}>
                        {!p.active ? "Out" : onCourtNow ? "On court" : "Waiting"}
                      </div>
                      <div className="justify-self-end">
                        <button onClick={() => togglePlayer(p)} className="px-2.5 py-1.5 border border-line3 rounded-lg text-soft hover:text-chalk text-xs">
                          {p.active ? "Check out" : "Check in"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border border-line rounded-2xl bg-panel p-4">
              <div className="text-[15px] font-bold">Add player</div>
              <div className="mt-3.5 flex flex-col gap-2.5">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" className="w-full px-3.5 py-3 rounded-[10px] border border-line2 bg-panel2 text-sm" />
                <div className="flex gap-1.5">
                  {ORDER.map((lv) => {
                    const on = newLevel === lv;
                    return (
                      <button key={lv} onClick={() => setNewLevel(lv)} className="flex-1 py-2.5 rounded-[10px] border text-[13px] font-bold"
                        style={{ background: on ? chip(lv).bg : "transparent", color: on ? chip(lv).fg : "#7F9389", borderColor: on ? chip(lv).fg : "#24352E" }}>
                        {lv}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  {["Men", "Women"].map((g) => {
                    const on = newGender === g;
                    return (
                      <button key={g} onClick={() => setNewGender(g)} className="flex-1 py-2.5 rounded-[10px] border text-[13px] font-semibold"
                        style={{ background: on ? "#22332C" : "transparent", color: on ? "#DCEFD9" : "#7F9389", borderColor: on ? "#3E534A" : "#24352E" }}>
                        {g}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  {[["Member", false], ["Guest", true]].map(([label, val]) => {
                    const on = newGuest === val;
                    return (
                      <button key={label} onClick={() => setNewGuest(val)} className="flex-1 py-2.5 rounded-[10px] border text-[13px] font-semibold"
                        style={{ background: on ? "#22332C" : "transparent", color: on ? "#DCEFD9" : "#7F9389", borderColor: on ? "#3E534A" : "#24352E" }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                <button onClick={addPlayer} className="mt-1 py-3 rounded-[10px] bg-lime text-ink text-sm font-bold">Add to waiting list</button>
              </div>
              <p className="mt-4 text-xs text-dim leading-relaxed">
                Guests pay {peso(fee)} per game and are left out of the session split.
              </p>
            </div>
          </div>
        )}

        {/* COURTS */}
        {screen === "courts" && (
          <div className="grid gap-5 items-start" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
            <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))" }}>
              {courts.map((c) => (
                <div key={c.id} className="border border-line rounded-2xl bg-panel p-4">
                  <div className="flex justify-between items-baseline">
                    <div className="text-[17px] font-bold">{c.name}</div>
                    <div className="text-xs font-bold" style={{ color: c.startedAt ? "#C9F24A" : "#7F9389" }}>
                      {c.startedAt ? "In play" : c.slots.filter(Boolean).length ? "Filling" : "Open"}
                    </div>
                  </div>
                  <div className="mt-3.5 flex items-baseline gap-1.5">
                    <div className="text-[26px] font-bold tnum">{peso(c.rate)}</div>
                    <div className="text-[13px] text-mute">/ hour</div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setCourts(courts.map((x) => (x.id === c.id ? { ...x, rate: Math.max(0, x.rate - 50) } : x)))} className="flex-1 py-2 border border-line3 rounded-[9px] text-soft text-sm">&minus;50</button>
                    <button onClick={() => setCourts(courts.map((x) => (x.id === c.id ? { ...x, rate: x.rate + 50 } : x)))} className="flex-1 py-2 border border-line3 rounded-[9px] text-soft text-sm">+50</button>
                  </div>
                  <div className="mt-3 text-xs text-dim">
                    {c.games} games tonight &middot; {peso(c.rate * hoursN)} for {hours}h
                  </div>
                  <button
                    onClick={() => { setCourts(courts.filter((x) => x.id !== c.id)); setQueue(queue.concat(c.slots.filter(Boolean))); }}
                    className="mt-3 w-full py-2 border border-[#3A2A2A] rounded-[9px] hover:bg-[#1F1616] text-[#C98A8A] text-[13px]"
                  >
                    Remove court
                  </button>
                </div>
              ))}
            </div>
            <div className="border border-line rounded-2xl bg-panel p-4">
              <div className="text-[15px] font-bold">Add court</div>
              <div className="mt-3.5 flex flex-col gap-2.5">
                <input value={newCourtName} onChange={(e) => setNewCourtName(e.target.value)} placeholder="Court name" className="w-full px-3.5 py-3 rounded-[10px] border border-line2 bg-panel2 text-sm" />
                <input value={newCourtRate} onChange={(e) => setNewCourtRate(e.target.value)} placeholder="Hourly rate" inputMode="numeric" className="w-full px-3.5 py-3 rounded-[10px] border border-line2 bg-panel2 text-sm" />
                <button onClick={addCourt} className="py-3 rounded-[10px] bg-lime text-ink text-sm font-bold">Add court</button>
              </div>
            </div>
          </div>
        )}

        {/* STATS */}
        {screen === "stats" && (
          <>
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <span className="text-xs tracking-[1.4px] uppercase text-mute mr-1">Showing</span>
            {[["tonight", "Tonight"], ["alltime", "All time"]].map(([id, label]) => {
              const on = statsView === id;
              return (
                <button key={id} onClick={() => setStatsView(id)} className="px-3.5 py-2 rounded-full border text-[13px] font-semibold"
                  style={{ background: on ? "#C9F24A" : "#141F1A", color: on ? "#0C1210" : "#9FB3A8", borderColor: on ? "#C9F24A" : "#24352E" }}>
                  {label}
                </button>
              );
            })}
          </div>
          <div className="border border-line rounded-2xl bg-panel overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid gap-2.5 px-4 py-3 border-b border-line text-[11px] tracking-[1.2px] uppercase text-mute" style={{ gridTemplateColumns: "minmax(0,1.6fr) 70px 60px 60px 90px minmax(0,1.4fr) 100px" }}>
                <div>Player</div><div>Games</div><div>W</div><div>L</div><div>Win rate</div><div>Most played with</div><div className="text-right">{statsView === "alltime" ? "Tonight" : "Owes"}</div>
              </div>
              {players
                .slice()
                .sort((a, b) => {
                  const ta = tally(a), tb = tally(b);
                  return tb.g - ta.g || tb.w - ta.w;
                })
                .map((p) => {
                  const t = tally(p);
                  const rate = t.g ? Math.round((t.w / t.g) * 100) : 0;
                  const keys = Object.keys(p.partners || {});
                  let partner = "\u2014";
                  if (keys.length) {
                    const top = keys.sort((a, b) => p.partners[b] - p.partners[a])[0];
                    const tp = P(top);
                    if (tp) partner = `${tp.name} (\u00D7${p.partners[top]})`;
                  }
                  return (
                    <div key={p.id} className="grid gap-2.5 px-4 py-3 border-b border-[#16211D] items-center" style={{ gridTemplateColumns: "minmax(0,1.6fr) 70px 60px 60px 90px minmax(0,1.4fr) 100px" }}>
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold truncate">{p.name}</div>
                        <div className="text-[11px] font-bold tracking-[0.8px] uppercase mt-0.5" style={{ color: chip(p.level).fg }}>{p.level}</div>
                      </div>
                      <div className="text-[15px] tnum">{t.g}</div>
                      <div className="text-[15px] tnum text-lime">{t.w}</div>
                      <div className="text-[15px] tnum text-soft">{t.l}</div>
                      <div>
                        <div className="text-sm font-bold tnum">{t.g ? rate + "%" : "\u2014"}</div>
                        <div className="h-1 rounded-full bg-line mt-1.5 overflow-hidden">
                          <div className="h-full bg-lime" style={{ width: rate + "%" }} />
                        </div>
                      </div>
                      <div className="text-[13px] text-soft truncate">{partner}</div>
                      <div className="text-right text-[15px] font-bold tnum">
                        {statsView === "alltime"
                          ? p.games ? p.games + " tonight" : "\u2014"
                          : !p.active ? "\u2014" : p.guest ? peso(p.games * fee) : peso(perMember)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          </>
        )}

        {/* PAYMENT */}
        {screen === "payment" && (
          <div className="grid gap-5 items-start" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
            <div className="border border-line rounded-2xl bg-panel p-4">
              <div className="text-[15px] font-bold">Session inputs</div>
              <div className="mt-3.5 flex flex-col gap-3.5">
                {[
                  ["Hours booked", hours, setHours],
                  ["Shuttles used", shuttles, setShuttles],
                  ["Price per shuttle", shuttlePrice, setShuttlePrice],
                  ["Guest fee per game", guestFee, setGuestFee]
                ].map(([label, val, set]) => (
                  <div key={label}>
                    <div className="text-xs text-mute mb-1.5">{label}</div>
                    <input value={val} onChange={(e) => set(e.target.value)} inputMode="decimal" className="w-full px-3.5 py-3 rounded-[10px] border border-line2 bg-panel2 text-[15px] tnum" />
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 flex flex-col gap-4">
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
                {[
                  { label: "Court time", value: peso(courtCost), sub: `${courts.length} courts \u00D7 ${hours}h`, hi: false },
                  { label: "Shuttles", value: peso(shuttleCost), sub: `${shuttles} \u00D7 ${peso(num(shuttlePrice))}`, hi: false },
                  { label: "Guest games", value: "\u2212" + peso(guestTotal), sub: `${guests.length} guests \u00B7 ${peso(fee)} per game`, sand: true },
                  { label: "Each member pays", value: peso(perMember), sub: `${members.length} members splitting`, hi: true }
                ].map((t) => (
                  <div key={t.label} className="rounded-[14px] border p-[15px]" style={{ background: t.hi ? "#1B2A12" : "#0F1714", borderColor: t.hi ? "#3F5C1E" : "#1C2823" }}>
                    <div className="text-[11px] tracking-[1.3px] uppercase" style={{ color: t.hi ? "#B7CE86" : "#7F9389" }}>{t.label}</div>
                    <div className="text-[25px] font-bold mt-2 tnum tracking-[-0.5px]" style={{ color: t.hi ? "#C9F24A" : t.sand ? "#D9CE84" : "#F2F7F4" }}>
                      {t.value}
                    </div>
                    <div className="text-xs mt-1" style={{ color: t.hi ? "#9FB37A" : "#5A6B63" }}>{t.sub}</div>
                  </div>
                ))}
              </div>

              <div className="border border-line rounded-2xl bg-panel p-4">
                <div className="text-[13px] tracking-[1.3px] uppercase text-mute">How the split works</div>
                <div className="mt-2.5 text-[15px] leading-relaxed text-[#DCEFD9] tnum text-pretty">
                  ({courts.length} courts &times; {hours}h at {rateSpan} = {peso(courtCost)}) + ({shuttles} shuttles &times;{" "}
                  {peso(num(shuttlePrice))}) &minus; {peso(guestTotal)} guest fees = {peso(Math.max(0, total - guestTotal))} &divide;{" "}
                  {members.length} members = {peso(perMember)} each
                </div>
                <p className="mt-2 text-[13px] text-mute leading-relaxed text-pretty">
                  Guest games are collected first and taken off the top, so members only split what&rsquo;s left.
                </p>
              </div>

              <div className="border border-line rounded-2xl bg-panel overflow-x-auto">
                <div className="min-w-[480px]">
                  <div className="grid gap-2.5 px-4 py-3 border-b border-line text-[11px] tracking-[1.2px] uppercase text-mute" style={{ gridTemplateColumns: "minmax(140px,1fr) 84px 84px 100px" }}>
                    <div>Who</div><div>Type</div><div>Games</div><div className="text-right">Pays</div>
                  </div>
                  {players.filter((p) => p.active).map((p) => (
                    <div key={p.id} className="grid gap-2.5 px-4 py-3 border-b border-[#16211D] items-center" style={{ gridTemplateColumns: "minmax(140px,1fr) 84px 84px 100px" }}>
                      <div className="text-[15px] font-semibold truncate">{p.name}</div>
                      <div className="text-[13px]" style={{ color: p.guest ? "#D9CE84" : "#9FB3A8" }}>{p.guest ? "Guest" : "Member"}</div>
                      <div className="text-sm tnum text-soft">{p.games}</div>
                      <div className="text-right text-[15px] font-bold tnum">{p.guest ? peso(p.games * fee) : peso(perMember)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {screen === "history" && (
          <>
          <div className="flex flex-wrap gap-2 items-center mb-4">
            {[["tonight", "This session"], ["past", "Past sessions" + (sessions.length ? " (" + sessions.length + ")" : "")]].map(([id, label]) => {
              const on = historyView === id;
              return (
                <button key={id} onClick={() => setHistoryView(id)} className="px-3.5 py-2 rounded-full border text-[13px] font-semibold"
                  style={{ background: on ? "#C9F24A" : "#141F1A", color: on ? "#0C1210" : "#9FB3A8", borderColor: on ? "#C9F24A" : "#24352E" }}>
                  {label}
                </button>
              );
            })}
          </div>
          {historyView === "tonight" && (
          <div className="border border-line rounded-2xl bg-panel overflow-hidden">
            {history.map((h) => (
              <div key={h.id} className="grid gap-3.5 px-4 py-4 border-b border-[#16211D] items-center" style={{ gridTemplateColumns: "96px minmax(0,1fr) 120px" }}>
                <div>
                  <div className="text-sm font-bold tnum">{h.time}</div>
                  <div className="text-xs text-mute">{h.court}</div>
                </div>
                <div className="min-w-0 text-sm leading-relaxed text-pretty">
                  <span className="font-semibold" style={{ color: h.winTeam === 0 ? "#F2F7F4" : "#6E8279" }}>{h.teamA}</span>
                  <span className="font-bold px-1.5 text-[#4C5F57]">vs</span>
                  <span className="font-semibold" style={{ color: h.winTeam === 1 ? "#F2F7F4" : "#6E8279" }}>{h.teamB}</span>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold text-lime">{h.score || h.winner + " won"}</div>
                  <div className="text-xs text-mute tnum">{h.score ? h.winner + " won \u00B7 " : ""}{h.duration}</div>
                </div>
              </div>
            ))}
            {!history.length && (
              <div className="px-4 py-8 text-center text-sm text-dim">
                No games finished yet. End a game on the live board and it lands here.
              </div>
            )}
          </div>
          )}

          {historyView === "past" && (
            <div className="flex flex-col gap-3.5">
              {sessions.map((a) => (
                <div key={a.id} className="border border-line rounded-2xl bg-panel overflow-hidden">
                  <div className="flex flex-wrap gap-3 justify-between items-baseline px-4 py-4 border-b border-line">
                    <div>
                      <div className="text-[17px] font-bold">{a.label}</div>
                      <div className="text-xs text-mute mt-0.5">
                        {a.gameCount} games &middot; {a.playerCount} players &middot; {a.hours}h
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[19px] font-bold tnum text-lime">{peso(a.total)}</div>
                      <div className="text-xs text-mute mt-0.5">{peso(a.perMember)} per member</div>
                    </div>
                  </div>
                  {a.games.map((h) => (
                    <div key={h.id} className="grid gap-3.5 px-4 py-3 border-b border-[#16211D] items-center" style={{ gridTemplateColumns: "96px minmax(0,1fr) 90px" }}>
                      <div>
                        <div className="text-[13px] font-bold tnum">{h.time}</div>
                        <div className="text-xs text-mute">{h.court}</div>
                      </div>
                      <div className="min-w-0 text-sm leading-relaxed text-pretty">
                        <span className="font-semibold" style={{ color: h.winTeam === 0 ? "#F2F7F4" : "#6E8279" }}>{h.teamA}</span>
                        <span className="font-bold px-1.5 text-[#4C5F57]">vs</span>
                        <span className="font-semibold" style={{ color: h.winTeam === 1 ? "#F2F7F4" : "#6E8279" }}>{h.teamB}</span>
                      </div>
                      <div className="text-right text-sm font-bold tnum text-lime">{h.score || h.winner + " won"}</div>
                    </div>
                  ))}
                </div>
              ))}
              {!sessions.length && (
                <div className="border border-line rounded-2xl bg-panel px-4 py-8 text-center text-sm text-dim">
                  No closed sessions yet. Use &ldquo;Close out session&rdquo; when the night ends.
                </div>
              )}
            </div>
          )}
          </>
        )}
      </main>

      {closePrompt && (
        <div className="fixed inset-0 grid place-items-center p-6 z-50" style={{ background: "rgba(6,10,9,0.74)" }}>
          <div className="w-full max-w-[460px] rounded-[18px] border border-[#2F5C49] bg-panel p-[22px]">
            <div className="text-[11px] tracking-[1.5px] uppercase text-lime">Session rollover</div>
            <div className="text-[22px] font-bold mt-2 tracking-[-0.4px] text-pretty">
              {!hasPlay
                ? "Nothing to close yet."
                : sessionDate === dayKey(new Date())
                  ? "Close out " + dayLabel(sessionDate) + "?"
                  : dayLabel(sessionDate) + " is still open."}
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-soft text-pretty">
              {hasPlay ? (
                <>
                  {history.length} games and {peso(total)} on the sheet. Closing files this session under {dayLabel(sessionDate)},
                  folds tonight&rsquo;s record into every player&rsquo;s lifetime totals, and opens a clean board for{" "}
                  {dayLabel(dayKey(new Date()))}. Payment resets to zero.
                </>
              ) : (
                <>
                  No games have finished in this session, so there is nothing to file. Closing just rolls the board over to{" "}
                  {dayLabel(dayKey(new Date()))} &mdash; no session record is written and no payment is recorded.
                </>
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button onClick={closeSession} className="flex-1 min-w-[170px] py-3.5 rounded-[11px] bg-lime text-ink text-sm font-bold">
                {hasPlay ? "Close & start new session" : "Roll over to " + dayLabel(dayKey(new Date()))}
              </button>
              <button onClick={keepSession} className="flex-1 min-w-[130px] py-3.5 rounded-[11px] border border-line3 text-soft text-sm font-semibold">
                Keep this one open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
