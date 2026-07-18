// Synthesize a kit voice at `time` with `volume` (0..1). Used when no sample.
// The voice is built by its engine from the patch in OA_DRUM_SYNTH — `track`
// only carries the kit index and, in Tone Mode, a pitch ratio to apply.
window.oaPlayDrumVoice = function (ctx, track, time, volume, pan) {
    if (!track) return;
    const idx = track.idx != null ? track.idx : (window.OA_DRUM_KIT || []).indexOf(track);
    const patch = window.oaSynthPatch((window.OA_DRUM_SYNTH || {})[idx] || window.OA_SYNTH_FACTORY[idx]);
    const engine = window.OA_SYNTH_ENGINES[patch.engine] || window.OA_SYNTH_ENGINES.membrane;

    // Tone Mode hands us a ratio; shift every frequency-shaped parameter by it.
    const ratio = track.pitchRatio || 1;
    const tuned = (ratio === 1) ? patch : window.oaTransposePatch(patch, ratio);

    let out;
    if (pan && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan));
        p.connect(ctx.destination);
        out = p;
    } else {
        out = ctx.destination;
    }
    engine.render(ctx, tuned, time, Math.max(0.0001, volume), out);
};

// Frequency-valued parameters that should follow a Tone Mode transposition.
const OA_PITCHED_PARAMS = ['pitchStart', 'pitchEnd', 'tone1', 'tone2', 'base', 'freq', 'carrier', 'filterFreq'];
window.oaTransposePatch = function (patch, ratio) {
    const out = Object.assign({}, patch);
    OA_PITCHED_PARAMS.forEach((k) => { if (typeof out[k] === 'number') out[k] = out[k] * ratio; });
    return out;
};
// Play a loaded sample ENTRY at `time` with `volume` (0..1); honours pitch,
// loop and fade. Returns the BufferSource so a looping voice can be stopped.
window.oaPlayDrumSample = function (ctx, entry, time, volume, pan) {
    if (!entry || !entry.buffer) return null;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    
    const pitch = entry.pitch || 1;
    const useCache = !!entry.cachedBuffer;
    
    src.buffer = entry.cachedBuffer || entry.buffer;
    src.playbackRate.value = useCache ? 1 : pitch;
    src.loop = !!entry.loop;
    
    const origDur = entry.buffer.duration;
    let offset = Math.max(0, Math.min(entry.offset || 0, origDur - 0.001));
    let end = (entry.end != null && entry.end > offset) ? Math.min(entry.end, origDur) : origDur;
    let region = Math.max(0.001, end - offset);
    
    const playDur = region / pitch;
    
    if (useCache) {
        offset = offset / pitch;
        end = end / pitch;
        region = region / pitch;
    }
    
    if (src.loop) { src.loopStart = offset; src.loopEnd = end; }
    src.connect(gain);
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); gain.connect(p); p.connect(ctx.destination); }
    else gain.connect(ctx.destination);
    
    const v = Math.max(0.0001, volume);
    if (entry.fade) {
        const f = Math.min(0.05, playDur * 0.2);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(v, time + f);
        if (!src.loop) {
            gain.gain.setValueAtTime(v, Math.max(time + f, time + playDur - f));
            gain.gain.exponentialRampToValueAtTime(0.0001, time + playDur);
        }
    } else {
        gain.gain.setValueAtTime(v, time);
    }
    
    if (src.loop) src.start(time, offset);
    else src.start(time, offset, region);
    
    // Register as an active voice so a MIDI pitch-bend can retune it live, and
    // start it at the current wheel offset. Auto-removed when the note ends.
    try {
        if (src.detune) src.detune.value = window.OA_PITCH_BEND || 0;
        window.OA_DRUM_VOICES.push(src);
        src.addEventListener('ended', function () {
            const i = window.OA_DRUM_VOICES.indexOf(src);
            if (i >= 0) window.OA_DRUM_VOICES.splice(i, 1);
        });
    } catch (e) {}
    return src;
};
// Trigger drum voice `idx`: sample (pitch/loop/fade) if loaded, else synth.
// For an auto-loop pad, TOGGLES the loop. Returns true if a loop just STARTED.
window.oaTriggerDrum = function (idx, volume, time) {
    const ctx = window.oaAudioCtx();
    const t = (typeof time === 'number') ? time : ctx.currentTime;
    const vol = Math.max(0, Math.min(1, volume == null ? 1 : volume));
    const entry = window.OA_DRUM_SAMPLES[idx];
    if (entry && entry.buffer) {
        if (entry.loop) {
            const existing = window.OA_DRUM_LOOPS[idx];
            if (existing) { try { existing.stop(); } catch (e) {} window.OA_DRUM_LOOPS[idx] = null; return false; }
            const src = window.oaPlayDrumSample(ctx, entry, t, vol);
            window.OA_DRUM_LOOPS[idx] = src;
            if (src) src.onended = () => { if (window.OA_DRUM_LOOPS[idx] === src) window.OA_DRUM_LOOPS[idx] = null; };
            return true;
        }
        window.oaPlayDrumSample(ctx, entry, t, vol);
        return false;
    }
    window.oaPlayDrumVoice(ctx, { idx: idx }, t, vol);
    return false;
};
// Trigger a drum voice pitched by N semitones (Tone Mode)
window.oaTriggerTone = function(rootIdx, semitones, volume, time) {
    const ctx = window.oaAudioCtx();
    const t = (typeof time === 'number') ? time : ctx.currentTime;
    const vol = Math.max(0, Math.min(1, volume == null ? 1 : volume));
    const entry = window.OA_DRUM_SAMPLES[rootIdx];
    
    if (entry && entry.buffer) {
        const pitchRatio = Math.pow(2, semitones / 12);
        const totalPitch = (entry.pitch || 1) * pitchRatio;
        
        // If we have a pre-rendered cache for this exact pitch, use it at 1x speed to save latency
        const cache = window.OA_TONE_CACHE[rootIdx];
        if (cache && cache[semitones]) {
            window.oaPlayDrumSample(ctx, Object.assign({}, entry, { cachedBuffer: cache[semitones], pitch: totalPitch }), t, vol);
            return true;
        }
        
        // Fallback to real-time resampling if not in cache
        window.oaPlayDrumSample(ctx, Object.assign({}, entry, { pitch: totalPitch }), t, vol);
        return true;
    }
    
    // Fallback to the synth voice, transposed
    if (window.OA_DRUM_KIT[rootIdx]) {
        window.oaPlayDrumVoice(ctx, { idx: rootIdx, pitchRatio: Math.pow(2, semitones / 12) }, t, vol);
        return true;
    }
    return false;
};
// Pre-render a sample at multiple pitches to eliminate real-time resampling latency
window.oaPrecacheTones = async function(rootIdx) {
    const entry = window.OA_DRUM_SAMPLES[rootIdx];
    if (!entry || !entry.buffer) return;
    
    const origBuf = entry.buffer;
    const basePitch = entry.pitch || 1;
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineCtx) return;
    
    window.OA_TONE_CACHE[rootIdx] = window.OA_TONE_CACHE[rootIdx] || {};
    
    // Pre-render 2 octaves down and 3 octaves up
    for (let semitones = -24; semitones <= 36; semitones++) {
        if (window.OA_TONE_CACHE[rootIdx][semitones]) continue; // already cached
        
        try {
            const pitchRatio = Math.pow(2, semitones / 12);
            const totalPitch = basePitch * pitchRatio;
            
            if (totalPitch === 1) {
                window.OA_TONE_CACHE[rootIdx][semitones] = origBuf;
                continue;
            }
            
            const dur = origBuf.duration / totalPitch;
            const offCtx = new OfflineCtx(origBuf.numberOfChannels, Math.ceil(dur * origBuf.sampleRate), origBuf.sampleRate);
            
            const src = offCtx.createBufferSource();
            src.buffer = origBuf;
            src.playbackRate.value = totalPitch;
            src.connect(offCtx.destination);
            src.start(0);
            
            const rendered = await offCtx.startRendering();
            window.OA_TONE_CACHE[rootIdx][semitones] = rendered;
        } catch(e) {
            console.error('Failed to pre-render pitch', semitones, e);
        }
    }
};
// Pre-cache an individual pad's configured pitch to eliminate real-time latency
window.oaPrecachePad = async function(entry) {
    if (!entry || !entry.buffer) return;
    const pitch = entry.pitch || 1;
    if (pitch === 1) {
        entry.cachedBuffer = entry.buffer;
        return;
    }
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineCtx) {
        entry.cachedBuffer = entry.buffer;
        return;
    }
    try {
        const dur = entry.buffer.duration / pitch;
        const offCtx = new OfflineCtx(entry.buffer.numberOfChannels, Math.ceil(dur * entry.buffer.sampleRate), entry.buffer.sampleRate);
        const src = offCtx.createBufferSource();
        src.buffer = entry.buffer;
        src.playbackRate.value = pitch;
        src.connect(offCtx.destination);
        src.start(0);
        entry.cachedBuffer = await offCtx.startRendering();
    } catch (e) {
        entry.cachedBuffer = entry.buffer;
    }
};
