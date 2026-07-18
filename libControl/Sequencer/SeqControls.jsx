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

    const playbackControls = (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <SeqButton
                label={recording ? '● Rec ●' : '● Rec'}
                onClick={toggleRecording}
                active={recording}
                color="#5a1f1f" activeColor="#d32f2f" textColor="#fff"
                title="Record: while playing, hit the Sampler pads to write them into the pattern at their velocity"
                style={{ padding: '4px 12px', fontSize: '13px', border: recording ? '1px solid #ff8a80' : '1px solid #722', boxShadow: recording ? '0 0 8px rgba(211,47,47,0.85)' : 'none' }}
            />
            <SeqButton
                label={isPlaying ? '■ Stop' : '► Play'}
                onClick={togglePlayback}
                color={isPlaying ? '#ffb300' : '#388e3c'} textColor="#fff"
                style={{ padding: '4px 12px', fontSize: '13px', border: 'none' }}
            />
            <div style={{ marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#aaa' }}>Tempo:</span>
                <SeqKnob value={bpm} min={40} max={300} def={120} onChange={setBpm} label="BPM" flash={tapping} title="Drag up/down or scroll to change BPM" />
                <SeqButton label="TAP" onClick={tapTempo} active={tapping} title="Tap to set tempo" style={{ padding: '4px 8px', fontSize: '12px' }} />
                <SeqButton 
                    label={configOpen ? "✖ Close" : "⚙ Config"} 
                    onClick={() => setConfigOpen(!configOpen)} 
                    active={configOpen} 
                    color="#444" textColor="#fff" 
                    style={{ padding: '4px 8px', marginLeft: '10px', border: '1px solid #666' }} 
                />
                <SeqButton
                    label="⭳ Save Pattern"
                    onClick={savePattern}
                    color="#1565c0" textColor="#fff"
                    style={{ padding: '4px 8px', marginLeft: '5px', border: 'none', fontSize: '12px', fontWeight: 'bold' }}
                />
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {document.getElementById('seq-footer-slot') 
                ? ReactDOM.createPortal(playbackControls, document.getElementById('seq-footer-slot'))
                : playbackControls}

            <div style={{ marginLeft: '15px', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                <span style={{ fontSize: '12px', color: '#aaa', marginTop: '6px' }}>Steps:</span>
                {STEP_OPTIONS.map((n, i) => (
                    <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <SeqButton label={String(n)} active={steps === n} onClick={() => setSteps(n)} />
                        {i > 0 && (
                            <SeqButton
                                label={`+${STEP_OPTIONS[i - 1]}`}
                                onClick={() => doubleTo(n)}
                                color="#26323a" textColor="#fca858"
                                title={`Extend to ${n} steps: copy the first ${n / 2} onto the second ${n / 2}`}
                                style={{ border: '1px solid #3a4a58' }}
                            />
                        )}
                    </div>
                ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                <SeqButton
                    label={rendering ? '…rendering' : '⭳ RENDER'}
                    onClick={renderLoop}
                    disabled={rendering}
                    color="#7b1fa2" textColor="#fff"
                    title="Render this pattern to a loopable WAV file"
                    style={{ padding: '6px 12px', border: 'none', cursor: rendering ? 'wait' : 'pointer' }}
                />
                <SeqButton
                    label="Clear"
                    onClick={clearPattern}
                    style={{ padding: '6px 12px', border: 'none' }}
                />
            </div>
        </div>
    );
};
