window.useSeqLibrary = (
    library, setLibraryItems, pattern, bpm, steps, toneTrack, toneRoot, 
    setSeq, DEFAULT_STEPS, getAudioCtx, isPlaying, timerIDRef, songRef, setSongPos,
    currentStepRef, nextNoteTimeRef, scheduler, stopScheduler, songItemsRef, libraryRef,
    setCurrentStep, setIsPlaying,
    patternRef, stepsRef, bpmRef, toneTrackRef, toneRootRef, setSeqRef
) => {
    const clonePattern = (p) => p.map((row) => [...row]);

    const savePattern = () => {
        const name = (window.prompt('Save pattern as:', `Pattern ${library.length + 1}`) || '').trim();
        if (!name) return;
        const entry = { name, bpm, steps, data: clonePattern(pattern), toneTrack, toneRoot };
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
    
    const applySongEntry = (entry) => {
        const s = (entry.data[0] && entry.data[0].length) || entry.steps || DEFAULT_STEPS;
        patternRef.current = clonePattern(entry.data);
        stepsRef.current = s;
        if (entry.bpm) bpmRef.current = entry.bpm;
        toneTrackRef.current = entry.toneTrack || Array(s).fill(null);
        toneRootRef.current = entry.toneRoot !== undefined ? entry.toneRoot : null;
        setSeqRef.current({ grid: patternRef.current, bpm: bpmRef.current, steps: s, toneTrack: toneTrackRef.current, toneRoot: toneRootRef.current });
    };

    const playSong = () => {
        const names = songItemsRef.current || [];
        const startIdx = names.findIndex((n) => (libraryRef.current || []).some((p) => p.name === n));
        if (startIdx === -1) return;
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        if (isPlaying) stopScheduler();
        songRef.current = { idx: startIdx };
        setSongPos(startIdx);
        applySongEntry(libraryRef.current.find((p) => p.name === names[startIdx]));
        setIsPlaying(true);
        currentStepRef.current = 0;
        nextNoteTimeRef.current = ctx.currentTime + 0.05;
        scheduler(setCurrentStep, songRef, setSongPos, applySongEntry, songItemsRef, libraryRef);
    };

    return { savePattern, loadPattern, deletePattern, playSong, applySongEntry };
};
