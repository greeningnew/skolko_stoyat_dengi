:root {
  --bg: #f4f6fb;
  --card: #ffffff;
  --ink: #0f172a;
  --muted: #8792a8;
  --line: #e4e8f0;
  --dark: #111827;
  --soft: #eef2f7;
  --shadow: 0 18px 44px rgba(15, 23, 42, .08);
  --radius: 28px;
}

* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  background: var(--bg);
  color: var(--ink);
}
button, input { font: inherit; }
button { border: 0; cursor: pointer; }

.app {
  max-width: 520px;
  margin: 0 auto;
  min-height: 100dvh;
  padding: calc(env(safe-area-inset-top) + 18px) 16px 96px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.logo-slot {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 12px;
  border: 1.5px dashed rgba(15, 23, 42, .18);
  background: rgba(255,255,255,.35);
}
h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1;
  letter-spacing: -.04em;
  text-transform: lowercase;
  white-space: nowrap;
}
.icon-button {
  width: 42px;
  height: 42px;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(15,23,42,.06);
  color: var(--ink);
  font-weight: 900;
  font-size: 22px;
}

.tab-page { display: none; }
.tab-page.active { display: block; }

.balance-card {
  border-radius: 30px;
  background: var(--dark);
  color: #fff;
  padding: 22px 20px 18px;
  box-shadow: var(--shadow);
}
.balance-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  color: rgba(255,255,255,.62);
  font-size: 13px;
  text-transform: lowercase;
}
.balance-head small {
  text-align: right;
  max-width: 48%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.balance-card > strong {
  display: block;
  margin: 8px 0 16px;
  font-size: clamp(42px, 13vw, 64px);
  line-height: .95;
  letter-spacing: -.06em;
}
.account-chips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.balance-chip {
  min-width: 0;
  border-radius: 18px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.08);
  padding: 10px;
}
.balance-chip span {
  display: block;
  margin-bottom: 5px;
  color: rgba(255,255,255,.55);
  font-size: 11px;
  text-transform: lowercase;
}
.balance-chip b {
  display: block;
  font-size: 15px;
  letter-spacing: -.03em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-card, .panel-card {
  margin-top: 14px;
  border-radius: var(--radius);
  background: var(--card);
  padding: 18px;
  box-shadow: var(--shadow);
  border: 1px solid rgba(15,23,42,.04);
}
.quick-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
h2, h3 { margin: 0; letter-spacing: -.04em; }
h2 { font-size: 22px; }
h3 { font-size: 18px; }

.stepper {
  display: flex;
  align-items: center;
  gap: 6px;
}
.stepper i {
  width: 20px;
  border-top: 2px dashed rgba(15,23,42,.18);
}
.step-dot {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--soft);
  color: var(--muted);
  font-size: 13px;
  font-weight: 900;
}
.step-dot.active {
  background: var(--dark);
  color: #fff;
}
.step-dot.done {
  background: #dce7ff;
  color: var(--dark);
}

.form-step { display: none; }
.form-step.active { display: block; }
.amount-label, .step-title {
  display: block;
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 14px;
  text-transform: lowercase;
}
.amount-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 72px;
  border-radius: 24px;
  background: #f7f9fc;
  border: 1px solid var(--line);
  padding: 0 18px;
  margin-bottom: 12px;
}
.amount-row input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 38px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: -.05em;
  color: var(--ink);
}
.amount-row input::placeholder { color: rgba(15,23,42,.22); }
.amount-row span {
  color: var(--muted);
  font-size: 28px;
  font-weight: 800;
}

.chip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
  max-height: 210px;
  overflow: auto;
  padding-right: 2px;
}
.chip-grid.compact { grid-template-columns: repeat(3, minmax(0, 1fr)); max-height: none; }
.chip {
  min-height: 46px;
  border-radius: 17px;
  background: #f7f9fc;
  border: 1px solid var(--line);
  color: var(--ink);
  font-weight: 800;
  text-transform: lowercase;
  padding: 10px 12px;
}
.chip.active {
  background: var(--dark);
  color: #fff;
  border-color: var(--dark);
}

.date-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 20px;
  background: #f7f9fc;
  border: 1px solid var(--line);
  padding: 12px 14px;
  margin: 10px 0 12px;
  color: var(--muted);
  text-transform: lowercase;
}
.date-picker input {
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font-weight: 800;
  text-align: right;
}
.primary, .secondary {
  width: 100%;
  min-height: 52px;
  border-radius: 19px;
  font-weight: 900;
  text-transform: lowercase;
}
.primary { background: var(--dark); color: #fff; }
.secondary { background: var(--soft); color: var(--ink); }
.action-row { display: grid; grid-template-columns: .8fr 1.2fr; gap: 8px; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 14px;
}
.stats-row div {
  border-radius: 20px;
  background: #f7f9fc;
  border: 1px solid var(--line);
  padding: 12px;
  min-width: 0;
}
.stats-row span {
  display: block;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 6px;
  text-transform: lowercase;
}
.stats-row b {
  font-size: 16px;
  letter-spacing: -.04em;
  white-space: nowrap;
}

.bars { margin-top: 14px; display: grid; gap: 10px; }
.bar-row { display: grid; gap: 7px; }
.bar-meta { display: flex; justify-content: space-between; gap: 10px; color: var(--muted); font-size: 13px; }
.bar-track { height: 10px; border-radius: 999px; background: var(--soft); overflow: hidden; }
.bar-fill { height: 100%; border-radius: inherit; background: var(--dark); }
.empty { color: var(--muted); padding: 12px 0; }

.history { margin-top: 12px; display: grid; gap: 8px; }
.operation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 20px;
  background: #f7f9fc;
  border: 1px solid var(--line);
  padding: 12px;
}
.operation b { display: block; font-size: 18px; letter-spacing: -.04em; }
.operation span, .operation time, .operation em {
  display: block;
  color: var(--muted);
  font-size: 12px;
  font-style: normal;
  margin-top: 3px;
}
.operation time { text-align: right; white-space: nowrap; }

.bottom-nav {
  position: fixed;
  left: 50%;
  bottom: max(12px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(520px, calc(100% - 24px));
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 7px;
  border-radius: 24px;
  background: rgba(255,255,255,.84);
  border: 1px solid rgba(15,23,42,.08);
  box-shadow: 0 18px 48px rgba(15,23,42,.18);
  backdrop-filter: blur(18px);
}
.bottom-nav button {
  min-height: 44px;
  border-radius: 17px;
  background: transparent;
  color: var(--muted);
  font-weight: 900;
  text-transform: lowercase;
}
.bottom-nav button.active { background: var(--dark); color: #fff; }

@media (max-width: 380px) {
  .app { padding-left: 12px; padding-right: 12px; }
  h1 { font-size: 18px; }
  .balance-card > strong { font-size: 42px; }
  .chip-grid { max-height: 180px; }
}
