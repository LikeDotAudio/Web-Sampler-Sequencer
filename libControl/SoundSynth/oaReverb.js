/**
 * Header: oaReverb.js
 * Purpose: A single shared reverb bus for the whole kit.
 * Description: Every voice splits into a dry path straight to the output and a
 *   per-channel send into one convolver. The impulse response is generated at
 *   runtime from two controls — tone (bright/dull) and size (short → extra
 *   long) — so no external IR file is needed.
 */

window.OA_REVERB_SIZES = {
    // A steeper exponent buries the tail under the dry hit, so keep these gentle
    // enough that even the short setting is audibly a room.
    short:     { label: 'Short',      seconds: 0.55, decay: 2.0 },
    medium:    { label: 'Medium',     seconds: 1.40, decay: 1.9 },
    long:      { label: 'Long',       seconds: 2.90, decay: 1.7 },
    extralong: { label: 'Extra Long', seconds: 6.00, decay: 1.4 },
};

window.OA_REVERB_TONES = {
    bright: { label: 'Bright', lowpass: 16000, highpass: 260 },
    dull:   { label: 'Dull',   lowpass: 2200,  highpass: 90 },
};

const OA_REVERB_DEFAULTS = {
    sends: Array(16).fill(0),
    tone: 'bright',
    size: 'medium',
    ret: 0.4,
};

window.OA_REVERB = (function () {
    try {
        const saved = JSON.parse(window.localStorage.getItem('oaReverb'));
        if (saved) {
            const sends = Array.isArray(saved.sends) ? saved.sends.slice(0, 16) : [];
            while (sends.length < 16) sends.push(0);
            return Object.assign({}, OA_REVERB_DEFAULTS, saved, { sends: sends });
        }
    } catch (e) {}
    return Object.assign({}, OA_REVERB_DEFAULTS, { sends: OA_REVERB_DEFAULTS.sends.slice() });
})();

window.oaSaveReverb = function () {
    try { window.localStorage.setItem('oaReverb', JSON.stringify(window.OA_REVERB)); } catch (e) {}
};

// Noise shaped by an exponential decay — the standard way to fake a room when
// you have no recorded impulse. Stereo, with the channels decorrelated so the
// tail spreads rather than sitting dead centre.
window.oaMakeImpulse = function (ctx, sizeKey, toneKey) {
    const size = window.OA_REVERB_SIZES[sizeKey] || window.OA_REVERB_SIZES.medium;
    const tone = window.OA_REVERB_TONES[toneKey] || window.OA_REVERB_TONES.bright;
    const rate = ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * size.seconds));
    const buf = ctx.createBuffer(2, len, rate);

    // One-pole filters applied per sample: cheaper than running a filter node
    // over the tail, and it bakes the tone into the IR itself.
    const lpCoef = Math.exp(-2 * Math.PI * tone.lowpass / rate);
    const hpCoef = Math.exp(-2 * Math.PI * tone.highpass / rate);

    for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let lp = 0, hp = 0, prev = 0;
        for (let i = 0; i < len; i++) {
            const white = Math.random() * 2 - 1;
            lp = white * (1 - lpCoef) + lp * lpCoef;        // tame the top
            hp = (hp + lp - prev) * hpCoef;                 // clear the mud
            prev = lp;
            // Early samples build fast, then the whole thing decays away.
            const env = Math.pow(1 - i / len, size.decay);
            d[i] = hp * env;
        }
    }
    return buf;
};

// One bus per AudioContext — the offline renderer gets its own.
window.oaReverbBus = function (ctx) {
    if (!ctx.__oaReverb) {
        const input = ctx.createGain();          // everything sends in here
        const convolver = ctx.createConvolver();
        const ret = ctx.createGain();
        convolver.normalize = true;
        convolver.buffer = window.oaMakeImpulse(ctx, window.OA_REVERB.size, window.OA_REVERB.tone);
        ret.gain.value = window.OA_REVERB.ret;
        input.connect(convolver);
        convolver.connect(ret);
        ret.connect(ctx.destination);

        // Tap the wet output per side so the return strip can meter what is
        // actually ringing, rather than guessing from the send levels.
        let analysers = null;
        if (ctx.createAnalyser && ctx.createChannelSplitter) {
            const split = ctx.createChannelSplitter(2);
            ret.connect(split);
            analysers = [0, 1].map((ch) => {
                const a = ctx.createAnalyser();
                a.fftSize = 1024;
                split.connect(a, ch);
                return a;
            });
        }
        ctx.__oaReverb = { input: input, convolver: convolver, ret: ret, analysers: analysers };
    }
    return ctx.__oaReverb;
};

// Rebuild the tail for the live context after a tone/size change.
window.oaRefreshReverb = function () {
    const ctx = window.OA_AUDIO_CTX;
    if (ctx && ctx.__oaReverb) {
        ctx.__oaReverb.convolver.buffer = window.oaMakeImpulse(ctx, window.OA_REVERB.size, window.OA_REVERB.tone);
        ctx.__oaReverb.ret.gain.value = window.OA_REVERB.ret;
    }
};

window.oaSetReverb = function (key, value) {
    window.OA_REVERB[key] = value;
    window.oaSaveReverb();
    window.oaRefreshReverb();
    window.dispatchEvent(new CustomEvent('oa-reverb-changed', { detail: { key: key } }));
};

window.oaSetReverbSend = function (idx, value) {
    const sends = window.OA_REVERB.sends.slice();
    sends[idx] = Math.max(0, Math.min(1, value));
    window.OA_REVERB.sends = sends;
    window.oaSaveReverb();
    window.dispatchEvent(new CustomEvent('oa-reverb-changed', { detail: { idx: idx } }));
};

/**
 * The node a voice should connect to. Handles panning, the dry path to the
 * output and the reverb send for this channel. Returns the input node.
 */
window.oaVoiceOut = function (ctx, idx, pan) {
    let node;
    if (pan && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan));
        node = p;
    } else {
        node = ctx.createGain();
    }
    node.connect(ctx.destination);

    const send = (window.OA_REVERB.sends && window.OA_REVERB.sends[idx]) || 0;
    if (send > 0.001) {
        const sg = ctx.createGain();
        sg.gain.value = send;
        node.connect(sg);
        sg.connect(window.oaReverbBus(ctx).input);
    }
    return node;
};
