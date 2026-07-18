// The 16-voice drum kit is shared with the Sampler (DrumKit.js) so a Sampler pad
// and the matching Sequencer track are the SAME voice — including any sample
// loaded onto that pad.
const TRACKS = window.OA_DRUM_KIT || [];
const STEP_OPTIONS = [4, 8, 16, 32, 64];   // selectable pattern lengths
const DEFAULT_STEPS = 16;
const LIBRARY_KEY = 'oaSequencerLibrary';

// A step cell holds a VELOCITY: 0 = off, 1-100 = on at that intensity.
// velOf tolerates legacy boolean grids (true -> 100).
const emptyPattern = (steps) => Array(TRACKS.length).fill().map(() => Array(steps).fill(0));
const velOf = (c) => (typeof c === 'number' ? c : (c ? 100 : 0));
const clonePattern = (p) => p.map((row) => [...row]);

const loadLibrary = () => {
    try {
        return JSON.parse(window.localStorage.getItem(LIBRARY_KEY)) || [];
    } catch (e) {
        return [];
    }
};

const SeqKnob = window.SeqKnob;
const SeqButton = window.SeqButton;
const TrackSampleMenu = window.TrackSampleMenu;

const Sequencer = ({ label = "Pattern Sequencer" }) => {
    const {
        safeLabel, isPlaying, setIsPlaying, currentStep, setCurrentStep,
        seq, setSeq, steps, pattern, bpm, toneTrack, toneRoot,
        stepsRef, patternRef, bpmRef, toneTrackRef, toneRootRef,
        setPattern, setBpm, tapping, tapTempo, setSteps, doubleTo,
        clickVol, setClickVol, clickVolRef,
        mutes, mutesRef, toggleMute,
        trackVol, setTrackVol, trackVolRef, trackPan, setTrackPan, trackPanRef,
        recording, toggleRecording, recordingRef,
        recordedNotes, setRecordedNotes,
        writeStepVel, previewVoice, getAudioCtx, currentStepRef,
        setSeqRef
    } = window.useSeqState(label, DEFAULT_STEPS, TRACKS);

    // Per-track sample menu (click a track name) + its Browse target.
    const [trackMenu, setTrackMenu] = React.useState(null);   // { trkIdx, x, y }
    const [browseTrack, setBrowseTrack] = React.useState(null);
    const [trackVer, setTrackVer] = React.useState(0);
    const trackPublish = window.useMqttPublish ? window.useMqttPublish() : null;
    const loadTrackSample = async (trkIdx, file, meta) => {
        try {
            const ctx = window.oaAudioCtx();
            const buf = await window.oaDecodeAudio(ctx, await file.arrayBuffer());
            const prev = window.OA_DRUM_SAMPLES[trkIdx] || {};
            window.oaSetDrumSample(trkIdx, buf, { name: file.name, pitch: prev.pitch, loop: prev.loop, fade: prev.fade, offset: 0, folder: (meta && meta.folder) || '' });
            setTrackVer((v) => v + 1);
            if (trackPublish) trackPublish(`OpenAir/Gui/DrumKit/${trkIdx}/sample`, { name: file.name, folder: (meta && meta.folder) || '' });
        } catch (e) { console.error('🛑 [Sequencer] load track sample:', e); }
    };

    // Saved-pattern library — also pushed to / read from MQTT (retained), with a
    // localStorage seed so it still loads when the broker is offline.
    const [lib, setLib] = window.useMqttState(libraryTopic, { items: loadLibrary() });
    const library = (lib && lib.items) || [];
    const setLibraryItems = (items) => setLib({ items });
    React.useEffect(() => {
        if (lib && lib.items) {
            try {
                window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib.items));
            } catch (e) { /* storage full / unavailable — keep running */ }
        }
    }, [lib]);

    // SONG — an ordered list of saved-pattern NAMES chained end-to-end at
    // playback (pattern A, then B, then A again…). Shared over MQTT (retained)
    // like the library so it survives reloads and syncs across clients.
    const songTopic = `OpenAir/Gui/Sequencer/${safeLabel}/song`;
    const [songState, setSongState] = window.useMqttState(songTopic, { items: [] });
    const song = (songState && songState.items) || [];
    const setSongItems = (items) => setSongState({ items });
    const songItemsRef = React.useRef(song); songItemsRef.current = song;
    const libraryRef = React.useRef(library); libraryRef.current = library;
    const songRef = React.useRef(null);            // { idx } while a song plays
    const [songPos, setSongPos] = React.useState(null);

    const { timerIDRef, nextNoteTimeRef, scheduler } = window.useSeqScheduler(
        bpmRef, stepsRef, mutesRef, trackVolRef, trackPanRef, 
        recordingRef, clickVolRef, toneTrackRef, toneRootRef,
        patternRef, currentStepRef, setRecordedNotes, setSeqRef, getAudioCtx
    );

    const [activeFader, setActiveFader] = React.useState(null);

    const { savePattern, loadPattern, deletePattern, playSong, applySongEntry } = window.useSeqLibrary(
        library, setLibraryItems, pattern, bpm, steps, toneTrack, toneRoot, 
        setSeq, DEFAULT_STEPS, getAudioCtx, isPlaying, timerIDRef, songRef, setSongPos,
        currentStepRef, nextNoteTimeRef, scheduler, songItemsRef, libraryRef,
        setCurrentStep, setIsPlaying,
        patternRef, stepsRef, bpmRef, toneTrackRef, toneRootRef, setSeqRef
    );

    const { onStepPointerDown } = window.useSeqPointer(patternRef, writeStepVel, recordingRef, setRecordedNotes, previewVoice, setActiveFader);

    const togglePlayback = () => {
        const ctx = getAudioCtx();
        if (isPlaying) {
            cancelAnimationFrame(timerIDRef.current);
            setIsPlaying(false);
            setCurrentStep(0);
            songRef.current = null;
            setSongPos(null);
        } else {
            if (ctx.state === 'suspended') ctx.resume();
            songRef.current = null;
            setSongPos(null);
            setIsPlaying(true);
            currentStepRef.current = 0;
            nextNoteTimeRef.current = ctx.currentTime + 0.05;
            scheduler(setCurrentStep, songRef, setSongPos, applySongEntry, songItemsRef, libraryRef);
        }
    };

    const clearPattern = () => setSeq({ grid: emptyPattern(steps), bpm, steps, toneTrack: Array(steps).fill(null), toneRoot: null });

    const { rendering, renderLoop } = window.useSeqRenderer(pattern, steps, mutes, bpm, safeLabel);

    return (
        <div style={{ padding: '12px', backgroundColor: 'rgba(18,18,18,0.28)', borderRadius: '4px', color: '#fff', border: '1px solid #333', width: '100%', boxSizing: 'border-box', marginTop: '10px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#ccc' }}>{label}</h3>
            <window.SeqControls
                recording={recording}
                toggleRecording={toggleRecording}
                clickVol={clickVol}
                setClickVol={setClickVol}
                isPlaying={isPlaying}
                togglePlayback={togglePlayback}
                bpm={bpm}
                setBpm={setBpm}
                tapping={tapping}
                tapTempo={tapTempo}
                steps={steps}
                setSteps={setSteps}
                doubleTo={doubleTo}
                rendering={rendering}
                renderLoop={renderLoop}
                savePattern={savePattern}
                clearPattern={clearPattern}
            />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflowX: 'auto', paddingBottom: '6px' }}>
                {TRACKS.map(({ name: trackName }, trkIdx) => {
                  const muted = mutes[trkIdx];
                  const tvol = trackVol[trkIdx] == null ? 1 : trackVol[trkIdx];
                  const volAngle = -135 + tvol * 270;   // knob indicator reflects the track volume
                  const openMenu = (e) => { e.stopPropagation(); setTrackMenu({ trkIdx, x: e.clientX, y: e.clientY }); };
                  return (
                    <window.SeqTrack 
                        key={trackName}
                        trackName={trackName}
                        trkIdx={trkIdx}
                        muted={muted}
                        tvol={tvol}
                        toggleMute={toggleMute}
                        openMenu={openMenu}
                        steps={steps}
                        pattern={pattern}
                        isPlaying={isPlaying}
                        currentStep={currentStep}
                        activeFader={activeFader}
                        recordedNotes={recordedNotes}
                        onStepPointerDown={onStepPointerDown}
                    />
                  );
                })}
            </div>

            {toneRoot !== null && (
                <window.SeqToneTrack 
                    toneRoot={toneRoot}
                    steps={steps}
                    toneTrack={toneTrack}
                    toneTrackRef={toneTrackRef}
                    toneRootRef={toneRootRef}
                    isPlaying={isPlaying}
                    currentStep={currentStep}
                    recordedNotes={recordedNotes}
                    setSeqRef={setSeqRef}
                    patternRef={patternRef}
                    bpmRef={bpmRef}
                    stepsRef={stepsRef}
                    recordingRef={recordingRef}
                    setRecordedNotes={setRecordedNotes}
                    trackVolRef={trackVolRef}
                />
            )}

            <window.SeqLibrary 
                library={library} 
                loadPattern={loadPattern} 
                deletePattern={deletePattern} 
                setSongItems={setSongItems} 
                song={song} 
            />

            <window.SeqSong 
                songPos={songPos} 
                song={song} 
                togglePlayback={togglePlayback} 
                playSong={playSong} 
                setSongItems={setSongItems} 
                setSongPos={setSongPos} 
            />

            {activeFader && (
                <div style={{ position: 'fixed', zIndex: 10000, pointerEvents: 'none',
                    left: Math.min(activeFader.x + 16, window.innerWidth - 90),
                    top: Math.min(Math.max(activeFader.y - 130, 8), window.innerHeight - 260),
                    width: '78px', background: '#1c1c1c', border: '1px solid #f4902c', borderRadius: '6px',
                    padding: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f4902c', lineHeight: 1 }}>{activeFader.vel}</div>
                    <div style={{ position: 'relative', width: '30px', height: '200px', background: '#0a0a0a', border: '1px solid #444', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${activeFader.vel}%`, background: 'linear-gradient(to top, #b96a1e, #f4902c)' }} />
                        <div style={{ position: 'absolute', left: '-2px', right: '-2px', bottom: `calc(${activeFader.vel}% - 2px)`, height: '4px', background: '#fff', borderRadius: '1px' }} />
                    </div>
                    <div style={{ fontSize: '9px', color: '#888', letterSpacing: '0.5px' }}>VELOCITY</div>
                </div>
            )}

            {trackMenu && (
                <TrackSampleMenu
                    trkIdx={trackMenu.trkIdx}
                    trackName={(TRACKS[trackMenu.trkIdx] && TRACKS[trackMenu.trkIdx].name) || ''}
                    anchor={{ x: trackMenu.x, y: trackMenu.y }}
                    version={trackVer}
                    vol={trackVol[trackMenu.trkIdx]}
                    pan={trackPan[trackMenu.trkIdx]}
                    onVol={(v) => setTrackVol((prev) => { const n = [...prev]; n[trackMenu.trkIdx] = v; return n; })}
                    onPan={(v) => setTrackPan((prev) => { const n = [...prev]; n[trackMenu.trkIdx] = v; return n; })}
                    onChange={() => setTrackVer((v) => v + 1)}
                    onBrowse={() => setBrowseTrack(trackMenu.trkIdx)}
                    onClose={() => setTrackMenu(null)}
                />
            )}
            {browseTrack != null && window.SoundBrowse && (
                <window.SoundBrowse
                    targetLabel={(TRACKS[browseTrack] && TRACKS[browseTrack].name) || ''}
                    onClose={() => setBrowseTrack(null)}
                    onChoose={(file, meta) => { loadTrackSample(browseTrack, file, meta); setBrowseTrack(null); }}
                />
            )}
        </div>
    );
};
window.Sequencer = Sequencer;
