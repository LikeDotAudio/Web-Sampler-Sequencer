/**
 * Header: DrumKit.js
 * Purpose: Shared 16-voice drum kit for the Sampler + Sequencer.
 * Description: Single source of truth for the drum-sound names/voices so the
 *   Sampler pads and the Sequencer tracks are the SAME kit. Also provides a
 *   shared AudioContext and a shared sample store, so a sample loaded on a
 *   Sampler pad is played by the Sequencer for that track too.
 *
 * Plain JS (not JSX) so it runs before the text/babel component scripts and
 * window.OA_DRUM_KIT is ready when they execute.
 *
 * Version: 26.07.11.1
 */

// 16 voices: name + synth pitch (Hz) + oscillator type (used when no sample loaded).
// Pad index (0-15) === Sequencer track index === key into OA_DRUM_SAMPLES.
window.OA_DRUM_KIT = [
    { name: 'Kick',    freq: 60,   type: 'sine' },
    { name: 'Snare',   freq: 200,  type: 'sine' },
    { name: 'Hi-Hat',  freq: 800,  type: 'square' },
    { name: 'Perc',    freq: 400,  type: 'sine' },
    { name: 'Clap',    freq: 300,  type: 'square' },
    { name: 'Rim',     freq: 1000, type: 'square' },
    { name: 'Tom Lo',  freq: 100,  type: 'sine' },
    { name: 'Tom Mid', freq: 150,  type: 'sine' },
    { name: 'Tom Hi',  freq: 250,  type: 'sine' },
    { name: 'Cymbal',  freq: 1200, type: 'square' },
    { name: 'Ride',    freq: 900,  type: 'square' },
    { name: 'Cowbell', freq: 540,  type: 'square' },
    { name: 'Conga',   freq: 350,  type: 'sine' },
    { name: 'Clave',   freq: 1100, type: 'sine' },
    { name: 'Shaker',  freq: 1500, type: 'square' },
    { name: 'FX',      freq: 700,  type: 'sawtooth' },
];

// Shared AudioContext so buffers decoded by the Sampler play in the Sequencer.
window.oaAudioCtx = function () {
    if (!window.OA_AUDIO_CTX) {
        window.OA_AUDIO_CTX = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (window.OA_AUDIO_CTX.state === 'suspended') {
        // Best-effort resume (browsers gate audio until a user gesture).
        try { window.OA_AUDIO_CTX.resume(); } catch (e) {}
    }
    return window.OA_AUDIO_CTX;
};

// index -> sample ENTRY { buffer, pitch, loop, fade, name }. Populated by the
// Sampler / AudioEditor, read by both the Sampler pads and the Sequencer.
window.OA_DRUM_SAMPLES = window.OA_DRUM_SAMPLES || {};
// index -> currently-playing looping BufferSource (for auto-loop toggle pads).
window.OA_DRUM_LOOPS = window.OA_DRUM_LOOPS || {};
// Every currently-sounding BufferSource, for live MIDI pitch-bend. OA_PITCH_BEND
// is the current wheel offset in CENTS (±200 = ±2 semitones); it is applied via
// each source's `detune` AudioParam so the sample's base pitch is preserved.
window.OA_DRUM_VOICES = window.OA_DRUM_VOICES || [];
window.OA_PITCH_BEND = window.OA_PITCH_BEND || 0;

// Pre-rendered pitched buffers for Tone Mode (avoids real-time resampling latency)
// rootIdx -> { semitones -> AudioBuffer }
window.OA_TONE_CACHE = window.OA_TONE_CACHE || {};

// Set the global pitch-bend (cents) and retune every sounding voice live.
window.oaSetPitchBend = function (cents) {
    window.OA_PITCH_BEND = cents || 0;
    for (let i = 0; i < window.OA_DRUM_VOICES.length; i++) {
        const s = window.OA_DRUM_VOICES[i];
        try { if (s.detune) s.detune.value = window.OA_PITCH_BEND; } catch (e) {}
    }
};

// Store/replace a pad's sample. opts: { loop, pitch, fade, name }.
window.oaSetDrumSample = function (idx, buffer, opts) {
    opts = opts || {};
    let sampleRoot = null;
    const name = opts.name || '';
    const m = /ROOT-(\d+)/i.exec(name);
    if (m) sampleRoot = parseInt(m[1], 10);
    
    const entry = {
        buffer: buffer,
        pitch: opts.pitch || 1,     // playbackRate multiplier (pitch + speed)
        sampleRoot: sampleRoot,     // MIDI note root parsed from filename
        offset: opts.offset || 0,   // start offset in seconds (time shift)
        end: (opts.end != null ? opts.end : null),   // cut-off in seconds (null = EOF)
        loop: !!opts.loop,
        fade: !!opts.fade,
        name: name,
        folder: opts.folder || '',  // source folder (for set snapshots / revert)
    };
    window.OA_DRUM_SAMPLES[idx] = entry;
    if (window.oaPrecachePad) window.oaPrecachePad(entry);
};

// Patch an existing pad's options (pitch/loop/fade) without re-decoding.
window.oaUpdateDrumSample = function (idx, patch) {
    const e = window.OA_DRUM_SAMPLES[idx];
    if (e) {
        const oldPitch = e.pitch || 1;
        Object.assign(e, patch || {});
        if (e.pitch !== oldPitch || !e.cachedBuffer) {
            if (window.oaPrecachePad) window.oaPrecachePad(e);
        }
    }
};


