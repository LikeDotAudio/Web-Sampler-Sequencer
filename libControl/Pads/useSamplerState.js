window.useSamplerState = (setSampleNames) => {
    const [toneRoot, setToneRoot] = React.useState(null);
    const toneRootRef = React.useRef(toneRoot); toneRootRef.current = toneRoot;
    
    const [velocities, setVelocities] = React.useState(Array(16).fill(0));
    const [browsePad, setBrowsePad] = React.useState(null);
    const [pendingAssign, setPendingAssign] = React.useState(null); // { file, meta }
    const [showPadBrowse, setShowPadBrowse] = React.useState(false);
    
    const [midiBase, setMidiBase] = React.useState(36);
    const midiBaseRef = React.useRef(36); midiBaseRef.current = midiBase;
    React.useEffect(() => { window.OA_MIDI_BASE = midiBase; }, [midiBase]);
    
    const mqttMessages = window.useMqttMessages ? window.useMqttMessages() : {};
    const kitMeta = React.useMemo(() => {
        const m = {};
        for (let i = 0; i < 16; i++) {
            const raw = mqttMessages[`OpenAir/Gui/DrumKit/${i}/sample`];
            if (raw) { try { const o = JSON.parse(raw); if (o && o.name) m[i] = o; } catch (e) {} }
        }
        return m;
    }, [mqttMessages]);
    
    const [restoreMsg, setRestoreMsg] = React.useState('');
    const missingCount = Object.keys(kitMeta).filter((i) => !(window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[i])).length;
    
    const restoreSounds = async () => {
        if (!window.oaRestoreKit) return;
        setRestoreMsg('restoring…');
        const res = await window.oaRestoreKit(kitMeta);
        if (res.ok) {
            setRestoreMsg(`restored ${res.restored}`);
            setSampleNames((prev) => { const n = [...prev]; for (let i = 0; i < 16; i++) { const e = window.OA_DRUM_SAMPLES[i]; if (e) n[i] = e.name || '(loaded)'; } return n; });
        } else setRestoreMsg(res.reason === 'no-folder' ? 'pick a folder first' : 'permission denied');
        setTimeout(() => setRestoreMsg(''), 2500);
    };
    
    const mqttPublish = window.useMqttPublish ? window.useMqttPublish() : null;
    const publishSample = (idx, name, folder) => {
        if (mqttPublish) mqttPublish(`OpenAir/Gui/DrumKit/${idx}/sample`, { name, folder: folder || '' });
    };

    const handleFile = async (index, file, meta) => {
        if (!file) return;
        try {
            const arrayBuf = await file.arrayBuffer();
            const ctx = window.oaAudioCtx();
            const audioBuf = await window.oaDecodeAudio(ctx, arrayBuf);
            window.oaSetDrumSample(index, audioBuf, { name: file.name, folder: (meta && meta.folder) || '' });
            setSampleNames((prev) => { const n = [...prev]; n[index] = file.name; return n; });
            publishSample(index, file.name, meta && meta.folder);
        } catch (e) {
            console.error('🛑 [Sampler] Could not decode audio:', e);
        }
    };

    return {
        toneRoot, setToneRoot, toneRootRef, velocities, setVelocities, browsePad, setBrowsePad,
        pendingAssign, setPendingAssign, showPadBrowse, setShowPadBrowse, midiBase, setMidiBase, midiBaseRef,
        kitMeta, restoreMsg, missingCount, restoreSounds, handleFile, publishSample
    };
};
