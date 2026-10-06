// Session insights panel and the two stage controls. Kept out of app.js so the
// Voice Live client stays focused on the session itself.

const stage = document.querySelector('.stage');
const frame = document.querySelector('.frame');
const status = document.getElementById('status');
const transcript = document.getElementById('transcript');

const tiles = {
  turns: document.getElementById('kpi-turns'),
  latency: document.getElementById('kpi-latency'),
  sources: document.getElementById('kpi-sources'),
  time: document.getElementById('kpi-time'),
};

// ------------------------------------------------------------- stage chrome

const fullscreenLabel = document.getElementById('fullscreen-label');

// The frame, not the stage: full-screening the stage alone would take the
// controls off screen and leave Esc as the only way back.
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else frame?.requestFullscreen?.();
}

document.getElementById('fullscreen-btn')?.addEventListener('click', toggleFullscreen);

// Covers Esc and F11 as well as the buttons.
document.addEventListener('fullscreenchange', () => {
  const on = Boolean(document.fullscreenElement);
  if (fullscreenLabel) fullscreenLabel.textContent = on ? 'Exit full screen' : 'Full screen';
  document.getElementById('fullscreen-btn')?.classList.toggle('active', on);
});

// app.js owns the `hidden` attribute on #caption and resets it on every caption
// event, so the preference has to express itself as a class on the body instead.
document.getElementById('pref-captions')?.addEventListener('change', (e) => {
  document.body.classList.toggle('no-captions', !e.target.checked);
});

// ------------------------------------------------------------------ metrics

let startedAt = null;
let turns = 0;
let latencyTotal = 0;
let askedAt = null;

function mmss(ms) {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function reset() {
  startedAt = null;
  turns = 0;
  latencyTotal = 0;
  askedAt = null;
  tiles.turns.textContent = '0';
  tiles.latency.textContent = '—';
  tiles.sources.textContent = '0';
  tiles.time.textContent = '00:00';
}

setInterval(() => {
  if (startedAt) tiles.time.textContent = mmss(Date.now() - startedAt);
}, 1000);

// app.js owns the status element and rewrites its className on every state
// change, so observing it is the least invasive way to follow the session.
new MutationObserver(() => {
  const live = status.classList.contains('live');
  if (live && !startedAt) startedAt = Date.now();
  if (!live && status.textContent === 'Idle') reset();
}).observe(status, { attributes: true, attributeFilter: ['class'], childList: true });

// A reply is counted when the assistant's line lands in the transcript. The
// clock starts when the user's line appears, which is the only point in the
// DOM where "question asked" is observable.
new MutationObserver((records) => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.classList.contains('user')) {
        askedAt = Date.now();
      } else if (node.classList.contains('assistant') && askedAt) {
        turns += 1;
        latencyTotal += Date.now() - askedAt;
        askedAt = null;
        tiles.turns.textContent = String(turns);
        tiles.latency.textContent = `${(latencyTotal / turns / 1000).toFixed(1)}s`;
      }
    }
  }
}).observe(transcript, { childList: true });
