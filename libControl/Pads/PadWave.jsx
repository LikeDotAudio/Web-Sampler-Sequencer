// Faint waveform of a pad's loaded sample, drawn behind the pad label.
window.PadWave = ({ idx, ver }) => {
    const canvasRef = React.useRef(null);
    React.useEffect(() => {
        const c = canvasRef.current; if (!c) return;
        c.width = c.clientWidth || 120; c.height = c.clientHeight || 120;
        const cx = c.getContext('2d'); cx.clearRect(0, 0, c.width, c.height);
        const entry = window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[idx];
        if (!entry || !entry.buffer) return;
        const data = entry.buffer.getChannelData(0);
        const step = Math.max(1, Math.ceil(data.length / c.width));
        const amp = c.height / 2;
        cx.strokeStyle = 'rgba(60,30,0,0.45)';
        cx.beginPath();
        for (let x = 0; x < c.width; x++) {
            let mn = 1, mx = -1;
            for (let j = 0; j < step; j++) { const d = data[x * step + j]; if (d === undefined) break; if (d < mn) mn = d; if (d > mx) mx = d; }
            cx.moveTo(x, (1 + mn) * amp); cx.lineTo(x, (1 + mx) * amp);
        }
        cx.stroke();
    }, [idx, ver]);
    return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
};
