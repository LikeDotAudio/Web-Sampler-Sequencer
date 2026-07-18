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

    const [clickVol, setClickVol] = React.useState(0.8);
    const clickVolRef = React.useRef(clickVol); clickVolRef.current = clickVol;

    const [mutes, setMutes] = React.useState(() => Array(TRACKS.length).fill(false));
    const mutesRef = React.useRef(mutes); mutesRef.current = mutes;
    const toggleMute = (trkIdx) => setMutes((prev) => { const n = [...prev]; n[trkIdx] = !n[trkIdx]; return n; });

    const [trackVol, setTrackVol] = React.useState(() => Array(TRACKS.length).fill(1));
    const [trackPan, setTrackPan] = React.useState(() => Array(TRACKS.length).fill(0));
    const trackVolRef = React.useRef(trackVol); trackVolRef.current = trackVol;
    const trackPanRef = React.useRef(trackPan); trackPanRef.current = trackPan;

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
        else if (window.oaPlayDrumVoice) window.oaPlayDrumVoice(ctx, TRACKS[trkIdx], ctx.currentTime, vol, pan);
        window.dispatchEvent(new CustomEvent('oa-drum-play', { detail: { idx: trkIdx, velocity: vel } }));
    };

    const getAudioCtx = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = window.oaAudioCtx ? window.oaAudioCtx() : new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtxRef.current;
    };

    const currentStepRef = React.useRef(0);

    React.useEffect(() => {
        const onDrumHit = (e) => {
            if (!recordingRef.current || !playingRef.current) return;
            const idx = e.detail && e.detail.idx;
            if (idx == null || idx < 0 || idx >= TRACKS.length) return;
            const step = currentStepRef.current % stepsRef.current;
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
            
            const step = currentStepRef.current % stepsRef.current;
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

    return {
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
    };
};
