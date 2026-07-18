// A single waveform thumbnail — decodes its file to render the wave, but only
// once it scrolls into view (a recursive folder scan can yield thousands).
window.WaveThumb = ({ entry, selected, onSelect, scrollRootRef }) => {
    const canvasRef = React.useRef(null);
    const wrapRef = React.useRef(null);
    const [visible, setVisible] = React.useState(false);
    React.useEffect(() => {
        const el = wrapRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
        const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { setVisible(true); io.disconnect(); } }, { root: (scrollRootRef && scrollRootRef.current) || null, rootMargin: '200px' });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    React.useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        (async () => {
            try {
                const file = entry.file || await entry.handle.getFile();
                const buf = await window.oaDecodeAudio(window.oaAudioCtx(), await file.arrayBuffer());
                if (!cancelled) window.drawWave(canvasRef.current, buf, selected ? '#ffb74d' : '#f4902c');
            } catch (e) { /* undecodable — leave blank */ }
        })();
        return () => { cancelled = true; };
    }, [entry, visible]);
    return (
        <div ref={wrapRef} onClick={onSelect} title={entry.sub ? `${entry.sub}/${entry.name}` : entry.name}
            style={{ border: selected ? '2px solid #f4902c' : '1px solid #444', borderRadius: '4px', padding: '4px', cursor: 'pointer', background: selected ? '#2a2018' : '#141414', boxSizing: 'border-box' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '46px', display: 'block', background: '#0a0a0a' }} />
            <div style={{ fontSize: '10px', color: selected ? '#f4902c' : '#bbb', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</div>
        </div>
    );
};
