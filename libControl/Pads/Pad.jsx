window.Pad = ({
    padNum, idx, name,
    isToneMode, toneRoot, hasSample, remembered, vel, sampleNames,
    midiNote, noteName,
    onPointerDown, onPointerUp, onPointerLeave, setPadButtonRef,
    PadWave
}) => {
    // Magic numbers for pad rendering and animations extracted here if any
    const baseColor = isToneMode ? '#c96b18' : (hasSample ? '#f4902c' : '#3a3a3a');
    const restShadow = (hasSample || isToneMode) ? '0 4px 8px rgba(0,0,0,0.4)' : 'inset 0 1px 3px rgba(0,0,0,0.6)';

    const titleText = isToneMode ? `${noteName} — (Tone Mode for Pad ${toneRoot + 1})` : 
        (hasSample ? `${name} — sample: ${(window.OA_DRUM_SAMPLES[idx] && window.OA_DRUM_SAMPLES[idx].name) || sampleNames[idx]}\nALT+click to replace` : 
        (remembered ? `${name} — remembered: ${remembered.name}\n(Restore to re-load, or ALT+click to pick)` : 
        `${name} — synth voice\nALT+click to load a sample`));

    return (
        <button
            ref={setPadButtonRef}
            title={titleText}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            className="oa-pad"
            style={{
                position: 'relative',
                width: '120px', height: '120px',
                backgroundColor: baseColor,
                border: '1px solid #000',
                borderTop: '1px solid #555',
                borderLeft: '1px solid #444',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: restShadow,
                color: hasSample ? '#000' : '#ccc',
                fontWeight: 'bold',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '4px',
                transition: 'transform 0.05s, background-color 0.05s, filter 0.05s',
                outline: 'none',
                touchAction: 'none'
            }}
        >
            <style>{`
                @keyframes oaPadGlowBlue {
                    from { box-shadow: 0 0 calc(12px + var(--gi, 0.5) * 48px) calc(3px + var(--gi, 0.5) * 16px) rgba(66, 165, 245, calc(0.5 + var(--gi, 0.5) * 0.5)); }
                    to { box-shadow: 0 0 0 0 rgba(66, 165, 245, 0); }
                }
            `}</style>

            {/* In tone mode every pad plays the root pad's sample pitched, so show that wave. */}
            {(() => {
                const waveIdx = isToneMode ? toneRoot : idx;
                const waveLoaded = isToneMode
                    ? !!(window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[toneRoot] && window.OA_DRUM_SAMPLES[toneRoot].buffer)
                    : hasSample;
                return waveLoaded ? <PadWave idx={waveIdx} ver={sampleNames[waveIdx]} /> : null;
            })()}
            <span className="oa-pad-name" style={{ position: 'relative', fontSize: '15px', lineHeight: 1.1, wordBreak: 'break-word', color: isToneMode ? '#fff' : 'inherit' }}>
                {isToneMode ? noteName : name}
            </span>

            <span style={{ position: 'absolute', bottom: '4px', left: '6px', fontSize: '9px', fontWeight: 'bold', opacity: 0.5 }}>
                {padNum}
            </span>

            <span title={`MIDI note ${midiNote}`} style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '8px', fontWeight: 'bold', opacity: 0.6, color: hasSample ? '#3a1f00' : '#fca858' }}>
                {window.midiNoteName(midiNote)}
            </span>

            {hasSample ? (
                <span style={{ position: 'absolute', bottom: '4px', right: '6px', fontSize: '8px', fontWeight: 'bold', opacity: 0.7, letterSpacing: '0.5px' }}>
                    SMP
                </span>
            ) : (remembered && (
                <span title={`Remembered: ${remembered.name}`} style={{ position: 'absolute', bottom: '3px', right: '5px', fontSize: '10px', fontWeight: 'bold', color: '#fca858', opacity: 0.8 }}>
                    ○
                </span>
            ))}

            {vel > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: '6px', fontSize: '10px', fontWeight: 'bold', color: hasSample ? '#3a1f00' : '#f4902c', opacity: 0.9 }}>
                    {vel}
                </span>
            )}
        </button>
    );
};
