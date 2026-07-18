/**
 * Header: oaDrumSynthPatches.js
 * Purpose: The factory patch for each of the 16 kit voices.
 * Description: Which engine each voice uses and how it is tuned out of the box.
 *   A user's edits are stored per index in OA_DRUM_SYNTH and persisted to
 *   localStorage; these are the values a "Reset" returns to.
 */

window.OA_SYNTH_FACTORY = [
    // 0 Kick — deep pitch drop, short beater click
    { engine: 'membrane', wave: 'sine', pitchStart: 190, pitchEnd: 48, pitchDecay: 22, decay: 340, click: 0.3, clickDecay: 7, drive: 0.2 },
    // 1 Snare — shell plus wires
    { engine: 'snare', tone1: 175, tone2: 235, pitchDrop: 0.3, toneDecay: 80, filterType: 'highpass', filterFreq: 1800, q: 1.2, noiseDecay: 260, mix: 0.6 },
    // 2 Hi-Hat — closed: bright and fast
    { engine: 'metal', base: 245, spread: 1, voices: 6, filterType: 'highpass', filterFreq: 8000, q: 2, noise: 0.12, decay: 75 },
    // 3 Perc — short FM blip
    { engine: 'fm', carrier: 420, ratio: 3.1, index: 700, indexDecay: 45, pitchDrop: 0.2, decay: 160 },
    // 4 Clap — three hands
    { engine: 'clap', bursts: 3, spacing: 11, filterFreq: 1200, q: 3, burstDecay: 9, tailDecay: 220 },
    // 5 Rim — resonant wooden crack, noise-led
    { engine: 'click', freq: 1700, q: 16, decay: 30, noise: 0.6, wave: 'triangle' },
    // 6 Tom Lo
    { engine: 'membrane', wave: 'sine', pitchStart: 220, pitchEnd: 90, pitchDecay: 40, decay: 520, click: 0.18, clickDecay: 8, drive: 0.1 },
    // 7 Tom Mid
    { engine: 'membrane', wave: 'sine', pitchStart: 300, pitchEnd: 140, pitchDecay: 36, decay: 440, click: 0.18, clickDecay: 8, drive: 0.1 },
    // 8 Tom Hi
    { engine: 'membrane', wave: 'sine', pitchStart: 420, pitchEnd: 210, pitchDecay: 32, decay: 380, click: 0.2, clickDecay: 7, drive: 0.1 },
    // 9 Cymbal — long, dense, sizzling
    { engine: 'metal', base: 300, spread: 1.25, voices: 6, filterType: 'highpass', filterFreq: 5500, q: 1.4, noise: 0.35, decay: 1600 },
    // 10 Ride — pingier than the crash, mid-length
    { engine: 'metal', base: 420, spread: 0.9, voices: 6, filterType: 'bandpass', filterFreq: 6000, q: 2.5, noise: 0.2, decay: 900 },
    // 11 Cowbell — two-tone metallic, short
    { engine: 'metal', base: 540, spread: 0.35, voices: 2, filterType: 'bandpass', filterFreq: 2600, q: 3.5, noise: 0.02, decay: 210 },
    // 12 Conga — membrane, rings longer than a tom
    { engine: 'membrane', wave: 'sine', pitchStart: 360, pitchEnd: 195, pitchDecay: 28, decay: 480, click: 0.22, clickDecay: 6, drive: 0.05 },
    // 13 Clave — pure brief resonance
    { engine: 'click', freq: 2450, q: 12, decay: 40, noise: 0.15, wave: 'sine' },
    // 14 Shaker — ramped attack
    { engine: 'shaker', filterFreq: 7200, q: 2.5, attack: 20, decay: 130 },
    // 15 FX — laser-ish FM sweep
    { engine: 'fm', carrier: 220, ratio: 5.5, index: 1400, indexDecay: 220, pitchDrop: 0.6, decay: 600 },
];

// idx -> live patch. Seeded from the factory, overlaid with anything saved.
window.OA_DRUM_SYNTH = window.OA_DRUM_SYNTH || {};

window.oaLoadSynthPatches = function () {
    let saved = {};
    try { saved = JSON.parse(window.localStorage.getItem('oaDrumSynth')) || {}; } catch (e) {}
    for (let i = 0; i < 16; i++) {
        window.OA_DRUM_SYNTH[i] = window.oaSynthPatch(saved[i] || window.OA_SYNTH_FACTORY[i]);
    }
};

window.oaSaveSynthPatches = function () {
    try { window.localStorage.setItem('oaDrumSynth', JSON.stringify(window.OA_DRUM_SYNTH)); } catch (e) {}
};

window.oaSetSynthParam = function (idx, key, value) {
    const patch = window.OA_DRUM_SYNTH[idx] || window.oaSynthPatch(window.OA_SYNTH_FACTORY[idx]);
    // Switching engine starts from that engine's defaults rather than carrying
    // over parameters that mean nothing to it.
    window.OA_DRUM_SYNTH[idx] = key === 'engine'
        ? window.oaSynthPatch({ engine: value })
        : Object.assign({}, patch, { [key]: value });
    window.oaSaveSynthPatches();
    window.dispatchEvent(new CustomEvent('oa-synth-changed', { detail: { idx } }));
};

window.oaResetSynthPatch = function (idx) {
    window.OA_DRUM_SYNTH[idx] = window.oaSynthPatch(window.OA_SYNTH_FACTORY[idx]);
    window.oaSaveSynthPatches();
    window.dispatchEvent(new CustomEvent('oa-synth-changed', { detail: { idx } }));
};

window.oaLoadSynthPatches();

// ---------------------------------------------------------------------------
// Rendered preview: a synth voice bounced to a real AudioBuffer, so it can be
// drawn on the pad exactly like a loaded sample. Cached per voice and thrown
// away whenever that voice's patch changes.
// ---------------------------------------------------------------------------
window.OA_SYNTH_RENDER = window.OA_SYNTH_RENDER || {};

// How long to bounce. Long enough to catch the whole tail of the slowest patch
// without rendering seconds of silence for a clave.
const synthRenderSeconds = (patch) => {
    const p = patch || {};
    const longest = Math.max(
        p.decay || 0,
        p.noiseDecay || 0,
        p.tailDecay || 0,
        (p.attack || 0) + (p.decay || 0)
    ) / 1000;
    return Math.min(6, Math.max(0.25, longest * 1.15 + 0.05));
};

window.oaRenderSynthVoice = async function (idx) {
    const patch = window.oaSynthPatch(window.OA_DRUM_SYNTH[idx]);
    const key = JSON.stringify(patch);
    const cached = window.OA_SYNTH_RENDER[idx];
    if (cached && cached.key === key) return cached.buffer;

    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const engine = window.OA_SYNTH_ENGINES[patch.engine];
    if (!OfflineCtx || !engine) return null;

    const rate = (window.OA_AUDIO_CTX && window.OA_AUDIO_CTX.sampleRate) || 44100;
    const seconds = synthRenderSeconds(patch);
    try {
        const off = new OfflineCtx(1, Math.ceil(rate * seconds), rate);
        engine.render(off, patch, 0, 0.9, off.destination);
        const raw = await off.startRendering();

        // Trim the trailing silence. Without this a 30ms rimshot is drawn into
        // the first eighth of the pad with the rest blank, while a long cymbal
        // fills it — the shapes would not be comparable.
        const src = raw.getChannelData(0);
        let last = src.length - 1;
        while (last > 0 && Math.abs(src[last]) < 0.0015) last--;
        const len = Math.max(64, last + 1);
        let buffer = raw;
        if (len < src.length) {
            buffer = new (window.AudioBuffer || Object)({ length: len, sampleRate: rate, numberOfChannels: 1 });
            buffer.copyToChannel(src.subarray(0, len), 0);
        }
        window.OA_SYNTH_RENDER[idx] = { key: key, buffer: buffer };
        window.dispatchEvent(new CustomEvent('oa-synth-rendered', { detail: { idx: idx } }));
        return buffer;
    } catch (e) {
        return null;
    }
};

// Keep every voice's preview current: re-bounce on edit, and once at startup so
// the pads show their waveforms without waiting to be touched.
window.addEventListener('oa-synth-changed', (e) => {
    const idx = e.detail && e.detail.idx;
    if (idx != null) {
        delete window.OA_SYNTH_RENDER[idx];
        window.oaRenderSynthVoice(idx);
    }
});

window.oaRenderAllSynthVoices = function () {
    for (let i = 0; i < 16; i++) window.oaRenderSynthVoice(i);
};
