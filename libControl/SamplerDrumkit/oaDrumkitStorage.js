// ---- Sample persistence (revert samples on reload) --------------------------
// A tiny IndexedDB kv-store to keep the last-picked directory handle (File
// System Access handles are structured-cloneable), so samples can be re-loaded
// next session from their MQTT-stored {name, folder}.
window.oaIdbSet = function (key, val) {
    return new Promise((resolve, reject) => {
        const r = indexedDB.open('oaSound', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('kv'); };
        r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(val, key); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); };
        r.onerror = () => reject(r.error);
    });
};
window.oaIdbGet = function (key) {
    return new Promise((resolve) => {
        const r = indexedDB.open('oaSound', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('kv'); };
        r.onsuccess = () => { const tx = r.result.transaction('kv', 'readonly'); const g = tx.objectStore('kv').get(key); g.onsuccess = () => resolve(g.result); g.onerror = () => resolve(null); };
        r.onerror = () => resolve(null);
    });
};

// Walk a persisted root directory handle to a file. folderPath's first segment
// is the root's own name (skipped); the rest are sub-folders.
async function oaNavigateToFile(root, folderPath, name) {
    const parts = (folderPath || '').split('/').filter(Boolean);
    let dir = root;
    for (let i = 1; i < parts.length; i++) dir = await dir.getDirectoryHandle(parts[i]);
    return await dir.getFileHandle(name);
}

// Re-load samples from the persisted folder using per-pad {name, folder} meta.
// MUST be called from a user gesture — may prompt for folder read permission.
window.oaRestoreKit = async function (metaByIdx) {
    const root = await window.oaIdbGet('oaRootDir');
    if (!root) return { ok: false, reason: 'no-folder', restored: 0 };
    if (root.queryPermission) {
        let p = await root.queryPermission({ mode: 'read' });
        if (p !== 'granted' && root.requestPermission) p = await root.requestPermission({ mode: 'read' });
        if (p !== 'granted') return { ok: false, reason: 'permission', restored: 0 };
    }
    let restored = 0;
    for (const idx in metaByIdx) {
        const m = metaByIdx[idx]; if (!m || !m.name) continue;
        try {
            const fh = await oaNavigateToFile(root, m.folder, m.name);
            const file = await fh.getFile();
            const buf = await window.oaDecodeAudio(window.oaAudioCtx(), await file.arrayBuffer());
            window.oaSetDrumSample(Number(idx), buf, { name: m.name });
            restored++;
        } catch (e) { /* file moved/renamed — skip */ }
    }
    return { ok: true, restored };
};

// Ensure read permission on the persisted root folder (call from a user gesture).
window.oaEnsureRootPermission = async function () {
    const root = window.OA_SOUND_DIR || await window.oaIdbGet('oaRootDir');
    if (!root) return false;
    if (root.queryPermission) {
        let p = await root.queryPermission({ mode: 'read' });
        if (p !== 'granted' && root.requestPermission) p = await root.requestPermission({ mode: 'read' });
        if (p !== 'granted') return false;
    }
    window.OA_SOUND_DIR = root;
    return true;
};

// Resolve a File from {folder, name} using the persisted root (if permitted).
window.oaResolveFile = async function (folderPath, name) {
    const root = window.OA_SOUND_DIR || await window.oaIdbGet('oaRootDir');
    if (!root) return null;
    if (root.queryPermission) { const p = await root.queryPermission({ mode: 'read' }); if (p !== 'granted') return null; }
    try { const fh = await oaNavigateToFile(root, folderPath, name); return await fh.getFile(); } catch (e) { return null; }
};
