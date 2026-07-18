const DB_MIN = -60, DB_MAX = 12;
const MAX_GAIN = Math.pow(10, DB_MAX / 20);
const gainToPos = g => g <= 0 ? 0 : Math.max(0, Math.min(1, (20 * Math.log10(g) - DB_MIN) / (DB_MAX - DB_MIN)));
const posToGain = p => p <= 0.004 ? 0 : Math.pow(10, (DB_MIN + p * (DB_MAX - DB_MIN)) / 20);

const SvgFader = ({ value = 0, color = "#f4902c", width = 50, height = 180, onChange }) => {
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

window.SvgFader = SvgFader;
