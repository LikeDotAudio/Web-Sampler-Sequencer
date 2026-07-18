window.useSeqState = (label, DEFAULT_STEPS, TRACKS) => {
    const audioCtxRef = React.useRef(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentStep, setCurrentStep] = React.useState(0);
    const safeLabel = label.replace(/[^A-Za-z0-9]+/g, '_');
    const patternTopic = `OpenAir/Gui/Sequencer/${safeLabel}/pattern`;
    
    const emptyPattern = (steps) => Array(TRACKS.length).fill().map(() => Array(steps).fill(0));
    const [seq, setSeq] = window.useMqttState(patternTopic, { grid: emptyPattern(DEFAULT_STEPS), bpm: 120, steps: DEFAULT_STEPS, toneTrack: [], toneRoot: null });
    const steps = (seq && seq.steps) || DEFAULT_STEPS;
    const pattern = (seq && seq.grid) || emptyPattern(steps);
    const bpm = (seq && seq.bpm) || 120;
    const toneTrack = (seq && seq.toneTrack) || [];
    const toneRoot = (seq && seq.toneRoot !== undefined) ? seq.toneRoot : null;
    const stepsRef = React.useRef(steps); stepsRef.current = steps;
    const patternRef = React.useRef(pattern); patternRef.current = pattern;
    const bpmRef = React.useRef(bpm); bpmRef.current = bpm;
    const toneTrackRef = React.useRef(toneTrack); toneTrackRef.current = toneTrack;
    const toneRootRef = React.useRef(toneRoot); toneRootRef.current = toneRoot;
    const setPattern = (grid) => setSeq({ grid, bpm, steps, toneTrack, toneRoot });
    const setBpm = (nextBpm) => setSeq({ grid: pattern, bpm: nextBpm, steps, toneTrack, toneRoot });
    const tapTimesRef = React.useRef([]);
    const tapFlashRef = React.useRef(null);
    const [tapping, setTapping] = React.useState(false);
    const tapTempo = () => {
        const now = performance.now();
        const times = tapTimesRef.current;
        if (times.length && now - times[times.length - 1] > 2000) times.length = 0;
        times.push(now);
        if (times.length > 6) times.shift();
        if (times.length >= 2) {
            let sum = 0; for (let i = 1; i < times.length; i++) sum += times[i] - times[i - 1];
            setBpm(Math.max(40, Math.min(300, Math.round(60000 / (sum / (times.length - 1))))));
        }
        setTapping(true);
        if (tapFlashRef.current) clearTimeout(tapFlashRef.current);
        tapFlashRef.current = setTimeout(() => setTapping(false), 130);
    };
    const setSteps = (n) => {
        const grid = pattern.map((row) => {
            const r = row.slice(0, n);
            while (r.length < n) r.push(0);
            return r;
        });
        const tt = toneTrack.slice(0, n);
        while (tt.length < n) tt.push(null);
        setSeq({ grid, bpm, steps: n, toneTrack: tt, toneRoot });
    };
    const doubleTo = (n) => {
        const half = n / 2;
        const grid = pattern.map((row) => {
            const h = row.slice(0, half);
            while (h.length < half) h.push(0);
            return [...h, ...h];
        });
        const th = toneTrack.slice(0, half);
        while (th.length < half) th.push(null);
        const tt = [...th, ...th.map((c) => (c ? { ...c } : null))];
        setSeq({ grid, bpm, steps: n, toneTrack: tt, toneRoot });
    };
    // Shared like the other mixer levels, so the Mixer's CLICK fader is the one
    // control over the record click — not a second, independent copy of it.
    const [clickVolState, setClickVolState] = window.useMqttState(`OpenAir/Gui/Sequencer/${safeLabel}/clickVol`, { value: 0.8 });
    const clickVol = (clickVolState && clickVolState.value != null) ? clickVolState.value : 0.8;
    const setClickVol = (update) => {
        const next = typeof update === 'function' ? update(clickVol) : update;
        setClickVolState({ value: next });
    };
    const clickVolRef = React.useRef(clickVol); clickVolRef.current = clickVol;
    const [mutesState, setMutesState] = window.useMqttState(`OpenAir/Gui/Sequencer/${safeLabel}/mutes`, { items: Array(TRACKS.length).fill(false) });
    const mutes = (mutesState && mutesState.items) || Array(TRACKS.length).fill(false);
    const setMutes = (update) => {
        const next = typeof update === 'function' ? update(mutes) : update;
        setMutesState({ items: next });
    };
    const mutesRef = React.useRef(mutes); mutesRef.current = mutes;
    const toggleMute = (trkIdx) => setMutes((prev) => { const n = [...prev]; n[trkIdx] = !n[trkIdx]; return n; });

    const [trackVolState, setTrackVolState] = window.useMqttState(`OpenAir/Gui/Sequencer/${safeLabel}/trackVol`, { items: Array(TRACKS.length).fill(1) });
    const trackVol = (trackVolState && trackVolState.items) || Array(TRACKS.length).fill(1);
    const setTrackVol = (update) => {
        const next = typeof update === 'function' ? update(trackVol) : update;
        setTrackVolState({ items: next });
    };
    const trackVolRef = React.useRef(trackVol); trackVolRef.current = trackVol;

    const [trackPanState, setTrackPanState] = window.useMqttState(`OpenAir/Gui/Sequencer/${safeLabel}/trackPan`, { items: Array(TRACKS.length).fill(0) });
    const trackPan = (trackPanState && trackPanState.items) || Array(TRACKS.length).fill(0);
    const setTrackPan = (update) => {
        const next = typeof update === 'function' ? update(trackPan) : update;
        setTrackPanState({ items: next });
    };
    const trackPanRef = React.useRef(trackPan); trackPanRef.current = trackPan;

    const [solosState, setSolosState] = window.useMqttState(`OpenAir/Gui/Sequencer/${safeLabel}/solos`, { items: Array(TRACKS.length).fill(false) });
    const solos = (solosState && solosState.items) || Array(TRACKS.length).fill(false);
    const setSolos = (update) => {
        const next = typeof update === 'function' ? update(solos) : update;
        setSolosState({ items: next });
    };
    const solosRef = React.useRef(solos); solosRef.current = solos;
    const toggleSolo = (trkIdx) => setSolos((prev) => { const n = [...prev]; n[trkIdx] = !n[trkIdx]; return n; });
    const clearSolos = () => setSolos(Array(TRACKS.length).fill(false));

    const [masterVolState, setMasterVolState] = window.useMqttState(`OpenAir/Gui/Sequencer/${safeLabel}/masterVol`, { value: 1 });
    const masterVol = (masterVolState && masterVolState.value != null) ? masterVolState.value : 1;
    const setMasterVol = (val) => setMasterVolState({ value: val });
    const masterVolRef = React.useRef(masterVol); masterVolRef.current = masterVol;

    const [recording, setRecording] = React.useState(false);
    const recordingRef = React.useRef(recording); recordingRef.current = recording;
    const playingRef = React.useRef(isPlaying); playingRef.current = isPlaying;
    const setSeqRef = React.useRef(setSeq); setSeqRef.current = setSeq;
    const [recordedNotes, setRecordedNotes] = React.useState(new Set());
    const recordedNotesRef = React.useRef(recordedNotes); recordedNotesRef.current = recordedNotes;
    
    const toggleRecording = () => {
        setRecording(r => { if (r) setRecordedNotes(new Set()); return !r; });
    };
    const writeStepVel = (trkIdx, step, vel) => {
        const v = Math.max(0, Math.min(100, Math.round(vel)));
        const grid = patternRef.current.map((r) => r.slice());
        grid[trkIdx][step] = v;
        setSeqRef.current({ grid, bpm: bpmRef.current, steps: stepsRef.current, toneTrack: toneTrackRef.current, toneRoot: toneRootRef.current });
    };
    const previewVoice = (trkIdx, vel) => {
        const ctx = window.oaAudioCtx();
        const vol = (vel / 100) * (trackVolRef.current[trkIdx] == null ? 1 : trackVolRef.current[trkIdx]);
        const pan = trackPanRef.current[trkIdx] || 0;
        const entry = window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[trkIdx];
        if (entry && entry.buffer && window.oaPlayDrumSample) window.oaPlayDrumSample(ctx, Object.assign({}, entry, { loop: false }), ctx.currentTime, vol, pan);
        else if (window.oaPlayDrumVoice) window.oaPlayDrumVoice(ctx, { idx: trkIdx }, ctx.currentTime, vol, pan);
        window.dispatchEvent(new CustomEvent('oa-drum-play', { detail: { idx: trkIdx, velocity: vel } }));
    };
    const getAudioCtx = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = window.oaAudioCtx ? window.oaAudioCtx() : new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtxRef.current;
    };
    const currentStepRef = React.useRef(0);
    // Snap a live strike to the nearest step rather than the one just passed, so a
    // hit landing slightly early records where the player meant it, not a step late.
    const quantizedStep = () => {
        const steps = stepsRef.current;
        const clock = window.OA_SEQ_CLOCK;
        const cur = currentStepRef.current % steps;
        if (!clock || !clock.stepDur) return cur;
        const ctx = audioCtxRef.current;
        if (!ctx) return cur;
        // How far past the current step's start we are; over halfway rounds up.
        const intoStep = clock.stepDur - (clock.nextNoteTime - ctx.currentTime);
        return intoStep > clock.stepDur / 2 ? (cur + 1) % steps : cur;
    };
    React.useEffect(() => {
        const onDrumHit = (e) => {
            if (!recordingRef.current || !playingRef.current) return;
            const idx = e.detail && e.detail.idx;
            if (idx == null || idx < 0 || idx >= TRACKS.length) return;
            const step = quantizedStep();
            // The pad already made the sound; don't let the grid play it a second time.
            if (window.OA_SEQ_SKIP) window.OA_SEQ_SKIP.add(`${idx}-${step}`);
            writeStepVel(idx, step, Math.max(1, (e.detail.velocity || 100)));
            setRecordedNotes(prev => {
                const next = new Set(prev);
                next.add(`${idx}-${step}`);
                return next;
            });
        };
        const onToneHit = (e) => {
            if (!recordingRef.current || !playingRef.current) return;
            const { rootIdx, semitones, velocity } = e.detail;
            if (rootIdx == null || semitones == null) return;
            
            const step = quantizedStep();
            setSeqRef.current(prev => {
                const tt = [...(prev.toneTrack || Array(prev.steps).fill(null))];
                tt[step] = { vel: Math.max(1, (velocity || 100)), pitch: semitones };
                return { ...prev, toneRoot: rootIdx, toneTrack: tt };
            });
            setRecordedNotes(prev => {
                const next = new Set(prev);
                next.add(`tone-${step}`);
                return next;
            });
        };
        const onToneMode = (e) => {
            const rootIdx = e.detail && e.detail.rootIdx;
            if (rootIdx !== undefined) {
                setSeqRef.current(prev => ({ 
                    ...prev, 
                    toneRoot: rootIdx, 
                    toneTrack: prev.toneTrack && prev.toneTrack.length > 0 ? prev.toneTrack : Array(prev.steps || DEFAULT_STEPS).fill(null) 
                }));
            }
        };
        window.addEventListener('oa-drum-hit', onDrumHit);
        window.addEventListener('oa-tone-hit', onToneHit);
        window.addEventListener('oa-tone-mode', onToneMode);
        return () => {
            window.removeEventListener('oa-drum-hit', onDrumHit);
            window.removeEventListener('oa-tone-hit', onToneHit);
            window.removeEventListener('oa-tone-mode', onToneMode);
        };
    }, []);
    const LIBRARY_KEY = 'oaSequencerLibrary';
    const loadLibrary = () => {
        try { return JSON.parse(window.localStorage.getItem(LIBRARY_KEY)) || []; }
        catch (e) { return []; }
    };
    const libraryTopic = `OpenAir/Gui/Sequencer/${safeLabel}/library`;
    const [lib, setLib] = window.useMqttState(libraryTopic, { items: loadLibrary() });
    const library = (lib && lib.items) || [];
    const setLibraryItems = (items) => setLib({ items });
    React.useEffect(() => {
        if (lib && lib.items) {
            try { window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib.items)); } 
            catch (e) { }
        }
    }, [lib]);
    const songTopic = `OpenAir/Gui/Sequencer/${safeLabel}/song`;
    const [songState, setSongState] = window.useMqttState(songTopic, { items: [] });
    const song = (songState && songState.items) || [];
    const setSongItems = (items) => setSongState({ items });
    const songItemsRef = React.useRef(song); songItemsRef.current = song;
    const libraryRef = React.useRef(library); libraryRef.current = library;
    const songRef = React.useRef(null);
    const [songPos, setSongPos] = React.useState(null);
    return {
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
    };
};
