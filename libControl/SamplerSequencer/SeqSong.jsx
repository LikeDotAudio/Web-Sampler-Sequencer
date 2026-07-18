window.SeqSong = ({ songPos, song, togglePlayback, playSong, setSongItems, setSongPos }) => {
    const SeqButton = window.SeqButton;
    
    return (
        <div style={{ marginTop: '10px', borderTop: '1px solid #333', paddingTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Song
                </span>
                <SeqButton
                    label={songPos !== null ? '■ Stop Song' : '► Play Song'}
                    onClick={songPos !== null ? togglePlayback : playSong}
                    color={songPos !== null ? '#ffb300' : '#388e3c'} textColor="#fff"
                    disabled={songPos === null && song.length === 0}
                    title="Play the song: each pattern in order, looping the whole song"
                    style={{ padding: '4px 12px', border: 'none' }}
                />
                <SeqButton
                    label="Clear"
                    onClick={() => { setSongItems([]); if (songPos !== null) togglePlayback(); }}
                    disabled={song.length === 0}
                    style={{ padding: '4px 10px', border: 'none' }}
                />
            </div>
            {song.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                    A song chains patterns together. Click ＋ on patterns above to build one.
                </div>
            ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                    {song.map((name, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span style={{ color: '#555', fontSize: '14px' }}>→</span>}
                            <div style={{ display: 'flex', alignItems: 'center', background: songPos === i ? '#1565c0' : '#222', borderRadius: '3px', border: songPos === i ? '1px solid #64b5f6' : '1px solid #444', overflow: 'hidden' }}>
                                <span
                                    title={`Play from this pattern`}
                                    onClick={() => { setSongPos(i); if (songPos === null) playSong(); }}
                                    style={{ padding: '4px 8px', fontSize: '12px', color: songPos === i ? '#fff' : '#ccc', cursor: 'pointer' }}
                                >
                                    {name}
                                </span>
                                <button
                                    onClick={() => setSongItems(song.filter((_, idx) => idx !== i))}
                                    title={`Remove from song`}
                                    style={{ background: 'transparent', color: '#ff8a80', border: 'none', borderLeft: songPos === i ? '1px solid #1976d2' : '1px solid #444', padding: '4px 6px', cursor: 'pointer', fontSize: '12px', opacity: 0.8 }}
                                >
                                    ×
                                </button>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
};
