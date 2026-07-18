// The SYNTH panel for one mixer channel. Every control is generated from the
// engine's parameter schema, so adding a knob to an engine adds it here too.
window.DrumSynthEditor = ({ idx, name, onClose }) => {
    const [, force] = React.useReducer((n) => n + 1, 0);
    React.useEffect(() => {
        const onChange = (e) => { if (e.detail && e.detail.idx === idx) force(); };
        window.addEventListener('oa-synth-changed', onChange);
        return () => window.removeEventListener('oa-synth-changed', onChange);
    }, [idx]);

    const patch = window.oaSynthPatch(window.OA_DRUM_SYNTH[idx]);
    const engine = window.OA_SYNTH_ENGINES[patch.engine];
    if (!engine) return null;

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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '8px 18px' }}>
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
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    );
                })}
            </div>
        </div>
    );
};
