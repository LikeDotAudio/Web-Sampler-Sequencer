window.useSoundBrowseAudio = (buffer, autoPreview) => {
    const [playing, setPlaying] = React.useState(false);
    const [loop, setLoop] = React.useState(false);
    const [pos, setPos] = React.useState(0);
    
    const srcRef = React.useRef(null);
    const startTimeRef = React.useRef(0);
    const offsetRef = React.useRef(0);
    const rafRef = React.useRef(null);
    
    const duration = buffer ? buffer.duration : 0;

    const stopSrc = () => { 
        if (srcRef.current) { try { srcRef.current.stop(); } catch (e) {} srcRef.current = null; } 
        if (rafRef.current) cancelAnimationFrame(rafRef.current); 
    };

    const playFrom = (frac) => {
        if (!buffer) return;
        stopSrc();
        const ctx = window.oaAudioCtx();
        const src = ctx.createBufferSource();
        src.buffer = buffer; src.loop = loop; src.connect(ctx.destination);
        const startOffset = Math.max(0, Math.min(0.999, frac)) * buffer.duration;
        src.start(0, startOffset);
        srcRef.current = src; startTimeRef.current = ctx.currentTime; offsetRef.current = startOffset;
        src.onended = () => { if (srcRef.current === src) { srcRef.current = null; if (!loop) setPlaying(false); } };
        setPlaying(true);
        const update = () => {
            if (!srcRef.current) return;
            let t = offsetRef.current + (ctx.currentTime - startTimeRef.current);
            if (loop && buffer.duration) t = t % buffer.duration;
            setPos(buffer.duration ? Math.min(1, t / buffer.duration) : 0);
            rafRef.current = requestAnimationFrame(update);
        };
        rafRef.current = requestAnimationFrame(update);
    };

    const togglePlay = () => { if (playing) { stopSrc(); setPlaying(false); } else { playFrom(pos); } };
    const rewind = () => { setPos(0); if (playing) playFrom(0); };
    const scrub = (e) => { 
        if (!duration) return; 
        const rect = e.currentTarget.getBoundingClientRect(); 
        const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); 
        setPos(frac); 
        if (playing) playFrom(frac); 
    };

    React.useEffect(() => { if (srcRef.current) srcRef.current.loop = loop; }, [loop]);
    React.useEffect(() => () => stopSrc(), []);

    // Auto-preview the first 5 seconds when a new buffer is ready.
    React.useEffect(() => {
        if (!buffer || !autoPreview) return;
        playFrom(0);
        const stop = setTimeout(() => { stopSrc(); setPlaying(false); }, 5000);
        return () => clearTimeout(stop);
    }, [buffer, autoPreview]);

    return { playing, loop, setLoop, pos, setPos, duration, togglePlay, rewind, scrub };
};
