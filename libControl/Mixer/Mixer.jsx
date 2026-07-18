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
    const masterRefs = React.useRef([null, null]);
    const masterPeaks = React.useRef({ L: 0, R: 0, pending: false });
    
    const stateRef = React.useRef({ trackVol, mutes, solos, isAnySolo, trackPan });
    React.useEffect(() => {
        stateRef.current = { trackVol, mutes, solos, isAnySolo, trackPan };
    }, [trackVol, mutes, solos, isAnySolo, trackPan]);

    React.useEffect(() => {
        const onPlay = (e) => {
            const idx = e.detail && e.detail.idx;
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
        window.addEventListener('oa-drum-play', onPlay);
        return () => window.removeEventListener('oa-drum-play', onPlay);
    }, []);

    const panLabel = v => Math.abs(v) < 0.02 ? "C" : (v < 0 ? "L" + Math.round(-v * 100) : "R" + Math.round(v * 100));


    return (
        <div className="chunky-scrollbar" style={{ display: 'flex', gap: '6px', padding: '16px', overflowX: 'auto', alignItems: 'stretch', backgroundColor: 'var(--bg)' }}>
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
                        background: 'var(--strip)', border: `1px solid ${color}`, borderRadius: '6px',
                        width: '60px', flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '0 5px 8px', overflow: 'hidden'
                    }}>
                        
                        <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: '3px', marginTop: '6px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '10px', color: color, fontWeight: '700' }}>{String(i + 1).padStart(2, '0')}:</span>
                            <span style={{ fontSize: '10px', color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name || 'Track'}</span>
                        </div>

                        <div style={{ display: 'flex', width: '100%', gap: '4px', marginBottom: '8px' }}>
                            <button 
                                onClick={() => toggleMute(i)}
                                style={{
                                    flex: 1, padding: '3px 0', textAlign: 'center', borderRadius: '4px',
                                    border: `1px solid ${!isMuted ? 'var(--on)' : '#444b57'}`,
                                    background: !isMuted ? '#6b3f14' : '#353b45',
                                    color: !isMuted ? '#ffe9d4' : 'var(--muted)',
                                    cursor: 'pointer', fontSize: '9px', fontWeight: '600', letterSpacing: '.5px'
                                }}
                            >
                                ON
                            </button>
                            <button 
                                onClick={() => toggleSolo(i)}
                                style={{
                                    width: '18px', padding: '3px 0', textAlign: 'center', borderRadius: '4px',
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
                background: 'var(--strip)', border: recording ? '1px solid #d32f2f' : '1px solid #555', borderRadius: '6px',
                width: '60px', flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '8px 5px 8px', gap: '8px',
                boxShadow: recording ? '0 0 10px rgba(211,47,47,0.5)' : 'none'
            }}>
                <div style={{ fontSize: '10px', color: recording ? '#ff8a80' : '#aaa', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px', fontWeight: recording ? 'bold' : 'normal' }}>Click</div>
                
                <div style={{ display: 'flex', gap: '4px', alignItems: 'stretch', height: '180px', justifyContent: 'center' }}>
                    <SvgFader value={clickVol} color={recording ? "#d32f2f" : "#aaa"} width={36} height={180} onChange={(v) => setClickVol(v)} />
                </div>
                
                <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: '700', fontVariantNumeric: 'tabular-nums', marginTop: '23px' }}>{Math.round(clickVol * 100)}</div>
            </div>

            {/* Master Strip */}
            <div style={{
                background: 'var(--strip)', border: `1px solid #555`, borderRadius: '6px',
                width: '64px', flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '8px 5px 8px', gap: '8px'
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
        </div>
    );
};

window.Mixer = Mixer;
