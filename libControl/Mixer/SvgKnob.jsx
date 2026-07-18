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

window.SvgKnob = SvgKnob;
