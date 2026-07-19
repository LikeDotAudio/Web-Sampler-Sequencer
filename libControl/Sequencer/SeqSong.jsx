window.SeqSong = ({ songPos, song, togglePlayback, playSong, setSongItems, setSongPos, library, setLibraryItems, mixer, setMixer }) => {
    const SeqButton = window.SeqButton;
    const fileRef = React.useRef(null);

    const exportSong = () => {
        const name = (window.prompt('Name this export:', 'My Song') || '').trim();
        if (!name) return;
        window.oaExportSong(library, song, name, mixer);
    };

    // Levels are React/MQTT state, so they are applied here rather than in
    // oaApplySongState (which only knows about the audio-layer globals).
    const applyMixer = (m) => {
        if (!m || !setMixer) return;
        if (Array.isArray(m.trackVol)) setMixer.setTrackVol(m.trackVol);
        if (Array.isArray(m.trackPan)) setMixer.setTrackPan(m.trackPan);
        if (Array.isArray(m.mutes)) setMixer.setMutes(m.mutes);
        if (Array.isArray(m.solos)) setMixer.setSolos(m.solos);
        if (m.masterVol != null) setMixer.setMasterVol(m.masterVol);
        if (m.clickVol != null) setMixer.setClickVol(m.clickVol);
        if (m.bpm != null) setMixer.setBpm(m.bpm);
        if (m.steps != null) setMixer.setSteps(m.steps);
    };

    const importFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            let parsed;
            try {
                parsed = window.oaParseSongFile(String(reader.result));
            } catch (err) {
                window.alert(`Could not import: ${err.message}`);
                return;
            }
            const { library: merged, renamed } = window.oaMergePatterns(library, parsed.patterns);
            setLibraryItems(merged);
            // The imported arrangement follows its patterns' new names.
            if (parsed.song.length) setSongItems(parsed.song.map((n) => renamed[n] || n));
            applyMixer(parsed.mixer);

            let state = { synth: 0, samples: 0, sampleNote: '', reverb: false };
            try { state = await window.oaApplySongState(parsed); }
            catch (err) { console.error('🛑 [Song] could not restore state:', err); }

            const note = Object.keys(renamed).length
                ? `\n\n${Object.keys(renamed).length} had name clashes and were added with a suffix.`
                : '';
            const restored = [
                parsed.mixer ? 'mixer levels' : null,
                state.synth ? `${state.synth} synth voice(s)` : null,
                state.reverb ? 'reverb' : null,
                state.samples ? `${state.samples} sample(s)` : null,
            ].filter(Boolean);
            window.alert(`Imported ${parsed.patterns.length} pattern(s)` +
                (parsed.song.length ? ` and a ${parsed.song.length}-part song.` : '.') +
                (restored.length ? `\n\nRestored: ${restored.join(', ')}.` : '') +
                (state.sampleNote ? `\n\n${state.sampleNote}` : '') + note);
        };
        reader.readAsText(file);
    };

    // Arranging = ordering. Nudge a pattern along the chain without rebuilding it.
    const move = (i, delta) => {
        const j = i + delta;
        if (j < 0 || j >= song.length) return;
        const next = [...song];
        [next[i], next[j]] = [next[j], next[i]];
        setSongItems(next);
        if (songPos === i) setSongPos(j);
        else if (songPos === j) setSongPos(i);
    };
    const arrowStyle = (enabled) => ({
        background: 'transparent', color: enabled ? '#8bc34a' : '#555', border: 'none',
        padding: '4px 4px', cursor: enabled ? 'pointer' : 'default', fontSize: '11px', lineHeight: 1
    });

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

                <span style={{ width: '1px', height: '18px', background: '#444', margin: '0 4px' }} />

                <SeqButton
                    label="⭳ Export"
                    onClick={exportSong}
                    title="Download every saved pattern, the arrangement, the kit, mixer levels and synth settings as a .json file"
                    style={{ padding: '4px 10px', border: 'none' }}
                />
                <SeqButton
                    label="⭱ Import"
                    onClick={() => fileRef.current && fileRef.current.click()}
                    title="Load patterns and a song from a .json export"
                    style={{ padding: '4px 10px', border: 'none' }}
                />
                <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    style={{ display: 'none' }}
                    onChange={(e) => { importFile(e.target.files && e.target.files[0]); e.target.value = ''; }}
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
                                <button
                                    onClick={() => move(i, -1)}
                                    disabled={i === 0}
                                    title="Move earlier in the song"
                                    style={arrowStyle(i > 0)}
                                >
                                    ◀
                                </button>
                                <span
                                    title={`Play from this pattern`}
                                    onClick={() => { setSongPos(i); if (songPos === null) playSong(); }}
                                    style={{ padding: '4px 8px', fontSize: '12px', color: songPos === i ? '#fff' : '#ccc', cursor: 'pointer' }}
                                >
                                    {name}
                                </span>
                                <button
                                    onClick={() => move(i, 1)}
                                    disabled={i === song.length - 1}
                                    title="Move later in the song"
                                    style={arrowStyle(i < song.length - 1)}
                                >
                                    ▶
                                </button>
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
