window.SeqLibrary = ({ library, loadPattern, deletePattern, setSongItems, song }) => {
    return (
        <div style={{ marginTop: '10px', borderTop: '1px solid #333', paddingTop: '8px' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                Patterns Library
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
                                onClick={() => loadPattern(entry)}
                                onContextMenu={(e) => { e.preventDefault(); if (window.confirm(`Delete pattern "${entry.name}"?`)) deletePattern(entry.name); }}
                                title={`Load "${entry.name}"${entry.bpm ? ` @ ${entry.bpm} BPM` : ''} · right-click to delete`}
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
