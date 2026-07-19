window.SeqControls = ({
    recording, toggleRecording,
    clickVol, setClickVol,
    isPlaying, togglePlayback,
    bpm, setBpm, tapping, tapTempo,
    steps, setSteps, doubleTo,
    rendering, renderLoop,
    savePattern, clearPattern,
    configOpen, setConfigOpen
}) => {
    const SeqButton = window.SeqButton;
    const SeqKnob = window.SeqKnob;
    const STEP_OPTIONS = [4, 8, 16, 32, 64];
    const [footerNode, setFooterNode] = React.useState(null);
    const [configBtnNode, setConfigBtnNode] = React.useState(null);
    React.useEffect(() => {
        setFooterNode(document.getElementById('seq-footer-slot'));
        setConfigBtnNode(document.getElementById('config-footer-slot'));
    }, []);

    // Every footer button shares this footprint so the row reads as one set of controls.
    const FOOTER_BTN = window.OA_FOOTER_BTN;

    const playbackControls = (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <SeqButton
                label={recording ? '● Rec ●' : '● Rec'}
                onClick={toggleRecording}
                active={recording}
                color="#5a1f1f" activeColor="#d32f2f" textColor="#fff"
                title="Record: while playing, hit the Sampler pads to write them into the pattern at their velocity"
                style={Object.assign({}, FOOTER_BTN, { border: recording ? '1px solid #ff8a80' : '1px solid #722', boxShadow: recording ? '0 0 8px rgba(211,47,47,0.85)' : 'none' })}
            />
            <SeqButton
                label={isPlaying ? '■ Stop' : '► Play'}
                onClick={togglePlayback}
                color={isPlaying ? '#ffb300' : '#388e3c'} textColor="#fff"
                style={Object.assign({}, FOOTER_BTN, { border: 'none' })}
            />
            <SeqButton label="TAP" onClick={tapTempo} active={tapping} title="Tap to set tempo" style={Object.assign({}, FOOTER_BTN)} />
            <SeqButton
                label="⭳ Save Pattern"
                onClick={savePattern}
                color="#1565c0" textColor="#fff"
                style={Object.assign({}, FOOTER_BTN, { border: 'none' })}
            />
        </div>
    );

    // Picking something in the drop-up is a decision, so the panel closes once
    // it is made. Continuous controls (the tempo slider) deliberately do not.
    const chose = (fn) => (...args) => { fn(...args); setConfigOpen(false); };

    // Config lives alone at the far right of the footer.
    const configButton = (
        <SeqButton
            label={configOpen ? "✖ Close" : "⚙ Config"}
            onClick={() => setConfigOpen(!configOpen)}
            active={configOpen}
            color="#444" textColor="#fff"
            style={Object.assign({}, FOOTER_BTN, { border: '1px solid #666' })}
        />
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '10px' }}>
            {footerNode
                ? ReactDOM.createPortal(playbackControls, footerNode)
                : playbackControls}
            {configBtnNode && ReactDOM.createPortal(configButton, configBtnNode)}

            {/* Tempo heads the config panel — a full-width slider, not a thumbnail knob. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: '#aaa' }}>Tempo</span>
                <input
                    type="range" min={40} max={300} step={1} value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    title="Drag to set the tempo"
                    style={{ flex: 1, minWidth: 0, width: '320px', accentColor: tapping ? '#fff' : '#f4902c', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: tapping ? '#fff' : '#f4902c', fontVariantNumeric: 'tabular-nums', minWidth: '54px', textAlign: 'right' }}>
                    {bpm} <span style={{ fontSize: '9px', color: '#888' }}>BPM</span>
                </span>
            </div>

            {/* Steps, Render and Clear now live in the Patterns section of SONG
                (see SeqLibrary) — they belong beside the patterns they act on. */}
        </div>
    );
};
