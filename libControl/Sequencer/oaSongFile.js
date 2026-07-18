/**
 * Header: oaSongFile.js
 * Purpose: Export/import the pattern library and song arrangement as a file.
 * Description: One portable .json carrying every saved pattern plus the current
 *   arrangement, so a kit of beats can be backed up, moved between browsers or
 *   shared. Samples are NOT included — only the grids, tempo and order.
 */

window.OA_SONG_FILE_VERSION = 1;

window.oaExportSong = function (library, song, name) {
    const doc = {
        format: 'sampler.like.audio/song',
        version: window.OA_SONG_FILE_VERSION,
        exported: new Date().toISOString(),
        patterns: library || [],
        song: song || [],
    };
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name || 'song').replace(/[^\w\- ]+/g, '')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Parse a file's text into { patterns, song }, or throw with a readable reason.
window.oaParseSongFile = function (text) {
    let doc;
    try { doc = JSON.parse(text); } catch (e) { throw new Error('That file is not valid JSON.'); }
    if (!doc || typeof doc !== 'object') throw new Error('That file is not a song export.');

    // Accept a bare array of patterns too — an older or hand-made export.
    const patterns = Array.isArray(doc) ? doc : (doc.patterns || []);
    const song = Array.isArray(doc) ? [] : (doc.song || []);
    if (!Array.isArray(patterns)) throw new Error('No patterns found in that file.');

    const clean = patterns.filter((p) => p && typeof p.name === 'string' && Array.isArray(p.data));
    if (!clean.length) throw new Error('No usable patterns found in that file.');
    return { patterns: clean, song: song.filter((n) => typeof n === 'string') };
};

// Merge imported patterns into the library. Same-named patterns are kept side
// by side under a suffixed name rather than silently overwriting existing work.
window.oaMergePatterns = function (library, incoming) {
    const out = [...(library || [])];
    const renamed = {};
    incoming.forEach((p) => {
        let name = p.name;
        if (out.some((e) => e.name === name)) {
            let n = 2;
            while (out.some((e) => e.name === `${p.name} (${n})`)) n++;
            name = `${p.name} (${n})`;
            renamed[p.name] = name;
        }
        out.push(Object.assign({}, p, { name }));
    });
    return { library: out, renamed };
};
