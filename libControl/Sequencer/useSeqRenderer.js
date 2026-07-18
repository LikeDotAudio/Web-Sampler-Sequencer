window.useSeqRenderer = (pattern, steps, mutes, bpm, safeLabel) => {
    const [rendering, setRendering] = React.useState(false);
    const velOf = (c) => (typeof c === 'number' ? c : (c ? 100 : 0));

    const renderLoop = async () => {
        setRendering(true);
        try {
            const secPerStep = 0.25 * 60 / (bpm || 120);   // 16th note
            const dur = steps * secPerStep;
            const rate = (window.OA_AUDIO_CTX && window.OA_AUDIO_CTX.sampleRate) || 44100;
            const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
            const tailSec = 2.0;
            const offline = new Offline(2, Math.max(1, Math.ceil((dur + tailSec) * rate)), rate);
            const TRACKS = window.OA_DRUM_KIT || [];
            
            for (let step = 0; step < steps; step++) {
                const t = step * secPerStep;
                pattern.forEach((track, trkIdx) => {
                    const v = velOf(track[step]);
                    if (v > 0 && !mutes[trkIdx]) {
                        const vol = v / 100;
                        const entry = window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[trkIdx];
                        if (entry && entry.buffer && window.oaPlayDrumSample) window.oaPlayDrumSample(offline, Object.assign({}, entry, { loop: false }), t, vol);
                        else if (window.oaPlayDrumVoice) window.oaPlayDrumVoice(offline, { idx: trkIdx }, t, vol);
                    }
                });
            }
            const rendered = await offline.startRendering();
            const loopLen = Math.max(1, Math.round(dur * rate));
            const loopBuf = window.oaAudioCtx().createBuffer(2, loopLen, rate);
            for (let ch = 0; ch < 2; ch++) {
                const src = rendered.getChannelData(ch);
                const dst = loopBuf.getChannelData(ch);
                for (let i = 0; i < loopLen; i++) dst[i] = src[i] || 0;
                for (let j = 0; j + loopLen < src.length && j < loopLen; j++) dst[j] += src[loopLen + j]; // wrap tail
            }
            const blob = new Blob([window.oaEncodeWav(loopBuf)], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${safeLabel}_${bpm}bpm_${steps}steps.wav`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch (e) { console.error('🛑 [Sequencer] render failed:', e); }
        setRendering(false);
    };

    return { rendering, renderLoop };
};
