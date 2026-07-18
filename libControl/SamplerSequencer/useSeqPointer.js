window.useSeqPointer = (patternRef, writeStepVel, recordingRef, setRecordedNotes, previewVoice, setActiveFader) => {
    const velOf = (c) => (typeof c === 'number' ? c : (c ? 100 : 0));

    const onStepPointerDown = (e, trkIdx, step) => {
        e.preventDefault();
        if (!e.altKey) {
            const paintVel = velOf(patternRef.current[trkIdx][step]) > 0 ? 0 : 100;
            writeStepVel(trkIdx, step, paintVel);
            if (recordingRef.current && paintVel > 0) {
                setRecordedNotes(prev => { const next = new Set(prev); next.add(`${trkIdx}-${step}`); return next; });
            }
            if (paintVel > 0) previewVoice(trkIdx, paintVel);
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
        writeStepVel(trkIdx, step, startVel);
        if (recordingRef.current) {
            setRecordedNotes(prev => { const next = new Set(prev); next.add(`${trkIdx}-${step}`); return next; });
        }
        setActiveFader({ trkIdx, step, vel: Math.round(startVel), x: e.clientX, y: e.clientY });
        const move = (ev) => {
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

    return { onStepPointerDown };
};
