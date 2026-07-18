// Faint waveform behind the pad label. Draws a loaded sample if there is one,
// otherwise the synth voice bounced to a buffer — a synthesized pad shows its
// shape exactly like a sampled one.
window.PadWave = ({ idx, ver, synth }) => {
    const canvasRef = React.useRef(null);
    const [, redraw] = React.useReducer((n) => n + 1, 0);

    // The bounce is async; repaint when this voice's render lands.
    React.useEffect(() => {
        if (!synth) return;
        const onRendered = (e) => { if (e.detail && e.detail.idx === idx) redraw(); };
        window.addEventListener('oa-synth-rendered', onRendered);
        if (window.oaRenderSynthVoice) window.oaRenderSynthVoice(idx);
        return () => window.removeEventListener('oa-synth-rendered', onRendered);
    }, [idx, synth, ver]);

    React.useEffect(() => {
        const c = canvasRef.current; if (!c) return;
        c.width = c.clientWidth || 120; c.height = c.clientHeight || 120;
        const cx = c.getContext('2d'); cx.clearRect(0, 0, c.width, c.height);

        let buffer = null;
        if (synth) {
            const r = window.OA_SYNTH_RENDER && window.OA_SYNTH_RENDER[idx];
            buffer = r && r.buffer;
        } else {
            const entry = window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[idx];
            buffer = entry && entry.buffer;
        }
        if (!buffer) return;

        const data = buffer.getChannelData(0);
        const step = Math.max(1, Math.ceil(data.length / c.width));
        const amp = c.height / 2;
        // A synth pad has no orange sample background behind it, so its trace
        // needs to read against the dark pad instead.
        cx.strokeStyle = synth ? 'rgba(244,144,44,0.40)' : 'rgba(60,30,0,0.45)';
        cx.beginPath();
        for (let x = 0; x < c.width; x++) {
            let mn = 1, mx = -1;
            for (let j = 0; j < step; j++) { const d = data[x * step + j]; if (d === undefined) break; if (d < mn) mn = d; if (d > mx) mx = d; }
            cx.moveTo(x, (1 + mn) * amp); cx.lineTo(x, (1 + mx) * amp);
        }
        cx.stroke();
    });

    return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
};
