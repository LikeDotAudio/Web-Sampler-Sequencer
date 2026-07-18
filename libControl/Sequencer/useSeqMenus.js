window.useSeqMenus = () => {
    const [trackMenu, setTrackMenu] = React.useState(null);
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

    return { trackMenu, setTrackMenu, browseTrack, setBrowseTrack, trackVer, setTrackVer, loadTrackSample };
};
