window.useMidiPads = (midiBase, toneRootRef, padButtons, triggerPadAt, setVelocities) => {
    const [midiStatus, setMidiStatus] = React.useState('');
    const [midiNote, setMidiNote] = React.useState(null);
    const triggerRef = React.useRef(triggerPadAt); triggerRef.current = triggerPadAt;
    
    // Restart the velocity glow on a pad element (bright → fades over sound length).
    const startGlow = (el, idx, i) => {
        if (!el) return;
        const entry = window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[idx];
        const durMs = (entry && entry.buffer) ? Math.max(120, Math.min(entry.buffer.duration * 1000, 5000)) : 180;
        el.style.setProperty('--gi', i);
        el.style.animation = 'none';
        void el.offsetWidth;            // reflow → restart on rapid hits
        el.style.animation = `oaPadGlow ${durMs}ms ease-out`;
    };

    React.useEffect(() => {
        if (!navigator.requestMIDIAccess) { setMidiStatus('Web MIDI not supported (use Chrome/Edge)'); return; }
        let access = null;
        const onMsg = (e) => {
            if (window.OA_MIDI_CAPTURED) return;   // Pad Browser (or other modal) owns MIDI right now
            const status = e.data[0], note = e.data[1], vel = e.data[2];
            if ((status & 0xf0) === 0xe0) {                   // pitch-bend wheel → retune sounding voices
                const val = ((e.data[2] << 7) | e.data[1]) - 8192;   // 14-bit, centered at 0
                if (window.oaSetPitchBend) window.oaSetPitchBend((val / 8192) * 200);  // ±2 semitones
                return;
            }
            if ((status & 0xf0) === 0x90 && vel > 0) {        // note-on
                setMidiNote(note);
                const idx = note - midiBase;
                const velocity = Math.max(1, Math.round(vel / 127 * 100));
                
                if (toneRootRef.current !== null) {
                    // In Tone Mode, map ANY note to a pitch relative to midiBase or sampleRoot
                    const entry = window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[toneRootRef.current];
                    let semitones = idx; // idx is (note - midiBase)
                    if (entry && entry.sampleRoot != null) {
                        semitones = note - entry.sampleRoot;
                    }
                    if (window.oaTriggerTone) window.oaTriggerTone(toneRootRef.current, semitones, velocity / 100);
                    window.dispatchEvent(new CustomEvent('oa-tone-hit', { detail: { rootIdx: toneRootRef.current, semitones, velocity } }));
                    
                    // Flash the pad if it falls within the 16 visual pads
                    if (idx >= 0 && idx < 16) {
                        setVelocities((prev) => { const n = [...prev]; n[idx] = velocity; return n; });
                        const el = padButtons.current[idx];
                        if (el) {
                            el.style.transform = 'scale(0.95)';
                            el.style.filter = `brightness(1.4)`;
                            startGlow(el, idx, velocity / 100);
                            setTimeout(() => { if (el) { el.style.transform = 'scale(1)'; el.style.filter = 'none'; } }, 90);
                        }
                    }
                } else {
                    if (idx >= 0 && idx < 16) triggerRef.current(idx, velocity);
                }
            }
        };
        const attach = (a) => { const names = []; a.inputs.forEach((inp) => { inp.onmidimessage = onMsg; names.push(inp.name); }); setMidiStatus(names.length ? names.join(', ') : 'No MIDI inputs'); };
        navigator.requestMIDIAccess().then((a) => { access = a; attach(a); a.onstatechange = () => attach(a); }).catch(() => setMidiStatus('MIDI access denied'));
        return () => { if (access) access.inputs.forEach((inp) => { inp.onmidimessage = null; }); };
    }, [midiBase, toneRootRef, setVelocities]);

    return { midiStatus, midiNote };
};
