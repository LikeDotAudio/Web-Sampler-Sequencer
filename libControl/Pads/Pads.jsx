const loadDrumSets = () => { try { return JSON.parse(window.localStorage.getItem('oaDrumSets')) || {}; } catch (e) { return {}; } };
const midiNoteName = window.midiNoteName;
const PadWave = window.PadWave;
const Pads = ({ label = "Drum Pads", centerVelocity = 100, edgeVelocity = 10, onHit = null }) => {
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
    const { 
        toneRoot, setToneRoot, toneRootRef, velocities, setVelocities, browsePad, setBrowsePad,
        pendingAssign, setPendingAssign, showPadBrowse, setShowPadBrowse, midiBase, setMidiBase, midiBaseRef,
        kitMeta, restoreMsg, missingCount, restoreSounds, handleFile, publishSample
    } = window.useSamplerState(setSampleNames);
    const { sets, currentSet, newSet, deleteSet, loadSet } = window.useSamplerSets(setSampleNames, publishSample);
    const padButtons = React.useRef([]);
    const fileInputs = React.useRef([]);
    const rootRef = React.useRef(null);
    const [midiConfigOpen, setMidiConfigOpen] = React.useState(false);

    const { hitPad, startGlow, triggerPadAt, triggerPadKey } = window.useSamplerPads(
        centerVelocity, edgeVelocity, onHit, toneRoot, midiBaseRef, 
        setVelocities, setToneRoot, padButtons
    );
    const layout = [13, 14, 15, 16, 9, 10, 11, 12, 5, 6, 7, 8, 1, 2, 3, 4];
    const { midiStatus, midiNote } = window.useMidiPads(midiBase, toneRootRef, padButtons, triggerPadAt, setVelocities);
    window.useKeyboardPads(triggerPadKey);
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
        <div ref={rootRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' }}>
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
            <div style={{ width: '100%', maxWidth: '800px', display: 'grid', gridTemplateColumns: 'repeat(4, max-content)', gap: '8px', justifyContent: 'center' }}>
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
                                        if (window.SoundBrowser) setBrowsePad(idx);
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
                        style={{ background: '#fca858', color: '#111', border: 'none', borderRadius: '3px', padding: '5px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                        ↻ Restore {missingCount} sample{missingCount > 1 ? 's' : ''}{restoreMsg ? ` · ${restoreMsg}` : ''}
                    </button>
                </div>
            )}
            <div style={{ marginTop: '14px', fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                Velocity: centre {centerVelocity}% · edge {edgeVelocity}% (sets volume) · <b>ALT+click</b> to browse · <b>CTRL+click</b> for Tone Mode
            </div>
            {/* Web MIDI — map a connected controller's notes to the pads */}
            {document.getElementById('midi-footer-slot') && ReactDOM.createPortal(
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                    <button 
                        onClick={() => setMidiConfigOpen(!midiConfigOpen)}
                        style={{ background: midiConfigOpen ? '#333' : 'transparent', color: midiConfigOpen ? '#fff' : '#888', border: '1px solid #444', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                    >
                        {midiConfigOpen ? "✖ Close" : "🎹 MIDI"}
                    </button>
                    {midiConfigOpen && (
                        <div style={{
                            position: 'absolute',
                            bottom: '36px',
                            right: '0',
                            background: 'var(--panel)',
                            padding: '12px',
                            border: '1px solid #444',
                            borderRadius: '8px',
                            boxShadow: '0 -4px 16px rgba(0,0,0,0.6)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            zIndex: 1000,
                            minWidth: '180px'
                        }}>
                            <span style={{ fontSize: '11px', color: '#ccc' }}>
                                Status: <b style={{ color: (midiStatus && !/not supported|denied|No MIDI/i.test(midiStatus)) ? '#4caf50' : '#f55' }}>{midiStatus || 'connecting…'}</b>
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '11px', color: '#888' }}>Pad 1 Note:</span>
                                <input type="number" value={midiBase} onChange={(e) => setMidiBase(Number(e.target.value))} title="MIDI note number that triggers pad 1" style={{ width: '50px', background: '#000', color: '#f4902c', border: '1px solid #444', textAlign: 'center', borderRadius: '3px', fontSize: '11px' }} />
                            </div>
                            {midiNote != null && <span style={{ fontSize: '11px', color: '#888' }}>Last Note: <b style={{ color: '#f4902c' }}>{midiNote}</b></span>}
                        </div>
                    )}
                </div>,
                document.getElementById('midi-footer-slot')
            )}
            {/* SETS — named snapshots of the whole kit */}
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '4px' }}>Sets:</span>
                {Object.keys(sets).map((n) => (
                    <button key={n} onClick={() => loadSet(n)} 
                        style={{
                            background: currentSet === n ? '#f4902c' : '#222',
                            color: currentSet === n ? '#111' : '#ccc',
                            border: '1px solid #444',
                            borderRadius: '3px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: currentSet === n ? 'bold' : 'normal'
                        }}>
                        {n}
                    </button>
                ))}
                <button onClick={newSet} title="Save the current kit as a new set"
                    style={{ background: '#388e3c', color: '#fff', border: 'none', borderRadius: '3px', padding: '5px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    + NEW set
                </button>
                {window.PadBrowse && (
                    <button onClick={() => setShowPadBrowse(true)} title="Browse a folder into all 16 pads at once"
                        style={{ background: '#fca858', color: '#111', border: 'none', borderRadius: '3px', padding: '5px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                        🎛 Pad Browser
                    </button>
                )}
                {currentSet && (
                    <button onClick={() => deleteSet(currentSet)} title={`Delete "${currentSet}"`}
                        style={{ background: 'none', color: '#888', border: '1px solid #444', borderRadius: '3px', padding: '5px 8px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                )}
            </div>
            {browsePad != null && window.SoundBrowser && (
                <window.SoundBrowser
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
                <div style={{ position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: '#fca858', color: '#111', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
                    👆 Click a pad to assign "{pendingAssign.meta && pendingAssign.meta.name}" — Esc to cancel
                </div>
            )}
        </div>
    );
};
window.Pads = Pads;
