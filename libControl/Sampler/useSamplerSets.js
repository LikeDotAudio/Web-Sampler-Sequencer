window.useSamplerSets = (setSampleNames, publishSample) => {
    const loadDrumSets = () => { try { return JSON.parse(window.localStorage.getItem('oaDrumSets')) || {}; } catch (e) { return {}; } };
    
    const [setsState, setSetsState] = window.useMqttState('OpenAir/Gui/DrumSets', { items: loadDrumSets() });
    const sets = (setsState && setsState.items) || {};
    const [currentSet, setCurrentSet] = React.useState('');
    
    React.useEffect(() => { try { localStorage.setItem('oaDrumSets', JSON.stringify(sets)); } catch (e) {} }, [setsState]);

    const snapshotPads = () => {
        const arr = [];
        for (let i = 0; i < 16; i++) {
            const e = window.OA_DRUM_SAMPLES && window.OA_DRUM_SAMPLES[i];
            arr.push(e && e.buffer ? { name: e.name || '', folder: e.folder || '', pitch: e.pitch || 1, loop: !!e.loop, fade: !!e.fade, offset: e.offset || 0 } : null);
        }
        return arr;
    };
    
    const newSet = () => {
        const name = (window.prompt('Name this set:', `Set ${Object.keys(sets).length + 1}`) || '').trim();
        if (!name) return;
        setSetsState({ items: Object.assign({}, sets, { [name]: snapshotPads() }) });
        setCurrentSet(name);
    };
    
    const deleteSet = (name) => {
        const next = Object.assign({}, sets); delete next[name];
        setSetsState({ items: next });
        if (currentSet === name) setCurrentSet('');
    };
    
    const loadSet = async (name) => {
        setCurrentSet(name);
        const set = sets[name]; if (!set) return;
        const metaByIdx = {};
        set.forEach((e, i) => { if (e && e.name) { metaByIdx[i] = { name: e.name, folder: e.folder }; publishSample(i, e.name, e.folder); } });
        if (window.oaRestoreKit) { try { await window.oaRestoreKit(metaByIdx); } catch (err) {} }
        set.forEach((e, i) => { if (e && window.OA_DRUM_SAMPLES[i]) window.oaUpdateDrumSample(i, { pitch: e.pitch, loop: e.loop, fade: e.fade, offset: e.offset }); });
        setSampleNames((prev) => { const n = [...prev]; for (let i = 0; i < 16; i++) { const loaded = window.OA_DRUM_SAMPLES[i]; n[i] = loaded ? (loaded.name || '(loaded)') : (metaByIdx[i] ? metaByIdx[i].name : n[i]); } return n; });
    };
    
    return { sets, currentSet, newSet, deleteSet, loadSet };
};
