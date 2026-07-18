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
    const audioCtxRef = React.useRef(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentStep, setCurrentStep] = React.useState(0);

    // MQTT topics for this sequencer instance (retained, so state survives
    // reloads and syncs to any other client viewing the same sequencer).
    const safeLabel = label.replace(/[^A-Za-z0-9]+/g, '_');
    const patternTopic = `OpenAir/Gui/Sequencer/${safeLabel}/pattern`;
    const libraryTopic = `OpenAir/Gui/Sequencer/${safeLabel}/library`;

    // Live sequence (grid + tempo) — pushed to and read from MQTT. Wrapped in an
    // object so useMqttState treats it as a structured payload, not a scalar.
    const [seq, setSeq] = window.useMqttState(patternTopic, { grid: emptyPattern(DEFAULT_STEPS), bpm: 120, steps: DEFAULT_STEPS, toneTrack: [], toneRoot: null });
    const steps = (seq && seq.steps) || DEFAULT_STEPS;
    const pattern = (seq && seq.grid) || emptyPattern(steps);
    const bpm = (seq && seq.bpm) || 120;
    const toneTrack = (seq && seq.toneTrack) || [];
    const toneRoot = (seq && seq.toneRoot !== undefined) ? seq.toneRoot : null;

    // The scheduler runs in a stale RAF closure, so it reads live values via refs.
    // This is what makes a step toggled ON mid-playback sound on its next pass,
    // and a BPM/step change take effect immediately.
    const stepsRef = React.useRef(steps);
    stepsRef.current = steps;
    const patternRef = React.useRef(pattern);
    patternRef.current = pattern;
    const bpmRef = React.useRef(bpm);
    bpmRef.current = bpm;
    const toneTrackRef = React.useRef(toneTrack);
    toneTrackRef.current = toneTrack;
    const toneRootRef = React.useRef(toneRoot);
    toneRootRef.current = toneRoot;

    const setPattern = (grid) => setSeq({ grid, bpm, steps, toneTrack, toneRoot });
    const setBpm = (nextBpm) => setSeq({ grid: pattern, bpm: nextBpm, steps, toneTrack, toneRoot });

    // Tap tempo — average the last few tap intervals; flashes the knob per tap.
    const tapTimesRef = React.useRef([]);
    const tapFlashRef = React.useRef(null);
    const [tapping, setTapping] = React.useState(false);
    const tapTempo = () => {
        const now = performance.now();
        const times = tapTimesRef.current;
        if (times.length && now - times[times.length - 1] > 2000) times.length = 0; // reset after a pause
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

    // Change pattern length (4/8/16): truncate or pad each track row to n steps.
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

    // Double the pattern out to n steps: the first n/2 steps are copied onto
    // the second n/2 (the "+4/+8/+16/+32" buttons) — quick way to grow a beat.
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

    // Metronome click volume (0-1) — the click only sounds while RECORDING.
    const [clickVol, setClickVol] = React.useState(0.8);
    const clickVolRef = React.useRef(clickVol); clickVolRef.current = clickVol;

    // Per-track mute: silences that track's audio but keeps its pattern intact.
    // Local to this client (each client renders its own audio); read via ref in
    // the scheduler's stale RAF closure.
    const [mutes, setMutes] = React.useState(() => Array(TRACKS.length).fill(false));
    const mutesRef = React.useRef(mutes);
    mutesRef.current = mutes;
    const toggleMute = (trkIdx) =>
        setMutes((prev) => { const n = [...prev]; n[trkIdx] = !n[trkIdx]; return n; });

    // Per-track volume (0-1) + pan (-1..1), local to this client. Read via refs
    // in the scheduler's stale RAF closure.
    const [trackVol, setTrackVol] = React.useState(() => Array(TRACKS.length).fill(1));
    const [trackPan, setTrackPan] = React.useState(() => Array(TRACKS.length).fill(0));
    const trackVolRef = React.useRef(trackVol); trackVolRef.current = trackVol;
    const trackPanRef = React.useRef(trackPan); trackPanRef.current = trackPan;

    // Record mode: while recording AND playing, pad hits from the Sampler write
    // into the current step of the matching track at their played velocity.
    const [recording, setRecording] = React.useState(false);
    const recordingRef = React.useRef(recording); recordingRef.current = recording;
    const playingRef = React.useRef(isPlaying); playingRef.current = isPlaying;
    const setSeqRef = React.useRef(setSeq); setSeqRef.current = setSeq;
    const [recordedNotes, setRecordedNotes] = React.useState(new Set());
    const recordedNotesRef = React.useRef(recordedNotes); recordedNotesRef.current = recordedNotes;
    
    const toggleRecording = () => {
        setRecording(r => {
            if (r) setRecordedNotes(new Set());
            return !r;
        });
    };

    // Write a velocity into one step using the LIVE grid (ref) — safe from the
    // stale render closures the record/drag listeners capture.
    const writeStepVel = (trkIdx, step, vel) => {
        const v = Math.max(0, Math.min(100, Math.round(vel)));
        const grid = patternRef.current.map((r) => r.slice());
        grid[trkIdx][step] = v;
        setSeqRef.current({ grid, bpm: bpmRef.current, steps: stepsRef.current, toneTrack: toneTrackRef.current, toneRoot: toneRootRef.current });
    };

    // One-shot preview of a track's voice (never loops) — audible feedback when
    // a step is placed. Also flashes the matching Sampler pad.
    const previewVoice = (trkIdx, vel) => {
        const ctx = window.oaAudioCtx();
        const vol = (vel / 100) * (trackVolRef.current[trkIdx] == null ? 1 : trackVolRef.current[trkIdx]);
        const pan = trackPanRef.current[trkIdx] || 0;
        const entry = window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[trkIdx];
        if (entry && entry.buffer && window.oaPlayDrumSample) window.oaPlayDrumSample(ctx, Object.assign({}, entry, { loop: false }), ctx.currentTime, vol, pan);
        else if (window.oaPlayDrumVoice) window.oaPlayDrumVoice(ctx, TRACKS[trkIdx], ctx.currentTime, vol, pan);
        window.dispatchEvent(new CustomEvent('oa-drum-play', { detail: { idx: trkIdx, velocity: vel } }));
    };

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

    const togglePlayback = () => {
        const ctx = getAudioCtx();
        if (isPlaying) {
            cancelAnimationFrame(timerIDRef.current);
            setIsPlaying(false);
            setCurrentStep(0);
            songRef.current = null;
            setSongPos(null);
        } else {
            // Un-suspend AudioContext on first play if needed (browser policy)
            if (ctx.state === 'suspended') ctx.resume();

            songRef.current = null;   // plain Play loops the current pattern only
            setSongPos(null);
            setIsPlaying(true);
            currentStepRef.current = 0;
            nextNoteTimeRef.current = ctx.currentTime + 0.05; // start shortly
            scheduler(setCurrentStep, songRef, setSongPos, applySongEntry, songItemsRef, libraryRef);
        }
    };

    // Play the SONG: load its first (playable) pattern and let nextNote() chain
    // through the rest, looping the whole song until stopped.
    const playSong = () => {
        const names = songItemsRef.current || [];
        const startIdx = names.findIndex((n) => (libraryRef.current || []).some((p) => p.name === n));
        if (startIdx === -1) return;
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        if (isPlaying) cancelAnimationFrame(timerIDRef.current);
        songRef.current = { idx: startIdx };
        setSongPos(startIdx);
        applySongEntry(libraryRef.current.find((p) => p.name === names[startIdx]));
        setIsPlaying(true);
        currentStepRef.current = 0;
        nextNoteTimeRef.current = ctx.currentTime + 0.05;
        scheduler(setCurrentStep, songRef, setSongPos, applySongEntry, songItemsRef, libraryRef);
    };

    // Click a step = toggle on(100)/off. Click-and-HOLD (or drag) = it becomes a
    // small vertical fader; drag up/down to set that step's intensity (velocity).
    const [activeFader, setActiveFader] = React.useState(null); // { trkIdx, step, vel }

    const onStepPointerDown = (e, trkIdx, step) => {
        e.preventDefault();
        // Plain click = toggle. Click-drag = PAINT the row with that on/off value.
        // ALT+drag = large, detailed intensity fader.
        if (!e.altKey) {
            const paintVel = velOf(patternRef.current[trkIdx][step]) > 0 ? 0 : 100;
            writeStepVel(trkIdx, step, paintVel);
            if (recordingRef.current && paintVel > 0) {
                setRecordedNotes(prev => { const next = new Set(prev); next.add(`${trkIdx}-${step}`); return next; });
            }
            if (paintVel > 0) previewVoice(trkIdx, paintVel);   // sound when placed
            const painted = new Set([step]);
            const move = (ev) => {
                const el = document.elementFromPoint(ev.clientX, ev.clientY);
                if (el && el.dataset && el.dataset.oaTrk !== undefined && Number(el.dataset.oaTrk) === trkIdx) {
                    const s = Number(el.dataset.oaStep);
                    if (!painted.has(s)) { 
                        painted.add(s); 
                        writeStepVel(trkIdx, s, paintVel); 
                        if (recordingRef.current && paintVel > 0) {
                            setRecordedNotes(prev => { const next = new Set(prev); next.add(`${trkIdx}-${s}`); return next; });
                        }
                        if (paintVel > 0) previewVoice(trkIdx, paintVel); 
                    }
                }
            };
            const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
            return;
        }
        const startY = e.clientY;
        const startVel = velOf(patternRef.current[trkIdx][step]) || 100;
        writeStepVel(trkIdx, step, startVel);                 // ensure the step is on
        if (recordingRef.current) {
            setRecordedNotes(prev => { const next = new Set(prev); next.add(`${trkIdx}-${step}`); return next; });
        }
        setActiveFader({ trkIdx, step, vel: Math.round(startVel), x: e.clientX, y: e.clientY });
        const move = (ev) => {
            // Fine control: ~0.5 velocity per pixel (full range spans ~200px).
            const vel = Math.max(1, Math.min(100, startVel + (startY - ev.clientY) * 0.5));
            writeStepVel(trkIdx, step, vel);
            setActiveFader((f) => (f ? { ...f, vel: Math.round(vel) } : f));
        };
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            setActiveFader(null);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    const savePattern = () => {
        const name = (window.prompt('Save pattern as:', `Pattern ${library.length + 1}`) || '').trim();
        if (!name) return;
        const entry = { name, bpm, steps, data: clonePattern(pattern), toneTrack, toneRoot };
        // Overwrite an existing entry with the same name, otherwise append
        const idx = library.findIndex((p) => p.name === name);
        let next;
        if (idx === -1) {
            next = [...library, entry];
        } else {
            next = [...library];
            next[idx] = entry;
        }
        setLibraryItems(next);
    };

    const loadPattern = (entry) => {
        const loadedSteps = (entry.data[0] && entry.data[0].length) || entry.steps || DEFAULT_STEPS;
        setSeq({ 
            grid: clonePattern(entry.data), 
            bpm: entry.bpm || bpm, 
            steps: loadedSteps,
            toneTrack: entry.toneTrack || Array(loadedSteps).fill(null),
            toneRoot: entry.toneRoot !== undefined ? entry.toneRoot : null
        });
    };

    const deletePattern = (name) => {
        setLibraryItems(library.filter((p) => p.name !== name));
    };

    const clearPattern = () => setSeq({ grid: emptyPattern(steps), bpm, steps, toneTrack: Array(steps).fill(null), toneRoot: null });

    const { rendering, renderLoop } = window.useSeqRenderer(pattern, steps, mutes, bpm, safeLabel);

    return (
        <div style={{ padding: '12px', backgroundColor: 'rgba(18,18,18,0.28)', borderRadius: '4px', color: '#fff', border: '1px solid #333', width: '100%', boxSizing: 'border-box', marginTop: '10px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#ccc' }}>{label}</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <SeqButton
                    label={recording ? '● Rec ●' : '● Rec'}
                    onClick={toggleRecording}
                    active={recording}
                    color="#5a1f1f" activeColor="#d32f2f" textColor="#fff"
                    title="Record: while playing, hit the Sampler pads to write them into the pattern at their velocity"
                    style={{ padding: '6px 15px', border: recording ? '1px solid #ff8a80' : '1px solid #722', boxShadow: recording ? '0 0 8px rgba(211,47,47,0.85)' : 'none' }}
                />
                <SeqKnob
                    value={Math.round(clickVol * 100)} min={0} max={100} def={80}
                    onChange={(v) => setClickVol(v / 100)}
                    label="CLICK" display={`${Math.round(clickVol * 100)}`} color="#d32f2f"
                    title="Metronome click volume — the click sounds on every beat while recording"
                />
                <SeqButton
                    label={isPlaying ? '■ Stop' : '► Play'}
                    onClick={togglePlayback}
                    color={isPlaying ? '#ffb300' : '#388e3c'} textColor="#fff"
                    style={{ padding: '6px 15px', border: 'none' }}
                />
                <div style={{ marginLeft: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#aaa' }}>Tempo:</span>
                    <SeqKnob value={bpm} min={40} max={300} def={120} onChange={setBpm} label="BPM" flash={tapping} title="Drag up/down or scroll to change BPM" />
                    <SeqButton label="TAP" onClick={tapTempo} active={tapping} title="Tap to set tempo" style={{ padding: '6px 10px' }} />
                </div>
                <div style={{ marginLeft: '15px', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                    <span style={{ fontSize: '12px', color: '#aaa', marginTop: '6px' }}>Steps:</span>
                    {STEP_OPTIONS.map((n, i) => (
                        <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <SeqButton label={String(n)} active={steps === n} onClick={() => setSteps(n)} />
                            {i > 0 && (
                                <SeqButton
                                    label={`+${STEP_OPTIONS[i - 1]}`}
                                    onClick={() => doubleTo(n)}
                                    color="#26323a" textColor="#8ab4f8"
                                    title={`Extend to ${n} steps: copy the first ${n / 2} onto the second ${n / 2}`}
                                    style={{ border: '1px solid #3a4a58' }}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    <SeqButton
                        label={rendering ? '…rendering' : '⭳ RENDER'}
                        onClick={renderLoop}
                        disabled={rendering}
                        color="#7b1fa2" textColor="#fff"
                        title="Render this pattern to a loopable WAV file"
                        style={{ padding: '6px 12px', border: 'none', cursor: rendering ? 'wait' : 'pointer' }}
                    />
                    <SeqButton
                        label="⭳ Save"
                        onClick={savePattern}
                        color="#1565c0" textColor="#fff"
                        style={{ padding: '6px 12px', border: 'none' }}
                    />
                    <SeqButton
                        label="Clear"
                        onClick={clearPattern}
                        style={{ padding: '6px 12px', border: 'none' }}
                    />
                </div>
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
