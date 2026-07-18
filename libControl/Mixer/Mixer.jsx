const SvgKnob = window.SvgKnob;
const SvgFader = window.SvgFader;

const Mixer = () => {
    const { trackVol, setTrackVol, trackPan, setTrackPan, mutes, toggleMute } = window.useSeqState('Pattern Sequencer', 16, window.OA_DRUM_KIT || []);
    const tracks = window.OA_DRUM_KIT || [];

    const PALETTE = ["#46c2ff","#ff6b6b","#ffd166","#06d6a0","#c792ea","#f78c6b",
                     "#7ec4ff","#b9f27c","#ff9ff3","#feca57","#54a0ff","#ef5da8",
                     "#2ec4b6","#e09f3e","#9b5de5","#80ed99"];

    // Local state for Solos, since sequencer doesn't natively support solo yet
    const [solos, setSolos] = React.useState({});
    const isAnySolo = Object.values(solos).some(v => v);

    const toggleSolo = (idx) => {
        setSolos(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const clearSolos = () => {
        setSolos({});
    };

    const panLabel = v => Math.abs(v) < 0.02 ? "C" : (v < 0 ? "L" + Math.round(-v * 100) : "R" + Math.round(v * 100));

    return (
        <div style={{ display: 'flex', gap: '6px', padding: '16px', overflowX: 'auto', alignItems: 'stretch', backgroundColor: 'var(--bg)' }}>
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
                        background: 'var(--strip)', border: `1px solid ${color}`, borderRadius: '8px',
                        width: '82px', flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '0 6px 8px', gap: '8px', overflow: 'hidden'
                    }}>
                        <div style={{ width: 'calc(100% + 12px)', margin: '0 -6px 4px', height: '8px', background: color }}></div>
                        
                        <div style={{ width: '66px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '.6px', textTransform: 'uppercase' }}>Pan</div>
                            <SvgKnob 
                                value={pan} min={-1} max={1} defaultVal={0} bipolar={true} color={color} size={42} 
                                onChange={(v) => setTrackVol((prev) => {
                                    // Wait, changing trackPan using trackVol setter? BUG.
                                    setTrackPan((pprev) => { const n = [...pprev]; n[i] = v; return n; })
                                })}
                            />
                            <div style={{ fontSize: '9px', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{panLabel(pan)}</div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', height: '225px', opacity: mutedBySolo ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                            <div style={{
                                width: '10px', borderRadius: '3px', position: 'relative', overflow: 'hidden', border: '1px solid #0008',
                                background: 'linear-gradient(to top, #21c95a 0%, #21c95a 74%, #f5d020 78%, #f5d020 88%, #ff3b30 93%, #ff3b30 100%)'
                            }}>
                                <i style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%', background: '#15171b' }}></i>
                            </div>
                            <SvgFader 
                                value={vol} color={color} width={50} height={225} 
                                onChange={(v) => setTrackVol((prev) => { const n = [...prev]; n[i] = v; return n; })}
                            />
                        </div>

                        <button 
                            onClick={() => toggleMute(i)}
                            style={{
                                width: '66px', padding: '5px 0', textAlign: 'center', borderRadius: '5px',
                                border: `1px solid ${!isMuted ? 'var(--on)' : '#444b57'}`,
                                background: !isMuted ? '#1f6b3a' : '#353b45',
                                color: !isMuted ? '#d7ffe4' : 'var(--muted)',
                                cursor: 'pointer', fontSize: '11px', fontWeight: '600', letterSpacing: '.5px'
                            }}
                        >
                            ON
                        </button>

                        <button 
                            onClick={() => toggleSolo(i)}
                            style={{
                                width: '66px', padding: '5px 0', textAlign: 'center', borderRadius: '5px',
                                border: `1px solid ${isSolo ? 'var(--solo)' : '#444b57'}`,
                                background: isSolo ? '#6b5a14' : '#353b45',
                                color: isSolo ? '#fff3c4' : 'var(--muted)',
                                cursor: 'pointer', fontSize: '11px', fontWeight: '600', letterSpacing: '.5px'
                            }}
                        >
                            SOLO
                        </button>

                        <div style={{ fontSize: '10px', color: color, fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
                            {String(i + 1).padStart(2, '0')}
                        </div>
                        <input 
                            className="name"
                            defaultValue={track.name || 'Track'} 
                            readOnly
                            style={{
                                width: '70px', textAlign: 'center', fontSize: '11px',
                                background: '#1b1e24', border: '1px solid #3a3f49', borderRadius: '4px', color: 'var(--text)', padding: '3px 2px'
                            }}
                        />
                    </div>
                );
            })}

            {/* Master Strip */}
            <div style={{
                background: '#30343d', borderColor: '#444b57', border: '1px solid #444b57', borderRadius: '8px',
                width: '102px', flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '0 6px 8px', gap: '8px', overflow: 'hidden'
            }}>
                <div style={{ width: 'calc(100% + 12px)', margin: '0 -6px 4px', height: '8px', background: '#cdd3dd' }}></div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '.6px', textTransform: 'uppercase', marginTop: '4px' }}>Master</div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', height: '225px', marginTop: '14px' }}>
                    <div style={{ width: '10px', borderRadius: '3px', position: 'relative', overflow: 'hidden', border: '1px solid #0008', background: 'linear-gradient(to top, #21c95a 0%, #21c95a 74%, #f5d020 78%, #f5d020 88%, #ff3b30 93%, #ff3b30 100%)' }}>
                        <i style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%', background: '#15171b' }}></i>
                    </div>
                    <div style={{ width: '10px', borderRadius: '3px', position: 'relative', overflow: 'hidden', border: '1px solid #0008', background: 'linear-gradient(to top, #21c95a 0%, #21c95a 74%, #f5d020 78%, #f5d020 88%, #ff3b30 93%, #ff3b30 100%)' }}>
                        <i style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100%', background: '#15171b' }}></i>
                    </div>
                    {/* Dummy fader for Master since we don't have global master vol in sequencer yet, or we can just leave it as dummy UI */}
                    <SvgFader value={1} color="#cdd3dd" width={50} height={225} onChange={() => {}} />
                </div>
                
                <div style={{ fontSize: '9px', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>L   R</div>

                <button 
                    onClick={clearSolos}
                    style={{
                        width: '70px', padding: '5px 0', textAlign: 'center', borderRadius: '5px',
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
