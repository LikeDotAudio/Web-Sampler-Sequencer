/**
 * SoundBrowse.jsx — custom "Sound Browse" window.
 * Two panes: a folder TREE on the left, and a grid of RENDERED WAVEFORM
 * thumbnails for the selected folder on the right. Click (or arrow-key) a
 * waveform to select + auto-play it; scrub / rewind / loop below; Load to pad.
 *
 * Playback is Web Audio (BufferSource) off the decoded buffer, so every format
 * we can decode — including AIFF via oaDecodeAudio — previews correctly.
 * Folder tree uses the File System Access API (Chromium); elsewhere it falls
 * back to a flat multi-file picker shown in the grid.
 */
const AUDIO_RE = /\.(mp3|wav|wave|aif|aiff|aac|m4a|ogg|oga|flac|opus)$/i;
const COLS = 4;   // grid columns (drives arrow up/down)

const drawWave = window.drawWave;
const WaveThumb = window.WaveThumb;
const SoundCloudView = window.SoundCloudView;
const gatherAll = window.gatherAll;
const gatherMatching = window.gatherMatching;
const makeChipBuilder = window.makeChipBuilder;
const SoundFolderNode = window.SoundFolderNode;

const MAX_FILES = 4000;    // cap on rendered thumbnails
const NAME_MAX = 60000;    // cap on the name-only scan
const DEEP_MAX = 20000;

window.SoundBrowse = ({ onClose, onChoose, onChooseOther, targetLabel }) => {
    const [buffer, setBuffer] = React.useState(null);
    const [autoPreview, setAutoPreview] = React.useState(true);
    
    const { 
        supportsFS, rootHandle, selectedFolder, selectedFolderPath, selectedIndex, setSelectedIndex,
        selected, setSelected, err, chips, scanning, deepSearching, filter, setFilter,
        view, cloudData, cloudErr, favorites, isFav, toggleFav, showFiles, showFavorites, showCloud,
        shown, pickFolder, selectFolder, onPlainFiles, selectFileByIndex, files
    } = window.useSoundBrowseState();

    const { playing, loop, setLoop, pos, setPos, togglePlay, rewind, scrub } = window.useSoundBrowseAudio(buffer, autoPreview);

    // Big waveform of the selected file.
    React.useEffect(() => { drawWave(bigCanvasRef.current, buffer, '#f4902c'); }, [buffer]);

    const chooseIt = () => { if (selected && onChoose) onChoose(selected.file, { name: selected.name, folder: selected.folder || '' }); };
    const chooseOther = () => { if (selected && onChooseOther) onChooseOther(selected.file, { name: selected.name, folder: selected.folder || '' }); };

    window.useSoundBrowseKeys(shown, selectedIndex, (idx) => selectFileByIndex(idx, setBuffer, setPos), chooseIt, onClose, gridScrollRef, selectedThumbRef);

    const tbtn = (extra) => ({ background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '3px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', ...extra });

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '66vw', minWidth: '760px', maxWidth: '95vw', height: '80vh', display: 'flex', flexDirection: 'column', background: '#1c1c1c', border: '1px solid #f4902c', borderRadius: '6px', color: '#eee', boxShadow: '0 10px 40px rgba(0,0,0,0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #333' }}>
                    <h3 style={{ margin: 0, color: '#f4902c', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '15px' }}>
                        Sound Browse{targetLabel ? ` → ${targetLabel}` : ''}
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', borderBottom: '1px solid #2a2a2a', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', border: '1px solid #444', borderRadius: '4px', overflow: 'hidden' }}>
                        <button onClick={showFiles} style={{ background: view === 'files' ? '#f4902c' : '#222', color: view === 'files' ? '#111' : '#ccc', border: 'none', padding: '5px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>FILES</button>
                        <button onClick={showFavorites} style={{ background: view === 'favorites' ? '#f4902c' : '#222', color: view === 'favorites' ? '#111' : '#ccc', border: 'none', padding: '5px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>★ Favorites{favorites.length ? ` (${favorites.length})` : ''}</button>
                        <button onClick={showCloud} style={{ background: view === 'cloud' ? '#f4902c' : '#222', color: view === 'cloud' ? '#111' : '#ccc', border: 'none', padding: '5px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>☁ THE CLOUD</button>
                    </div>
                    {supportsFS ? (
                        <button onClick={pickFolder} style={tbtn({ background: '#f4902c', color: '#111', border: 'none', fontWeight: 'bold' })}>📁 Choose folder…</button>
                    ) : (
                        <label style={tbtn({ background: '#f4902c', color: '#111', border: 'none', fontWeight: 'bold' })}>
                            📁 Choose files…
                            <input type="file" accept="audio/*" multiple style={{ display: 'none' }} onChange={(e) => onPlainFiles(e.target.files)} />
                        </label>
                    )}
                    <label style={{ fontSize: '12px', color: '#ccc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input type="checkbox" checked={autoPreview} onChange={(e) => setAutoPreview(e.target.checked)} /> Auto-preview 5s
                    </label>
                    <input type="text" value={filter} onChange={(e) => { setFilter(e.target.value); setSelectedIndex(-1); }} placeholder="Filter (e.g. HH)"
                        style={{ background: '#111', color: '#eee', border: '1px solid #444', borderRadius: '3px', padding: '4px 8px', fontSize: '12px', width: '130px' }} />
                    {filter.trim() && <span style={{ fontSize: '11px', color: '#8ab4f8' }}>{deepSearching ? 'searching…' : `${shown.length} match${shown.length === 1 ? '' : 'es'}`}</span>}
                    <span style={{ fontSize: '11px', color: '#666' }}>↑ ↓ ← → browse · Enter load</span>
                </div>

                {err && <div style={{ padding: '6px 16px', color: '#f88', fontSize: '12px' }}>⚠️ {err}</div>}

                <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                    <div style={{ width: '210px', flexShrink: 0, borderRight: '1px solid #333', overflowY: 'auto', padding: '6px 4px' }}>
                        {rootHandle ? (
                            <SoundFolderNode name={rootHandle.name || 'root'} handle={rootHandle} depth={0} defaultOpen onSelectFolder={selectFolder} selectedFolder={selectedFolder} pathPrefix={rootHandle.name || 'root'} />
                        ) : (
                            <div style={{ color: '#666', fontSize: '11px', padding: '12px' }}>
                                {supportsFS ? 'Choose a folder to see its tree.' : 'Choose files to browse.'}
                            </div>
                        )}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        {view === 'files' && (chips.length > 0 || scanning) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px 10px', borderBottom: '1px solid #2a2a2a', alignItems: 'center' }}>
                                {scanning && <span style={{ fontSize: '11px', color: '#888' }}>scanning…</span>}
                                {chips.map((c, i) => {
                                    const active = filter.toLowerCase() === c.display.toLowerCase();
                                    return (
                                        <button key={i} onClick={() => { setFilter(active ? '' : c.display); setSelectedIndex(-1); }}
                                            title={`${c.count} files · ${c.folders.size} folders`}
                                            style={{ background: active ? '#f4902c' : '#2a2a2a', color: active ? '#111' : '#cde', border: '1px solid #444', borderRadius: '12px', padding: '2px 9px', fontSize: '11px', cursor: 'pointer' }}>
                                            {c.display}
                                        </button>
                                    );
                                })}
                                {filter && <button onClick={() => setFilter('')} style={{ background: 'none', border: 'none', color: '#888', fontSize: '11px', cursor: 'pointer' }}>clear</button>}
                            </div>
                        )}
                        <div ref={gridScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                            {shown.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gap: '8px' }}>
                                    {shown.map((entry, i) => (
                                        <div key={i} ref={i === selectedIndex ? selectedThumbRef : undefined} style={{ minWidth: 0 }}>
                                            <WaveThumb entry={entry} selected={i === selectedIndex} onSelect={() => selectFileByIndex(i)} scrollRootRef={gridScrollRef} />
                                        </div>
                                    ))}
                                </div>
                            ) : view === 'cloud' ? (
                                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                    {cloudErr ? (
                                        <div style={{ color: '#ccc', fontSize: '13px', padding: '30px', textAlign: 'center', lineHeight: '1.6' }}>
                                            <div style={{ fontSize: '24px', marginBottom: '10px' }}>☁️</div>
                                            {cloudErr}
                                        </div>
                                    ) : cloudData ? (
                                        <SoundCloudView data={cloudData} rootHandle={rootHandle} onSelectFile={(entry) => {
                                            setSelected(entry);
                                            // Auto-play when selected in cloud
                                            const playIt = async () => {
                                                setPos(0);
                                                try {
                                                    const buf = await window.oaDecodeAudio(window.oaAudioCtx(), await entry.file.arrayBuffer());
                                                    setBuffer(buf);
                                                } catch(e) {}
                                            };
                                            playIt();
                                        }} />
                                    ) : (
                                        <div style={{ color: '#888', fontSize: '12px', padding: '30px', textAlign: 'center' }}>Loading cloud...</div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ color: '#666', fontSize: '12px', padding: '30px', textAlign: 'center' }}>
                                    {view === 'favorites'
                                        ? (favorites.length ? 'No matching favorites.' : 'No favorites yet — open Files, pick a sound, and ☆ Favorite it.')
                                        : (deepSearching ? 'Searching all folders…' : (scanning ? 'Scanning folders…' : (files.length ? 'No matches.' : (supportsFS ? 'Select a folder on the left to see its waveforms.' : 'No files chosen yet.'))))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #333', padding: '10px 16px' }}>
                    <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selected ? selected.name : 'No file selected'}
                    </div>
                    <div onClick={scrub} style={{ position: 'relative', width: '100%', height: '60px', background: '#0a0a0a', border: '1px solid #444', cursor: selected ? 'pointer' : 'default' }}>
                        <canvas ref={bigCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
                        {selected && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos * 100}%`, width: '2px', background: '#fff', pointerEvents: 'none' }} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                        <button onClick={rewind} disabled={!selected} style={tbtn()}>⏮ Rewind</button>
                        <button onClick={togglePlay} disabled={!selected} style={tbtn({ background: playing ? '#c00' : '#388e3c', border: 'none', fontWeight: 'bold' })}>{playing ? '⏸ Pause' : '► Play'}</button>
                        <label style={{ fontSize: '12px', color: '#ccc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop
                        </label>
                        <button onClick={toggleFav} disabled={!selected} title="Add/remove this file from favorites"
                            style={tbtn({ background: isFav(selected) ? '#f4902c' : '#333', color: isFav(selected) ? '#111' : '#fff', border: 'none', fontWeight: 'bold' })}>
                            {isFav(selected) ? '★ Favorited' : '☆ Favorite'}
                        </button>
                        <div style={{ flexGrow: 1 }} />
                        <button onClick={chooseIt} disabled={!selected} style={tbtn({ background: selected ? '#f4902c' : '#553', color: '#111', border: 'none', fontWeight: 'bold', padding: '8px 14px', cursor: selected ? 'pointer' : 'not-allowed' })}>
                            ⭳ Load to {targetLabel || 'pad'}
                        </button>
                        {onChooseOther && (
                            <button onClick={chooseOther} disabled={!selected} style={tbtn({ background: selected ? '#8ab4f8' : '#345', color: '#111', border: 'none', fontWeight: 'bold', padding: '8px 14px', cursor: selected ? 'pointer' : 'not-allowed' })}>
                                ⭳ Load to other pad
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
