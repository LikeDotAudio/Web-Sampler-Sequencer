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

const Sequencer = ({ activeTabs = ['SEQ'], label = "Pattern Sequencer" }) => {
    const {
        safeLabel, isPlaying, setIsPlaying, currentStep, setCurrentStep,
        seq, setSeq, steps, pattern, bpm, toneTrack, toneRoot,
        stepsRef, patternRef, bpmRef, toneTrackRef, toneRootRef,
        setPattern, setBpm, tapping, tapTempo, setSteps, doubleTo,
        clickVol, setClickVol, clickVolRef,
        mutes, mutesRef, toggleMute,
        solos, solosRef, toggleSolo, clearSolos,
        trackVol, setTrackVol, trackVolRef, trackPan, setTrackPan, trackPanRef,
        masterVol, setMasterVol, masterVolRef,
        recording, toggleRecording, recordingRef,
        recordedNotes, setRecordedNotes,
        writeStepVel, previewVoice, getAudioCtx, currentStepRef,
        setSeqRef,
        library, setLibraryItems, song, setSongItems, songItemsRef, libraryRef, songRef, songPos, setSongPos
    } = window.useSeqState(label, DEFAULT_STEPS, TRACKS);

    const { trackMenu, setTrackMenu, browseTrack, setBrowseTrack, trackVer, setTrackVer, loadTrackSample } = window.useSeqMenus();

    const { timerIDRef, nextNoteTimeRef, scheduler, stopScheduler } = window.useSeqScheduler(
        bpmRef, stepsRef, mutesRef, trackVolRef, trackPanRef, 
        recordingRef, clickVolRef, toneTrackRef, toneRootRef,
        patternRef, currentStepRef, setRecordedNotes, setSeqRef, getAudioCtx,
        solosRef, masterVolRef
    );

    const [activeFader, setActiveFader] = React.useState(null);

    const { savePattern, loadPattern, deletePattern, playSong, applySongEntry } = window.useSeqLibrary(
        library, setLibraryItems, pattern, bpm, steps, toneTrack, toneRoot, 
        setSeq, DEFAULT_STEPS, getAudioCtx, isPlaying, timerIDRef, songRef, setSongPos,
        currentStepRef, nextNoteTimeRef, scheduler, stopScheduler, songItemsRef, libraryRef,
        setCurrentStep, setIsPlaying,
        patternRef, stepsRef, bpmRef, toneTrackRef, toneRootRef, setSeqRef
    );

    const { onStepPointerDown } = window.useSeqPointer(patternRef, writeStepVel, recordingRef, setRecordedNotes, previewVoice, setActiveFader);

    const togglePlayback = () => {
        const ctx = getAudioCtx();
        if (isPlaying) {
            stopScheduler();
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

    const [configOpen, setConfigOpen] = React.useState(false);
    // Sections portalled into the drop-up (e.g. Pads' Sets) close it this way.
    React.useEffect(() => {
        const close = () => setConfigOpen(false);
        window.addEventListener('oa-close-config', close);
        return () => window.removeEventListener('oa-close-config', close);
    }, []);

    const configStyle = {
        display: configOpen ? 'flex' : 'none',
        flexDirection: 'column',
        position: 'fixed',
        bottom: '46px',
        right: '12px',
        background: 'var(--panel)',
        padding: '16px',
        border: '1px solid #444',
        borderRadius: '8px',
        zIndex: 1000,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.6)',
        maxHeight: '75vh',
        overflowY: 'auto',
        gap: '12px'
    };

    const showSeq = activeTabs.includes('SEQ');
    const showSong = activeTabs.includes('SONG');

    return (
        <div style={{ padding: '0', backgroundColor: 'transparent', borderRadius: '0', color: '#fff', border: 'none', width: '100%', boxSizing: 'border-box', marginTop: '10px' }}>
                {/* Portalled to <body>: the drop-up must show even when this panel's
                    tab is closed, since its footer controls are always live. */}
                {ReactDOM.createPortal(
                <div style={configStyle}>
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
                        configOpen={configOpen}
                        setConfigOpen={setConfigOpen}
                    />
                    {/* Pads portals its drum-kit Sets section in here when the PADS tab is open. */}
                    <div id="config-dropup-slot" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}></div>
                </div>, document.body)}

            {showSong && (
                <>
                {showSeq && <hr style={{borderColor: '#444', margin: '20px 0'}} />}
                <window.SeqLibrary 
                    library={library} 
                    loadPattern={loadPattern} 
                    deletePattern={deletePattern} 
                    setSongItems={setSongItems} 
                    song={song} 
                />

                <window.SeqSong
                    library={library}
                    setLibraryItems={setLibraryItems}
                    songPos={songPos}
                    song={song} 
                    togglePlayback={togglePlayback} 
                    playSong={playSong} 
                    setSongItems={setSongItems} 
                    setSongPos={setSongPos} 
                />
                </>
            )}
            
            {showSeq && (
            <div className="chunky-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowX: 'auto', alignItems: 'safe center', paddingBottom: '6px' }}>
                {TRACKS.map(({ name: trackName }, trkIdx) => {
                  const muted = mutes[trkIdx];
                  const tvol = trackVol[trkIdx] == null ? 1 : trackVol[trkIdx];
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
            )}

            {toneRoot !== null && showSeq && (
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

            <window.SeqFader activeFader={activeFader} />

            {trackMenu && (
                <TrackSampleMenu
                    trkIdx={trackMenu.trkIdx}
                    trackName={(TRACKS[trackMenu.trkIdx] && TRACKS[trackMenu.trkIdx].name) || ''}
                    anchor={{ x: trackMenu.x, y: trackMenu.y }}
                    version={trackVer}
                    onChange={() => setTrackVer((v) => v + 1)}
                    onBrowse={() => setBrowseTrack(trackMenu.trkIdx)}
                    onClose={() => setTrackMenu(null)}
                />
            )}
            {browseTrack != null && window.SoundBrowser && (
                <window.SoundBrowser
                    targetLabel={(TRACKS[browseTrack] && TRACKS[browseTrack].name) || ''}
                    onClose={() => setBrowseTrack(null)}
                    onChoose={(file, meta) => { loadTrackSample(browseTrack, file, meta); setBrowseTrack(null); }}
                />
            )}
        </div>
    );
};
window.Sequencer = Sequencer;
