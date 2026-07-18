const AUDIO_RE = /\.(mp3|wav|wave|aif|aiff|aac|m4a|ogg|oga|flac|opus)$/i;
const MAX_FILES = 4000;
const NAME_MAX = 60000;

window.useSoundBrowseState = () => {
    const supportsFS = typeof window.showDirectoryPicker === 'function';
    const [rootHandle, setRootHandle] = React.useState(supportsFS ? (window.OA_SOUND_DIR || null) : null);
    const [selectedFolder, setSelectedFolder] = React.useState(null);
    const [selectedFolderPath, setSelectedFolderPath] = React.useState('');
    const [folderFiles, setFolderFiles] = React.useState([]);
    const [flatEntries, setFlatEntries] = React.useState([]);
    const [selectedIndex, setSelectedIndex] = React.useState(-1);
    const [selected, setSelected] = React.useState(null);   // {name, file, folder}
    const [err, setErr] = React.useState('');
    const [chips, setChips] = React.useState([]);
    const [scanning, setScanning] = React.useState(false);
    const [deepResults, setDeepResults] = React.useState([]);
    const [deepSearching, setDeepSearching] = React.useState(false);

    // Favorites
    const loadFavs = () => { try { return JSON.parse(window.localStorage.getItem('oaSoundFavs')) || []; } catch (e) { return []; } };
    const [favState, setFavState] = window.useMqttState('OpenAir/Gui/SoundFavorites', { items: loadFavs() });
    const favorites = (favState && favState.items) || [];
    React.useEffect(() => { try { localStorage.setItem('oaSoundFavs', JSON.stringify(favorites)); } catch (e) {} }, [favState]);
    
    const [view, setView] = React.useState('files');
    const [favEntries, setFavEntries] = React.useState([]);
    const [cloudData, setCloudData] = React.useState(null);
    const [cloudErr, setCloudErr] = React.useState('');

    const isFav = (s) => !!s && favorites.some((f) => f.name === s.name && f.folder === (s.folder || ''));
    const toggleFav = () => {
        if (!selected) return;
        const entry = { name: selected.name, folder: selected.folder || '' };
        const exists = favorites.some((f) => f.name === entry.name && f.folder === entry.folder);
        setFavState({ items: exists ? favorites.filter((f) => !(f.name === entry.name && f.folder === entry.folder)) : [...favorites, entry] });
    };

    const showFiles = () => { setView('files'); setSelectedIndex(-1); };
    const showFavorites = async () => { setView('favorites'); setSelectedIndex(-1); if (window.oaEnsureRootPermission) await window.oaEnsureRootPermission(); };
    const showCloud = async () => { 
        setView('cloud'); setSelectedIndex(-1); setCloudErr('');
        if (!supportsFS || !rootHandle) {
            setCloudErr('Please choose a folder first to view the sample cloud.');
            return;
        }
        try {
            const fh = await rootHandle.getFileHandle('sample_cloud_data.PEAK');
            const file = await fh.getFile();
            const text = await file.text();
            setCloudData(JSON.parse(text));
        } catch (e) {
            setCloudErr('No sample_cloud_data.PEAK found. Run the analyzer on this folder: python3 BackEnd/sample_analyzer_app.py (Rust core, 30 workers).');
            setCloudData(null);
        }
    };

    React.useEffect(() => {
        if (view !== 'favorites') return;
        let cancelled = false;
        (async () => {
            const es = await Promise.all(favorites.map(async (f) => {
                const file = window.oaResolveFile ? await window.oaResolveFile(f.folder, f.name) : null;
                return { name: f.name, folder: f.folder, file: file || undefined };
            }));
            if (!cancelled) setFavEntries(es);
        })();
        return () => { cancelled = true; };
    }, [view, favState]);

    const [filter, setFilter] = React.useState('');
    const files = supportsFS ? folderFiles : flatEntries;
    const baseList = view === 'favorites' ? favEntries : files;
    
    const shown = filter.trim()
        ? ((view === 'files' && supportsFS) ? deepResults : baseList.filter((f) => f.name.toLowerCase().includes(filter.trim().toLowerCase())))
        : baseList;

    React.useEffect(() => {
        const term = filter.trim().toLowerCase();
        if (!term || !supportsFS || !selectedFolder) { setDeepResults([]); setDeepSearching(false); return; }
        let cancelled = false;
        setDeepSearching(true);
        const timer = setTimeout(async () => {
            const out = [];
            try { await window.gatherMatching(selectedFolder, '', out, term, 0); } catch (e) {}
            if (!cancelled) {
                out.sort((a, b) => (a.sub === b.sub ? a.name.localeCompare(b.name) : (a.sub || '').localeCompare(b.sub || '')));
                setDeepResults(out); setDeepSearching(false);
            }
        }, 300);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [filter, selectedFolder]);

    const pickFolder = async () => {
        try {
            const h = await window.showDirectoryPicker();
            window.OA_SOUND_DIR = h; setRootHandle(h);
            if (window.oaIdbSet) window.oaIdbSet('oaRootDir', h).catch(() => {});
            selectFolder(h, h.name || 'root');
        } catch (e) { /* cancelled */ }
    };

    const selectFolder = async (handle, path) => {
        setFolderFiles([]); setDeepResults([]);
        setSelectedFolder(handle); setSelectedFolderPath(path || ''); setSelectedIndex(-1); setErr(''); setFilter(''); setScanning(true); setChips([]);
        const items = [], names = [], builder = window.makeChipBuilder();
        const onEmit = () => setChips(builder.top());
        try { await window.gatherAll(handle, '', items, names, builder, onEmit, 0); }
        catch (e) { setErr('Could not read folder.'); }
        items.sort((a, b) => (a.sub === b.sub ? a.name.localeCompare(b.name) : (a.sub || '').localeCompare(b.sub || '')));
        setFolderFiles(items);
        setChips(builder.top());
        setScanning(false);
        if (names.length > MAX_FILES) setErr(`Showing ${MAX_FILES} of ${names.length}${names.length >= NAME_MAX ? '+' : ''} files — filter to find the rest.`);
    };

    const onPlainFiles = (fileList) => {
        setFlatEntries(Array.from(fileList || []).filter((f) => AUDIO_RE.test(f.name)).map((f) => ({ name: f.name, file: f })));
        setSelectedIndex(-1);
    };

    const selectFileByIndex = async (idx, setBuffer, setPos) => {
        if (idx < 0 || idx >= shown.length) return;
        setSelectedIndex(idx);
        const entry = shown[idx];
        try {
            const file = entry.file || (entry.handle && await entry.handle.getFile());
            if (!file) { setErr('File unavailable — grant folder access or re-pick the folder.'); return; }
            const folder = entry.folder != null ? entry.folder : (supportsFS ? (selectedFolderPath + (entry.sub ? '/' + entry.sub : '')) : '');
            setSelected({ name: entry.name, file, folder });
            setPos(0);
            try { setBuffer(await window.oaDecodeAudio(window.oaAudioCtx(), await file.arrayBuffer())); } catch (e) { setBuffer(null); }
        } catch (e) { setErr('Could not open file.'); }
    };

    return {
        supportsFS, rootHandle, selectedFolder, selectedFolderPath, selectedIndex, setSelectedIndex,
        selected, setSelected, err, chips, scanning, deepSearching, filter, setFilter,
        view, cloudData, cloudErr, favorites, isFav, toggleFav, showFiles, showFavorites, showCloud,
        shown, pickFolder, selectFolder, onPlainFiles, selectFileByIndex, files
    };
};
