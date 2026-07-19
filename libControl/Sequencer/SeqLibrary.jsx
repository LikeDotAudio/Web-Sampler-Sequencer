window.SeqLibrary = ({ library, loadPattern, deletePattern, setSongItems, song,
                       steps, setSteps, doubleTo, rendering, renderLoop, clearPattern }) => {
    const SeqButton = window.SeqButton;
    const STEP_OPTIONS = [4, 8, 16, 32, 64];
    return (
        <div style={{ marginTop: '10px', borderTop: '1px solid #333', paddingTop: '8px' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                Patterns Library
            </div>

            {/* Pattern length and the whole-pattern actions, beside the patterns
                themselves rather than buried in the ⚙ drop-up. */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
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
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
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
                    onClick={() => {
                        if (window.confirm("Are you sure you want to clear the entire pattern?")) {
                            clearPattern();
                        }
                    }}
                    style={{ padding: '6px 12px', border: 'none' }}
                />
            </div>
            {library.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                    No saved patterns yet — build a beat and hit Save.
                </div>
            ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {library.map((entry) => (
                        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', background: '#2a2a2a', borderRadius: '3px', border: '1px solid #444', overflow: 'hidden' }}>
                            <button
                                onClick={() => {
                                    loadPattern(entry);
                                    // Bring the grid up so the pattern you just loaded is editable.
                                    window.dispatchEvent(new CustomEvent('oa-open-tab', { detail: { tab: 'SEQ' } }));
                                }}
                                onContextMenu={(e) => { e.preventDefault(); if (window.confirm(`Delete pattern "${entry.name}"?`)) deletePattern(entry.name); }}
                                title={`Load "${entry.name}"${entry.bpm ? ` @ ${entry.bpm} BPM` : ''} into the sequencer to edit · right-click to delete`}
                                style={{ background: 'transparent', color: '#f4902c', border: 'none', padding: '5px 10px', cursor: 'pointer', fontSize: '12px' }}
                            >
                                {entry.name}
                            </button>
                            <button
                                onClick={() => setSongItems([...song, entry.name])}
                                title={`Append "${entry.name}" to the song`}
                                style={{ background: 'transparent', color: '#8bc34a', border: 'none', borderLeft: '1px solid #444', padding: '5px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                            >
                                ＋
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
