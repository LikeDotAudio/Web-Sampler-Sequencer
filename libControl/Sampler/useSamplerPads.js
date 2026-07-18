window.useSamplerPads = (
    centerVelocity, edgeVelocity, onHit, toneRoot, midiBaseRef, 
    setVelocities, setToneRoot, padButtons
) => {
    const computeVelocity = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = (Math.min(rect.width, rect.height) / 2) || 1;
        const d = Math.min(dist / radius, 1);
        const v = centerVelocity + (edgeVelocity - centerVelocity) * d;
        return Math.round(Math.max(0, Math.min(100, v)));
    };

    const emitHit = (idx, velocity) => {
        window.dispatchEvent(new CustomEvent('oa-drum-hit', { detail: { idx, velocity } }));
    };

    const hitPad = (e, idx, explicitPadNum = null) => {
        const velocity = computeVelocity(e);
        setVelocities((prev) => { const n = [...prev]; n[idx] = velocity; return n; });
        
        if (toneRoot !== null && explicitPadNum !== null) {
            const entry = window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[toneRoot];
            let semitones = explicitPadNum - 1;
            if (entry && entry.sampleRoot != null) {
                semitones = (window.OA_MIDI_BASE + explicitPadNum - 1) - entry.sampleRoot;
            }
            if (window.oaTriggerTone) window.oaTriggerTone(toneRoot, semitones, velocity / 100);
            window.dispatchEvent(new CustomEvent('oa-tone-hit', { detail: { rootIdx: toneRoot, semitones, velocity } }));
        } else {
            if (window.oaTriggerDrum) window.oaTriggerDrum(idx, velocity / 100);
            if (typeof onHit === 'function') onHit(idx + 1, velocity);
            emitHit(idx, velocity);
        }
        
        return velocity;
    };

    const startGlow = (el, idx, i) => {
        if (!el) return;
        const entry = window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[idx];
        const durMs = (entry && entry.buffer) ? Math.max(120, Math.min(entry.buffer.duration * 1000, 5000)) : 180;
        el.style.setProperty('--gi', i);
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = `oaPadGlow ${durMs}ms ease-out`;
    };

    const triggerPadAt = (idx, velocity) => {
        const v = Math.max(1, Math.min(100, Math.round(velocity == null ? 100 : velocity)));
        setVelocities((prev) => { const n = [...prev]; n[idx] = v; return n; });
        if (window.oaTriggerDrum) window.oaTriggerDrum(idx, v / 100);
        if (typeof onHit === 'function') onHit(idx + 1, v);
        emitHit(idx, v);
        const el = padButtons.current[idx];
        if (el) {
            el.style.transform = 'scale(0.95)';
            el.style.filter = `brightness(${0.9 + 0.5 * (v / 100)})`;
            startGlow(el, idx, v / 100);
            setTimeout(() => { if (el) { el.style.transform = 'scale(1)'; el.style.filter = 'none'; } }, 90);
        }
    };

    const triggerPadKey = (idx, explicitPadNum = null, velocity = 100) => {
        if (toneRoot !== null && explicitPadNum !== null) {
            const v = velocity;
            const entry = window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[toneRoot];
            let semitones = explicitPadNum - 1;
            if (entry && entry.sampleRoot != null) {
                semitones = (midiBaseRef.current + explicitPadNum - 1) - entry.sampleRoot;
            }
            setVelocities((prev) => { const n = [...prev]; n[idx] = v; return n; });
            if (window.oaTriggerTone) window.oaTriggerTone(toneRoot, semitones, v / 100);
            window.dispatchEvent(new CustomEvent('oa-tone-hit', { detail: { rootIdx: toneRoot, semitones, velocity: v } }));
            const el = padButtons.current[idx];
            if (el) {
                el.style.transform = 'scale(0.95)';
                el.style.filter = `brightness(1.4)`;
                startGlow(el, idx, v / 100);
                setTimeout(() => { if (el) { el.style.transform = 'scale(1)'; el.style.filter = 'none'; } }, 90);
            }
        } else {
            triggerPadAt(idx, velocity);
        }
    };

    return { hitPad, startGlow, triggerPadAt, triggerPadKey };
};
