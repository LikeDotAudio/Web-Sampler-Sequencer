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
        setSeqRef,
        library, setLibraryItems, song, setSongItems, songItemsRef, libraryRef, songRef, songPos, setSongPos
    } = window.useSeqState(label, DEFAULT_STEPS, TRACKS);

    const { trackMenu, setTrackMenu, browseTrack, setBrowseTrack, trackVer, setTrackVer, loadTrackSample } = window.useSeqMenus();

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

    const [configOpen, setConfigOpen] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 1000);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1000);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const configStyle = isMobile ? {
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
    } : {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    };

    return (
        <div style={{ padding: '12px', backgroundColor: 'rgba(18,18,18,0.28)', borderRadius: '4px', color: '#fff', border: '1px solid #333', width: '100%', boxSizing: 'border-box', marginTop: '10px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#ccc' }}>{label}</h3>
            
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
                    isMobile={isMobile}
                    configOpen={configOpen}
                    setConfigOpen={setConfigOpen}
                />
                
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
            </div>
            
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

            <window.SeqFader activeFader={activeFader} />

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
