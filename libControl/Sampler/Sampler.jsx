const loadDrumSets = () => { try { return JSON.parse(window.localStorage.getItem('oaDrumSets')) || {}; } catch (e) { return {}; } };

const midiNoteName = window.midiNoteName;
const PadWave = window.PadWave;

const Sampler = ({ label = "Drum Sampler", centerVelocity = 100, edgeVelocity = 10, onHit = null }) => {
    // Shared drum kit — the SAME 16 voices the Sequencer uses (DrumKit.js).
    const KIT = window.OA_DRUM_KIT || [];

    // Per-pad loaded-sample file name (for display); null = uses the synth voice.
    // The decoded audio lives in window.OA_DRUM_SAMPLES so the Sequencer plays it
    // too. Seed from that shared store so pads loaded before a remount still show.
    const [sampleNames, setSampleNames] = React.useState(() =>
        Array(16).fill(null).map((_, i) => {
            const e = window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[i];
            return e ? (e.name || '(loaded)') : null;
        }));

    // Tone mode: root pad index (0-15), or null if disabled.
    const [toneRoot, setToneRoot] = React.useState(null);
    const toneRootRef = React.useRef(toneRoot); toneRootRef.current = toneRoot;

    // Side-car value per pad: velocity (0-100) of the most recent hit. Drives
    // playback volume AND the pad's visual glow.
    const [velocities, setVelocities] = React.useState(Array(16).fill(0));

    // Hidden file inputs, one per pad (fallback when the Sound Browse window
    // isn't available). ALT+press normally opens the custom Sound Browse modal.
    const fileInputs = React.useRef([]);
    const [browsePad, setBrowsePad] = React.useState(null);
    // "Load to other pad" mode: the next pad clicked receives this sample.
    const [pendingAssign, setPendingAssign] = React.useState(null); // { file, meta }
    const [showPadBrowse, setShowPadBrowse] = React.useState(false);

    // Remembered assignments from retained MQTT: { idx: {name, folder} }. Lets the
    // kit revert (labels immediately; audio via Restore) after a reload.
    const mqttMessages = window.useMqttMessages ? window.useMqttMessages() : {};
    const kitMeta = React.useMemo(() => {
        const m = {};
        for (let i = 0; i < 16; i++) {
            const raw = mqttMessages[`OpenAir/Gui/DrumKit/${i}/sample`];
            if (raw) { try { const o = JSON.parse(raw); if (o && o.name) m[i] = o; } catch (e) {} }
        }
        return m;
    }, [mqttMessages]);
    const [restoreMsg, setRestoreMsg] = React.useState('');
    const missingCount = Object.keys(kitMeta).filter((i) => !(window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[i])).length;
    const restoreSounds = async () => {
        if (!window.oaRestoreKit) return;
        setRestoreMsg('restoring…');
        const res = await window.oaRestoreKit(kitMeta);
        if (res.ok) {
            setRestoreMsg(`restored ${res.restored}`);
            setSampleNames((prev) => { const n = [...prev]; for (let i = 0; i < 16; i++) { const e = window.OA_DRUM_SAMPLES[i]; if (e) n[i] = e.name || '(loaded)'; } return n; });
        } else setRestoreMsg(res.reason === 'no-folder' ? 'pick a folder first' : 'permission denied');
        setTimeout(() => setRestoreMsg(''), 2500);
    };

    const { sets, currentSet, newSet, deleteSet, loadSet } = window.useSamplerSets(setSampleNames, publishSample);

    // The standard MPC layout is bottom-left to top-right:
    // 13 14 15 16
    // 9  10 11 12
    // 5  6  7  8
    // 1  2  3  4
    const layout = [13, 14, 15, 16, 9, 10, 11, 12, 5, 6, 7, 8, 1, 2, 3, 4];

    // Load a sample onto a pad: decode to an AudioBuffer in the SHARED store so
    // both this pad and the Sequencer's matching track play it.
    const mqttPublish = window.useMqttPublish ? window.useMqttPublish() : null;
    
    const handleFile = async (index, file, meta) => {
        if (!file) return;
        try {
            const arrayBuf = await file.arrayBuffer();
            const ctx = window.oaAudioCtx();
            const audioBuf = await window.oaDecodeAudio(ctx, arrayBuf);
            window.oaSetDrumSample(index, audioBuf, { name: file.name, folder: (meta && meta.folder) || '' });
            setSampleNames((prev) => { const n = [...prev]; n[index] = file.name; return n; });
            publishSample(index, file.name, meta && meta.folder);
        } catch (e) {
            console.error('🛑 [Sampler] Could not decode audio:', e);
        }
    };

    // Position-sensitive velocity: centre of the pad = centerVelocity, the edge =
    // edgeVelocity, smooth radial falloff (normalized by the inscribed radius).
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

    // A pad was struck: compute velocity, store it, trigger the drum (sample or
    // synth) at a volume scaled by the velocity, notify.
    // Broadcast a hit so the Sequencer can record it (idx + velocity 0-100).
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
                semitones = (midiBase + explicitPadNum - 1) - entry.sampleRoot;
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

    // Pad <button> elements (so keyboard triggers can flash their glow) plus a
    // visibility gate so number-pad keys only fire when this Sampler is on screen.
    const padButtons = React.useRef([]);
    const rootRef = React.useRef(null);
    const visibleRef = React.useRef(false);

    // Restart the velocity glow on a pad element (bright → fades over sound length).
    const startGlow = (el, idx, i) => {
        if (!el) return;
        const entry = window.OA_DRUM_SAMPLES[idx];
        const durMs = (entry && entry.buffer) ? Math.max(120, Math.min(entry.buffer.duration * 1000, 5000)) : 180;
        el.style.setProperty('--gi', i);
        el.style.animation = 'none';
        void el.offsetWidth;            // reflow → restart on rapid hits
        el.style.animation = `oaPadGlow ${durMs}ms ease-out`;
    };

    // Trigger a pad at a given velocity (0-100), with a brief press + glow.
    // Shared by the number pad (100) and MIDI (mapped from note velocity).
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

    // ---- Web MIDI: map a connected controller's notes to the pads -----------
    const [midiBase, setMidiBase] = React.useState(36);   // MPC pads default to note 36
    const midiBaseRef = React.useRef(36); midiBaseRef.current = midiBase;
    React.useEffect(() => { window.OA_MIDI_BASE = midiBase; }, [midiBase]);   // shared with Pad Browser

    const { midiStatus, midiNote } = window.useMidiPads(midiBase, toneRootRef, padButtons, triggerPadAt, setVelocities);
    window.useKeyboardPads(triggerPadKey, visibleRef);

    // Glow a pad whenever the Sequencer plays that voice (intensity = step velocity).
    // Imperative only (no state) so 16th-note flashes don't churn React renders.
    React.useEffect(() => {
        const onPlay = (e) => {
            const idx = e.detail && e.detail.idx;
            if (idx == null) return;
            const el = padButtons.current[idx];
            if (!el) return;
            const i = Math.max(0, Math.min(1, (e.detail.velocity || 0) / 100));
            el.style.filter = `brightness(${0.9 + 0.5 * i})`;
            startGlow(el, idx, i);
            setTimeout(() => { if (el) el.style.filter = 'none'; }, 120);
        };
        window.addEventListener('oa-drum-play', onPlay);
        return () => window.removeEventListener('oa-drum-play', onPlay);
    }, []);

    // Esc cancels "Load to other pad" mode.
    React.useEffect(() => {
        if (!pendingAssign) return;
        const onEsc = (e) => { if (e.key === 'Escape') setPendingAssign(null); };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [pendingAssign]);

    return (
        <div ref={rootRef} style={{ padding: '25px', backgroundColor: 'rgba(18,18,18,0.28)', borderRadius: '4px', color: '#fff', border: '1px solid #333', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', boxSizing: 'border-box' }}>
            {/* Velocity glow: bright on strike (scaled by --gi), fades over the sound's length. */}
            <style>{`
                @keyframes oaPadGlow {
                    from {
                        box-shadow: 0 0 calc(12px + var(--gi, 0.5) * 48px) calc(3px + var(--gi, 0.5) * 16px) rgba(244, 144, 44, calc(0.5 + var(--gi, 0.5) * 0.5));
                    }
                    to {
                        box-shadow: 0 0 0 0 rgba(244, 144, 44, 0);
                    }
                }
            `}</style>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#ccc', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px', justifyContent: 'center', padding: '18px', background: '#0a0a0a', border: '1px solid #111', borderRadius: '8px' }}>
                {layout.map((padNum) => {
                    const idx = padNum - 1;
                    const name = (KIT[idx] && KIT[idx].name) || `Pad ${padNum}`;
                    const midiNote = midiBase + idx;   // MPC Chromatic C1: pad 1 = 36
                    const hasSample = !!(window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[idx] && window.OA_DRUM_SAMPLES[idx].buffer);
                    const remembered = kitMeta[idx];        // known from MQTT but not (yet) loaded
                    const vel = velocities[idx];            // side-car value (0-100)
                    
                    const isToneMode = toneRoot !== null;
                    const padNote = midiBase + padNum - 1;
                    const noteName = midiNoteName(padNote);

                    return (
                        <div key={padNum} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <window.Pad 
                                padNum={padNum} idx={idx} name={name} 
                                isToneMode={isToneMode} toneRoot={toneRoot} hasSample={hasSample} 
                                remembered={remembered} vel={vel} sampleNames={sampleNames}
                                midiNote={midiNote} noteName={noteName}
                                PadWave={window.PadWave}
                                setPadButtonRef={(el) => { padButtons.current[idx] = el; }}
                                onPointerDown={(e) => {
                                    if (e.ctrlKey) {
                                        e.preventDefault();
                                        const newRoot = toneRoot === idx ? null : idx;
                                        setToneRoot(newRoot);
                                        if (newRoot !== null && window.oaPrecacheTones) window.oaPrecacheTones(newRoot);
                                        window.dispatchEvent(new CustomEvent('oa-tone-mode', { detail: { rootIdx: newRoot } }));
                                        return;
                                    }
                                    if (pendingAssign) {
                                        e.preventDefault();
                                        handleFile(idx, pendingAssign.file, pendingAssign.meta);
                                        setPendingAssign(null);
                                        return;
                                    }
                                    if (e.altKey) {
                                        e.preventDefault();
                                        if (window.SoundBrowse) setBrowsePad(idx);
                                        else { const input = fileInputs.current[idx]; if (input) input.click(); }
                                        return;
                                    }
                                    const v = hitPad(e, idx, padNum);
                                    const i = v / 100;
                                    const el = e.currentTarget;
                                    el.style.transform = 'scale(0.95)';
                                    el.style.filter = `brightness(${0.9 + 0.7 * i})`;
                                    startGlow(el, idx, i);
                                }}
                                onPointerUp={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.filter = 'none';
                                }}
                                onPointerLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.filter = 'none';
                                }}
                                />
                            
                            {/* Hidden per-pad file input — only reachable via ALT+press */}
                            <input
                                ref={(el) => { fileInputs.current[idx] = el; }}
                                type="file"
                                accept="audio/*"
                                style={{ display: 'none' }}
                                onChange={(e) => handleFile(idx, e.target.files[0])}
                            />
                        </div>
                    );
                })}
            </div>

            {missingCount > 0 && (
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <button onClick={restoreSounds} title="Re-load the samples remembered on these pads (from MQTT) using the saved folder"
                        style={{ background: '#8ab4f8', color: '#111', border: 'none', borderRadius: '3px', padding: '5px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                        ↻ Restore {missingCount} sample{missingCount > 1 ? 's' : ''}{restoreMsg ? ` · ${restoreMsg}` : ''}
                    </button>
                </div>
            )}

            <div style={{ marginTop: '14px', fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                Velocity: centre {centerVelocity}% · edge {edgeVelocity}% (sets volume) · <b>ALT+click</b> to browse · <b>CTRL+click</b> for Tone Mode
            </div>

            {/* Web MIDI — map a connected controller's notes to the pads */}
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', fontSize: '11px', color: '#888' }}>
                <span>🎹 MIDI: <b style={{ color: (midiStatus && !/not supported|denied|No MIDI/i.test(midiStatus)) ? '#4caf50' : '#f55' }}>{midiStatus || 'connecting…'}</b></span>
                <span>· pad 1 = note <input type="number" value={midiBase} onChange={(e) => setMidiBase(Number(e.target.value))} title="MIDI note number that triggers pad 1 (pads are consecutive from here)" style={{ width: '50px', background: '#000', color: '#f4902c', border: '1px solid #444', textAlign: 'center', borderRadius: '3px' }} /></span>
                {midiNote != null && <span>· last note <b style={{ color: '#f4902c' }}>{midiNote}</b></span>}
            </div>

            {/* SETS — named snapshots of the whole kit */}
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sets</span>
                <select value={currentSet} onChange={(e) => loadSet(e.target.value)}
                    style={{ background: '#000', color: '#f4902c', border: '1px solid #444', borderRadius: '3px', padding: '4px 8px', fontSize: '12px', minWidth: '130px' }}>
                    <option value="">— select set —</option>
                    {Object.keys(sets).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <button onClick={newSet} title="Save the current kit as a new set"
                    style={{ background: '#388e3c', color: '#fff', border: 'none', borderRadius: '3px', padding: '5px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    + NEW set
                </button>
                {window.PadBrowse && (
                    <button onClick={() => setShowPadBrowse(true)} title="Browse a folder into all 16 pads at once"
                        style={{ background: '#8ab4f8', color: '#111', border: 'none', borderRadius: '3px', padding: '5px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                        🎛 Pad Browser
                    </button>
                )}
                {currentSet && (
                    <button onClick={() => deleteSet(currentSet)} title={`Delete "${currentSet}"`}
                        style={{ background: 'none', color: '#888', border: '1px solid #444', borderRadius: '3px', padding: '5px 8px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                )}
            </div>

            {browsePad != null && window.SoundBrowse && (
                <window.SoundBrowse
                    targetLabel={(KIT[browsePad] && KIT[browsePad].name) || `Pad ${browsePad + 1}`}
                    onClose={() => setBrowsePad(null)}
                    onChoose={(file, meta) => { handleFile(browsePad, file, meta); setBrowsePad(null); }}
                    onChooseOther={(file, meta) => { setBrowsePad(null); setPendingAssign({ file, meta }); }}
                />
            )}

            {showPadBrowse && window.PadBrowse && (
                <window.PadBrowse onClose={() => setShowPadBrowse(false)} />
            )}

            {pendingAssign && (
                <div style={{ position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: '#8ab4f8', color: '#111', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
                    👆 Click a pad to assign "{pendingAssign.meta && pendingAssign.meta.name}" — Esc to cancel
                </div>
            )}
        </div>
    );
};
window.Sampler = Sampler;
