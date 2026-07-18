const SvgKnob = window.SvgKnob;
const SvgFader = window.SvgFader;

const Mixer = () => {
    const { trackVol, setTrackVol, trackPan, setTrackPan, mutes, toggleMute, solos, toggleSolo, clearSolos, masterVol, setMasterVol, clickVol, setClickVol, recording } = window.useSeqState('Pattern Sequencer', 16, window.OA_DRUM_KIT || []);
    const tracks = window.OA_DRUM_KIT || [];

    const PALETTE = ["#f4902c", "#f7a048", "#f08018", "#f4902c", "#faa552", "#e67300",
                     "#f4902c", "#f28b22", "#f79b39", "#f4902c", "#e0750d", "#fca858",
                     "#f4902c", "#f59638", "#eb8117", "#f4902c"];

    const isAnySolo = solos.some(v => v);

    const meterRefs = React.useRef([]);
    const clickMeterRef = React.useRef(null);

    // Which channel's SYNTH panel is open, and a re-render when samples change
    // so a channel that just got a sample loses its SYNTH button.
    const [synthPad, setSynthPad] = React.useState(null);
    const [, forceSamples] = React.useReducer((n) => n + 1, 0);
    React.useEffect(() => {
        const onSample = () => forceSamples();
        window.addEventListener('oa-sample-changed', onSample);
        return () => window.removeEventListener('oa-sample-changed', onSample);
    }, []);
    const hasSample = (i) => !!(window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[i] && window.OA_DRUM_SAMPLES[i].buffer);
    const masterRefs = React.useRef([null, null]);
    const masterPeaks = React.useRef({ L: 0, R: 0, pending: false });
    
    const stateRef = React.useRef({ trackVol, mutes, solos, isAnySolo, trackPan });
    React.useEffect(() => {
        stateRef.current = { trackVol, mutes, solos, isAnySolo, trackPan };
    }, [trackVol, mutes, solos, isAnySolo, trackPan]);

    React.useEffect(() => {
        // The meters follow every voice trigger, wherever it came from:
        //   oa-drum-play — sequencer steps
        //   oa-drum-hit  — pad strikes (mouse, keyboard, MIDI)
        //   oa-tone-hit  — tone-mode strikes, metered on their root track
        const onPlay = (e) => {
            const d = e.detail || {};
            const idx = d.idx != null ? d.idx : d.rootIdx;
            if (idx == null) return;
            const el = meterRefs.current[idx];
            if (!el) return;
            
            const { trackVol: tVol, mutes: tMutes, solos: tSolos, isAnySolo: tAnySolo } = stateRef.current;
            const vol = tVol[idx] == null ? 1 : tVol[idx];
            
            if (tMutes[idx] || (tAnySolo && !tSolos[idx]) || vol === 0) return;
            
            const i = Math.max(0, Math.min(1, ((e.detail.velocity || 0) / 100) * vol));
            const targetHeight = (1 - i) * 100;
            
            el.style.transition = 'none';
            el.style.height = `${targetHeight}%`;
            
            // 1. Animate Individual Track Meter
            el.style.transition = 'none';
            el.style.height = `${targetHeight}%`;
            void el.offsetHeight;
            el.style.transition = 'height 0.3s cubic-bezier(0.2, 1, 0.3, 1)';
            el.style.height = '100%';
            
            // 2. Accumulate Master Meter Peaks
            const tPan = stateRef.current.trackPan[idx] || 0;
            // Simple equal power panning approximation
            const lFactor = Math.cos((tPan + 1) * Math.PI / 4);
            const rFactor = Math.sin((tPan + 1) * Math.PI / 4);
            const hitVol = ((e.detail.velocity || 0) / 100) * vol;
            
            masterPeaks.current.L = Math.min(1.05, masterPeaks.current.L + hitVol * lFactor * 0.9);
            masterPeaks.current.R = Math.min(1.05, masterPeaks.current.R + hitVol * rFactor * 0.9);
            
            if (!masterPeaks.current.pending) {
                masterPeaks.current.pending = true;
                requestAnimationFrame(() => {
                    [masterRefs.current[0], masterRefs.current[1]].forEach((mel, c) => {
                        if (!mel) return;
                        const peak = c === 0 ? masterPeaks.current.L : masterPeaks.current.R;
                        const mTarget = Math.max(0, (1 - peak) * 100);
                        mel.style.transition = 'none';
                        mel.style.height = `${mTarget}%`;
                        void mel.offsetHeight;
                        mel.style.transition = 'height 0.4s cubic-bezier(0.2, 1, 0.3, 1)';
                        mel.style.height = '100%';
                    });
                    masterPeaks.current = { L: 0, R: 0, pending: false };
                });
            }
        };
        // The click track gets its own meter — it bypasses the track strips entirely.
        const onClick = (e) => {
            const el = clickMeterRef.current;
            if (!el) return;
            const i = Math.max(0, Math.min(1, ((e.detail && e.detail.velocity) || 0) / 100));
            el.style.transition = 'none';
            el.style.height = `${(1 - i) * 100}%`;
            void el.offsetHeight;
            el.style.transition = 'height 0.3s cubic-bezier(0.2, 1, 0.3, 1)';
            el.style.height = '100%';
        };

        const EVENTS = ['oa-drum-play', 'oa-drum-hit', 'oa-tone-hit'];
        EVENTS.forEach(name => window.addEventListener(name, onPlay));
        window.addEventListener('oa-click', onClick);
        return () => {
            EVENTS.forEach(name => window.removeEventListener(name, onPlay));
            window.removeEventListener('oa-click', onClick);
        };
    }, []);

    const panLabel = v => Math.abs(v) < 0.02 ? "C" : (v < 0 ? "L" + Math.round(-v * 100) : "R" + Math.round(v * 100));


    return (
        <div className="chunky-scrollbar" style={{ display: 'flex', gap: 0, padding: 0, overflowX: 'auto', alignItems: 'stretch', justifyContent: 'safe center', backgroundColor: 'var(--bg)' }}>
            {tracks.map((track, i) => {
                const color = PALETTE[i % PALETTE.length];
                const isMuted = mutes[i];
                const isSolo = solos[i];
                const vol = trackVol[i] == null ? 1 : trackVol[i];
                const pan = trackPan[i] || 0;

                // If solos are active, mute non-soloed tracks locally in UI (fader opacity)
                const mutedBySolo = isAnySolo && !isSolo;

                return (
                    <div key={i} style={{
                        // Strips butt up against each other — a single rule line is the only separator.
                        background: 'var(--strip)', border: 'none', borderRight: '1px solid #3a3f49', borderRadius: 0,
                        width: '74px', flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '0 3px 8px', overflow: 'hidden'
                    }}>
                        
                        {/* The channel name IS the ON button — lit means the track is live. Solo sits under it. */}
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '3px', marginTop: '6px', marginBottom: '8px' }}>
                            <button
                                onClick={() => toggleMute(i)}
                                title={`${track.name || 'Track'} — click to ${isMuted ? 'unmute' : 'mute'}`}
                                style={{
                                    width: '100%', minWidth: 0, padding: '3px 2px', textAlign: 'center', borderRadius: '4px',
                                    border: `1px solid ${!isMuted ? 'var(--on)' : '#444b57'}`,
                                    background: !isMuted ? '#6b3f14' : '#353b45',
                                    cursor: 'pointer', fontSize: '9px', fontWeight: '700',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                                    overflow: 'hidden'
                                }}
                            >
                                <span style={{ color: !isMuted ? color : 'var(--muted)' }}>{String(i + 1).padStart(2, '0')}</span>
                                <span style={{ color: !isMuted ? '#ffe9d4' : 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name || 'Track'}</span>
                            </button>
                            <button
                                onClick={() => toggleSolo(i)}
                                style={{
                                    width: '100%', padding: '3px 0', textAlign: 'center', borderRadius: '4px',
                                    border: `1px solid ${isSolo ? 'var(--solo)' : '#444b57'}`,
                                    background: isSolo ? '#6b5014' : '#353b45',
                                    color: isSolo ? '#fff3c4' : 'var(--muted)',
                                    cursor: 'pointer', fontSize: '9px', fontWeight: '600'
                                }}
                            >
                                S
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '4px', alignItems: 'stretch', height: '180px', opacity: mutedBySolo ? 0.4 : 1, transition: 'opacity 0.2s', width: '100%', justifyContent: 'center', marginBottom: '6px' }}>
                            <div style={{
                                width: '6px', borderRadius: '2px', position: 'relative', overflow: 'hidden', border: '1px solid #0008',
                                background: 'linear-gradient(to top, #c26915 0%, #e87b10 74%, #f4902c 78%, #f7a048 88%, #ffb44d 93%, #ffd494 100%)'
                            }}>
                                <i ref={el => meterRefs.current[i] = el} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%', background: '#15171b' }}></i>
                            </div>
                            <SvgFader 
                                value={vol} color={color} width={36} height={180} 
                                onChange={(v) => setTrackVol((prev) => { const n = [...prev]; n[i] = v; return n; })}
                            />
                        </div>

                        {/* No sample loaded means this voice is synthesized — let them shape it. */}
                        {!hasSample(i) && (
                            <button
                                onClick={() => setSynthPad(synthPad === i ? null : i)}
                                title={`Edit the ${track.name || 'Track'} synth voice`}
                                style={{
                                    width: '100%', padding: '3px 0', textAlign: 'center', borderRadius: '4px',
                                    border: `1px solid ${synthPad === i ? '#f4902c' : '#444b57'}`,
                                    background: synthPad === i ? '#6b3f14' : '#2a2f38',
                                    color: synthPad === i ? '#ffe9d4' : '#9aa3ae',
                                    cursor: 'pointer', fontSize: '9px', fontWeight: '700', letterSpacing: '.5px',
                                    marginBottom: '4px'
                                }}
                            >
                                SYNTH
                            </button>
                        )}

                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <SvgKnob
                                value={pan} min={-1} max={1} defaultVal={0} bipolar={true} color={color} size={32} 
                                onChange={(v) => setTrackPan((pprev) => { const n = [...pprev]; n[i] = v; return n; })}
                            />
                            <div style={{ fontSize: '8px', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{panLabel(pan)}</div>
                        </div>

                    </div>
                );
            })}

            {/* Click Strip */}
            <div style={{
                background: 'var(--strip)', border: 'none', borderRight: '1px solid #3a3f49', borderRadius: 0,
                width: '60px', flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '8px 3px 8px', gap: '8px',
                boxShadow: recording ? '0 0 10px rgba(211,47,47,0.5)' : 'none'
            }}>
                <div style={{ fontSize: '10px', color: recording ? '#ff8a80' : '#aaa', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', fontWeight: recording ? 'bold' : 'normal' }}>Click</div>
                
                <div style={{ display: 'flex', gap: '4px', alignItems: 'stretch', height: '180px', justifyContent: 'center' }}>
                    <div style={{
                        width: '6px', borderRadius: '2px', position: 'relative', overflow: 'hidden', border: '1px solid #0008',
                        background: 'linear-gradient(to top, #8a8a8a 0%, #c9c9c9 74%, #e0e0e0 88%, #fff 100%)'
                    }}>
                        <i ref={clickMeterRef} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%', background: '#15171b' }}></i>
                    </div>
                    <SvgFader value={clickVol} color={recording ? "#d32f2f" : "#aaa"} width={36} height={180} onChange={(v) => setClickVol(v)} />
                </div>
                
                <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: '700', fontVariantNumeric: 'tabular-nums', marginTop: '23px' }}>{Math.round(clickVol * 100)}</div>
            </div>

            {/* Master Strip */}
            <div style={{
                background: 'var(--strip)', border: 'none', borderRadius: 0,
                width: '64px', flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '8px 3px 8px', gap: '8px'
            }}>
                <div style={{ fontSize: '10px', color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Master</div>
                
                <div style={{ display: 'flex', gap: '4px', alignItems: 'stretch', height: '180px' }}>
                    {/* L Meter */}
                    <div style={{
                        width: '6px', borderRadius: '2px', position: 'relative', overflow: 'hidden', border: '1px solid #0008',
                        background: 'linear-gradient(to top, #c26915 0%, #e87b10 74%, #f4902c 78%, #f7a048 88%, #ffb44d 93%, #ffd494 100%)'
                    }}>
                        <i ref={el => masterRefs.current[0] = el} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%', background: '#15171b', transition: 'height 0.05s linear' }}></i>
                    </div>
                    {/* Master Fader */}
                    <SvgFader value={masterVol} color="#aaa" width={36} height={180} onChange={(v) => setMasterVol(v)} />
                    {/* R Meter */}
                    <div style={{
                        width: '6px', borderRadius: '2px', position: 'relative', overflow: 'hidden', border: '1px solid #0008',
                        background: 'linear-gradient(to top, #c26915 0%, #e87b10 74%, #f4902c 78%, #f7a048 88%, #ffb44d 93%, #ffd494 100%)'
                    }}>
                        <i ref={el => masterRefs.current[1] = el} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%', background: '#15171b', transition: 'height 0.05s linear' }}></i>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '22px', fontSize: '9px', color: '#777' }}>
                    <span>L</span><span>R</span>
                </div>

                <button 
                    onClick={clearSolos}
                    style={{
                        width: '56px', padding: '5px 0', textAlign: 'center', borderRadius: '5px',
                        border: `1px solid ${isAnySolo ? '#fff3c4' : '#5a4a14'}`,
                        background: isAnySolo ? 'var(--solo)' : '#2a2a2a',
                        color: isAnySolo ? '#3a2c00' : '#6a6a6a',
                        cursor: 'pointer', fontSize: '10px', fontWeight: '700', letterSpacing: '.5px', opacity: isAnySolo ? 1 : 0.5
                    }}
                >
                    SOLO
                </button>
                <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>OUT</div>
            </div>

            {synthPad != null && window.DrumSynthEditor && ReactDOM.createPortal(
                <window.DrumSynthEditor
                    idx={synthPad}
                    name={(tracks[synthPad] && tracks[synthPad].name) || `Track ${synthPad + 1}`}
                    onClose={() => setSynthPad(null)}
                />,
                document.body
            )}
        </div>
    );
};

window.Mixer = Mixer;
