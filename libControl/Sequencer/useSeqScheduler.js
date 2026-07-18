window.useSeqScheduler = (
    bpmRef, stepsRef, mutesRef, trackVolRef, trackPanRef, 
    recordingRef, clickVolRef, toneTrackRef, toneRootRef,
    patternRef, currentStepRef, setRecordedNotes, setSeqRef, getAudioCtx,
    solosRef, masterVolRef
) => {
    const nextNoteTimeRef = React.useRef(0);
    const timerIDRef = React.useRef(null);
    const scheduleAheadTime = 0.1; // s

    const nextNote = (songRef, setSongPos, applySongEntry, songItemsRef, libraryRef) => {
        const secondsPerBeat = 60.0 / bpmRef.current;
        nextNoteTimeRef.current += 0.25 * secondsPerBeat; // 16th note
        currentStepRef.current = (currentStepRef.current + 1) % stepsRef.current;
        if (currentStepRef.current === 0 && songRef.current) advanceSong(songRef, setSongPos, applySongEntry, songItemsRef, libraryRef);
    };

    const advanceSong = (songRef, setSongPos, applySongEntry, songItemsRef, libraryRef) => {
        const names = songItemsRef.current || [];
        const libItems = libraryRef.current || [];
        for (let hop = 1; hop <= names.length; hop++) {
            const idx = (songRef.current.idx + hop) % names.length;
            const entry = libItems.find((p) => p.name === names[idx]);
            if (entry) { songRef.current = { idx }; setSongPos(idx); applySongEntry(entry); return; }
        }
        songRef.current = null; setSongPos(null);   // nothing playable left
    };

    const scheduleNote = (stepNumber, time, setCurrentStep) => {
        requestAnimationFrame(() => setCurrentStep(stepNumber));
        const ctx = getAudioCtx();
        const TRACKS = window.OA_DRUM_KIT || [];

        const anySolo = solosRef && solosRef.current && solosRef.current.some(s => s);
        
        patternRef.current.forEach((track, trkIdx) => {
            const vel = typeof track[stepNumber] === 'number' ? track[stepNumber] : (track[stepNumber] ? 100 : 0);
            const isMuted = mutesRef.current[trkIdx] || (anySolo && !solosRef.current[trkIdx]);
            
            if (vel > 0 && !isMuted) {
                const vol = (vel / 100) * (trackVolRef.current[trkIdx] == null ? 1 : trackVolRef.current[trkIdx]) * (masterVolRef && masterVolRef.current != null ? masterVolRef.current : 1);
                const pan = trackPanRef.current[trkIdx] || 0;
                const glowDelay = Math.max(0, (time - ctx.currentTime) * 1000);
                setTimeout(() => window.dispatchEvent(new CustomEvent('oa-drum-play', { detail: { idx: trkIdx, velocity: vel } })), glowDelay);

                const entry = window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[trkIdx];
                if (entry && entry.buffer && window.oaPlayDrumSample) {
                    window.oaPlayDrumSample(ctx, Object.assign({}, entry, { loop: false }), time, vol, pan);
                } else if (window.oaPlayDrumVoice) {
                    window.oaPlayDrumVoice(ctx, TRACKS[trkIdx], time, vol, pan);
                } else {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.frequency.value = TRACKS[trkIdx] ? TRACKS[trkIdx].freq : 440;
                    osc.type = TRACKS[trkIdx] ? TRACKS[trkIdx].type : 'sine';
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    gain.gain.setValueAtTime(vol, time);
                    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
                    osc.start(time);
                    osc.stop(time + 0.1);
                }
            }
        });

        if (recordingRef.current && clickVolRef.current > 0 && stepNumber % 4 === 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = stepNumber === 0 ? 1568 : 1046;
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.5 * clickVolRef.current, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            osc.start(time);
            osc.stop(time + 0.06);
            // Let the Mixer's CLICK meter flash in time with the audible click.
            const clickDelay = Math.max(0, (time - ctx.currentTime) * 1000);
            const clickLevel = clickVolRef.current;
            setTimeout(() => window.dispatchEvent(new CustomEvent('oa-click', { detail: { velocity: clickLevel * 100 } })), clickDelay);
        }

        const tTrack = toneTrackRef.current;
        const tRoot = toneRootRef.current;
        if (tTrack && tRoot !== null && tTrack[stepNumber]) {
            const { vel, pitch } = tTrack[stepNumber];
            if (vel > 0 && window.oaTriggerTone) {
                const vol = (vel / 100) * (trackVolRef.current[tRoot] == null ? 1 : trackVolRef.current[tRoot]);
                window.oaTriggerTone(tRoot, pitch, vol, time);
                const glowDelay = Math.max(0, (time - ctx.currentTime) * 1000);
                setTimeout(() => window.dispatchEvent(new CustomEvent('oa-drum-play', { detail: { idx: tRoot, velocity: vel } })), glowDelay);
            }
        }
    };

    const scheduler = (setCurrentStep, songRef, setSongPos, applySongEntry, songItemsRef, libraryRef) => {
        const ctx = getAudioCtx();
        while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
            scheduleNote(currentStepRef.current, nextNoteTimeRef.current, setCurrentStep);
            nextNote(songRef, setSongPos, applySongEntry, songItemsRef, libraryRef);
        }
        timerIDRef.current = requestAnimationFrame(() => scheduler(setCurrentStep, songRef, setSongPos, applySongEntry, songItemsRef, libraryRef));
    };

    return { timerIDRef, nextNoteTimeRef, scheduler };
};
