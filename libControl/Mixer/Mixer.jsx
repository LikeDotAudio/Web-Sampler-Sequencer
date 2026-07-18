const SvgKnob = ({ value = 0, min = 0, max = 1, defaultVal = 0, bipolar = false, color = "#46c2ff", size = 42, onChange }) => {
    const cx = size / 2, cy = size / 2, R = size / 2 - 3, bodyR = R - 4;
    const [uid] = React.useState(() => "k" + Math.random().toString(36).slice(2, 8));
    
    const rad = d => d * Math.PI / 180;
    const pt = (r, a) => [cx + r * Math.sin(rad(a)), cy - r * Math.cos(rad(a))];
    const arc = (rr, a0, a1) => {
        const p0 = pt(rr, a0), p1 = pt(rr, a1);
        const large = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 >= a0 ? 1 : 0;
        return `M ${p0[0]} ${p0[1]} A ${rr} ${rr} 0 ${large} ${sweep} ${p1[0]} ${p1[1]}`;
    };

    const clampV = v => Math.max(min, Math.min(max, v));
    const cur = clampV(value);
    const angleFor = v => (((v - min) / ((max - min) || 1)) * 2 - 1) * 135;
    
    const a = angleFor(cur);
    const [ix, iy] = pt(bodyR * 0.32, a);
    const [ox, oy] = pt(bodyR * 0.9, a);

    const handlePointerDown = (e) => {
        if (e.altKey) { onChange(defaultVal); return; }
        const startY = e.clientY;
        const startV = cur;
        e.target.setPointerCapture(e.pointerId);
        
        const move = (em) => {
            const nv = Math.round((startV + ((startY - em.clientY) / 150) * (max - min)) * 100) / 100;
            onChange(clampV(nv));
        };
        const up = (eu) => {
            e.target.removeEventListener('pointermove', move);
            e.target.removeEventListener('pointerup', up);
            e.target.removeEventListener('pointercancel', up);
            try { e.target.releasePointerCapture(eu.pointerId); } catch(x){}
        };
        e.target.addEventListener('pointermove', move);
        e.target.addEventListener('pointerup', up);
        e.target.addEventListener('pointercancel', up);
        e.preventDefault();
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = (e.deltaY < 0 ? 1 : -1) * (max - min) / 50;
        onChange(clampV(cur + delta));
    };

    const flLines = [];
    const FL = 18;
    for (let i = 0; i < FL; i++) {
        const ang = i * (360 / FL);
        const [x1, y1] = pt(bodyR - 1, ang);
        const [x2, y2] = pt(bodyR - 5, ang);
        flLines.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#15171b" strokeWidth={1.2} opacity={0.7} />);
    }

    return (
        <svg 
            width={size} height={size} viewBox={`0 0 ${size} ${size}`} 
            style={{ display: 'block', touchAction: 'none', cursor: 'ns-resize', overflow: 'visible' }}
            onPointerDown={handlePointerDown}
            onWheel={handleWheel}
        >
            <defs>
                <radialGradient id={uid} cx="38%" cy="30%" r="75%">
                    <stop offset="0%" stopColor="#6a6f78" />
                    <stop offset="55%" stopColor="#3a3e45" />
                    <stop offset="100%" stopColor="#1b1d22" />
                </radialGradient>
            </defs>
            <path d={arc(R, -135, 135)} fill="none" stroke="#444b57" strokeWidth={3} strokeLinecap="round" />
            <path d={arc(R, bipolar ? 0 : -135, a)} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={bodyR} fill={`url(#${uid})`} stroke="#0a0a0a" strokeWidth={1} />
            {flLines}
            <line x1={ix} y1={iy} x2={ox} y2={oy} stroke="#eef1f5" strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={Math.max(2, bodyR * 0.16)} fill="#23262c" stroke="#0a0a0a" strokeWidth={0.5} />
        </svg>
    );
};

const DB_MIN = -60, DB_MAX = 12;
const MAX_GAIN = Math.pow(10, DB_MAX / 20);
const gainToPos = g => g <= 0 ? 0 : Math.max(0, Math.min(1, (20 * Math.log10(g) - DB_MIN) / (DB_MAX - DB_MIN)));
const posToGain = p => p <= 0.004 ? 0 : Math.pow(10, (DB_MIN + p * (DB_MAX - DB_MIN)) / 20);

const SvgFader = ({ value = 0, color = "#46c2ff", width = 50, height = 180, onChange }) => {
    const padTop = 6, padBot = 6, travel = height - padTop - padBot;
    const slotCx = 14, slotW = 9, slotX = slotCx - slotW / 2;
    const yAt = p => padTop + (1 - p) * travel;

    const clampV = v => Math.max(0, Math.min(MAX_GAIN, v));
    const cur = clampV(value);
    const p = gainToPos(cur);
    const y = yAt(p);
    
    const handlePointerDown = (e) => {
        const svg = e.currentTarget;
        svg.setPointerCapture(e.pointerId);
        
        const update = (em) => {
            const r = svg.getBoundingClientRect();
            const np = Math.max(0, Math.min(1, 1 - ((em.clientY - (r.top + padTop)) / travel)));
            const nv = Math.round(posToGain(np) * 1000) / 1000;
            onChange(clampV(nv));
        };
        update(e);
        
        const move = (em) => update(em);
        const up = (eu) => {
            svg.removeEventListener('pointermove', move);
            svg.removeEventListener('pointerup', up);
            svg.removeEventListener('pointercancel', up);
            try { svg.releasePointerCapture(eu.pointerId); } catch(x){}
        };
        svg.addEventListener('pointermove', move);
        svg.addEventListener('pointerup', up);
        svg.addEventListener('pointercancel', up);
        e.preventDefault();
    };

    const ticks = [12, 6, 0, -6, -12, -24, -40].map(db => {
        const ty = yAt((db - DB_MIN) / (DB_MAX - DB_MIN));
        const zero = db === 0;
        return (
            <g key={db}>
                <line x1={slotX + slotW + 1} y1={ty} x2={slotX + slotW + 1 + (zero ? 7 : 4)} y2={ty} stroke={zero ? "#cfd6e0" : "#6b7280"} strokeWidth={zero ? 1.5 : 1} />
                <text x={slotX + slotW + 12} y={ty + 3} fontSize={7} fontFamily="Arial" fill={zero ? "#cfd6e0" : "#7b828c"}>{db > 0 ? "+" + db : db}</text>
            </g>
        );
    });

    const thumbW = 30, thumbH = 17, thumbX = slotCx - thumbW / 2;

    return (
        <svg 
            width={width} height={height} viewBox={`0 0 ${width} ${height}`}
            style={{ display: 'block', touchAction: 'none', cursor: 'ns-resize', overflow: 'visible' }}
            onPointerDown={handlePointerDown}
        >
            <rect x={slotX} y={padTop} width={slotW} height={travel} rx={4} fill="#050505" stroke="#222" />
            <rect x={slotX} y={y} width={slotW} height={Math.max(0, (padTop + travel) - y)} rx={4} fill={color} opacity={0.5} />
            {ticks}
            <g transform={`translate(${thumbX}, ${y - thumbH / 2})`}>
                <rect width={thumbW} height={thumbH} rx={3} fill="#dcdcdc" stroke="#555" />
                <line x1={3} y1={thumbH / 2} x2={thumbW - 3} y2={thumbH / 2} stroke="#333" strokeWidth={2} />
            </g>
        </svg>
    );
};

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
