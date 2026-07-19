// Hz <-> MIDI note. A440, and midiNoteName's octave numbering (C3 = 60) so a
// pitch reads the same here as it does on a pad.
const hzToMidi = (hz) => 69 + 12 * Math.log2(Math.max(1e-6, hz) / 440);
const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// The chromatic partner to a Hz slider. Same underlying value, stepped in
// semitones — snappy where the Hz fader is granular. Its range is clamped to
// whole semitones inside the parameter's own min/max so it can never push the
// value out of bounds.
const NoteFader = ({ spec, value, onChange, audition }) => {
    const lo = Math.ceil(hzToMidi(spec.min));
    const hi = Math.floor(hzToMidi(spec.max));
    if (hi <= lo) return null;                       // too narrow to be a scale
    const midi = hzToMidi(value);
    // Round for display so a Hz nudge does not show a fractional note, but keep
    // the slider on the true position — otherwise it jumps under the cursor.
    const nearest = Math.round(midi);
    const inTune = Math.abs(midi - nearest) < 0.005;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '9px', color: '#666', minWidth: '78px', textAlign: 'right', paddingRight: '2px' }}>
                note
            </span>
            <input
                type="range" min={lo} max={hi} step={1}
                value={Math.min(hi, Math.max(lo, nearest))}
                onChange={(e) => onChange(midiToHz(Number(e.target.value)))}
                onMouseUp={audition}
                style={{ flex: 1, minWidth: '70px', accentColor: '#4fc3f7', cursor: 'pointer' }}
            />
            <span style={{
                fontSize: '10px', minWidth: '54px', textAlign: 'right',
                color: inTune ? '#4fc3f7' : '#5a7d8c', fontVariantNumeric: 'tabular-nums'
            }}>
                {window.midiNoteName ? window.midiNoteName(nearest) : nearest}
                {!inTune ? <span style={{ color: '#666', fontSize: '9px' }}> ~</span> : null}
            </span>
        </div>
    );
};

// The SYNTH panel for one mixer channel. Every control is generated from the
// engine's parameter schema, so adding a knob to an engine adds it here too.
window.DrumSynthEditor = ({ idx, name, onClose }) => {
    const [, force] = React.useReducer((n) => n + 1, 0);
    React.useEffect(() => {
        const onChange = (e) => { if (e.detail && e.detail.idx === idx) force(); };
        window.addEventListener('oa-synth-changed', onChange);
        return () => window.removeEventListener('oa-synth-changed', onChange);
    }, [idx]);

    // Every edit writes straight through to the live patch and localStorage, so
    // the only way back is a copy taken before any of it happened. Re-taken when
    // the panel switches voice, not on every render.
    const opened = React.useRef(null);
    React.useEffect(() => {
        opened.current = window.oaSynthPatch(window.OA_DRUM_SYNTH[idx]);
    }, [idx]);

    const abort = () => {
        if (!opened.current) return;
        window.oaSetSynthPatch(idx, opened.current);
    };

    const patch = window.oaSynthPatch(window.OA_DRUM_SYNTH[idx]);
    const engine = window.OA_SYNTH_ENGINES[patch.engine];
    if (!engine) return null;

    const dirty = !!opened.current && JSON.stringify(opened.current) !== JSON.stringify(patch);

    const set = (key, value) => window.oaSetSynthParam(idx, key, value);
    const audition = () => window.oaTriggerDrum(idx, 0.9);

    const label = { fontSize: '10px', color: '#aaa', letterSpacing: '0.3px' };
    const value = { fontSize: '10px', color: '#f4902c', fontVariantNumeric: 'tabular-nums' };

    return (
        <div style={{
            position: 'fixed', bottom: '46px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--panel)', border: '1px solid #444', borderRadius: '8px',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.7)', zIndex: 1200,
            padding: '14px 16px', width: 'min(560px, 92vw)', maxHeight: '70vh', overflowY: 'auto'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: '#f4902c', fontWeight: 'bold', letterSpacing: '1px' }}>
                    {String(idx + 1).padStart(2, '0')} {name} — SYNTH
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <window.SeqButton label="▶ Audition" onClick={audition} color="#388e3c" textColor="#fff"
                        style={{ padding: '4px 10px', border: 'none' }} />
                    <window.SeqButton label="⟲ Abort" onClick={abort} disabled={!dirty}
                        color={dirty ? '#b71c1c' : undefined} textColor={dirty ? '#fff' : undefined}
                        title="Discard every change made since this panel was opened"
                        style={{ padding: '4px 10px', border: 'none' }} />
                    <window.SeqButton label="↺ Reset" onClick={() => window.oaResetSynthPatch(idx)}
                        title="Back to the factory patch for this voice"
                        style={{ padding: '4px 10px' }} />
                    <window.SeqButton label="✖ Close" onClick={onClose} style={{ padding: '4px 10px' }} />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0' }}>
                <span style={label}>Engine</span>
                <select
                    value={patch.engine}
                    onChange={(e) => set('engine', e.target.value)}
                    style={{ background: '#222', color: '#f4902c', border: '1px solid #444', borderRadius: '3px', fontSize: '11px', padding: '3px 6px' }}
                >
                    {Object.keys(window.OA_SYNTH_ENGINES).map((k) => (
                        <option key={k} value={k}>{window.OA_SYNTH_ENGINES[k].label}</option>
                    ))}
                </select>
                <span style={{ fontSize: '10px', color: '#777', fontStyle: 'italic' }}>{engine.blurb}</span>
            </div>

            {/* One parameter per row, always — a two-column grid put a knob's
                Hz and note faders side by side with an unrelated control. */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {Object.keys(engine.params).map((key) => {
                    const spec = engine.params[key];
                    const v = patch[key];
                    if (spec.options) {
                        return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ ...label, minWidth: '78px' }}>{spec.label}</span>
                                <select
                                    value={v}
                                    onChange={(e) => set(key, e.target.value)}
                                    style={{ flex: 1, background: '#222', color: '#ccc', border: '1px solid #444', borderRadius: '3px', fontSize: '11px', padding: '2px 4px' }}
                                >
                                    {spec.options.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        );
                    }
                    return (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ ...label, minWidth: '78px' }}>{spec.label}</span>
                                <input
                                    type="range" min={spec.min} max={spec.max} step={spec.step} value={v}
                                    onChange={(e) => set(key, Number(e.target.value))}
                                    onMouseUp={audition}
                                    style={{ flex: 1, minWidth: '70px', accentColor: '#f4902c', cursor: 'pointer' }}
                                />
                                <span style={{ ...value, minWidth: '54px', textAlign: 'right' }}>
                                    {spec.step < 1 ? Number(v).toFixed(2) : Math.round(v)}
                                    {spec.unit ? <span style={{ color: '#777', fontSize: '9px' }}> {spec.unit}</span> : null}
                                </span>
                            </div>
                            {spec.unit === 'Hz' && (
                                <NoteFader spec={spec} value={v} onChange={(hz) => set(key, hz)} audition={audition} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
