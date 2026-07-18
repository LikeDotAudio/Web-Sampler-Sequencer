window.gatherAll = async (handle, prefix, files, names, builder, onEmit, depth) => {
    const AUDIO_RE = /\.(mp3|wav|wave|aif|aiff|aac|m4a|ogg|oga|flac|opus)$/i;
    const MAX_FILES = 4000;
    const NAME_MAX = 60000;
    if (depth > 12 || names.length >= NAME_MAX) return;
    const subdirs = [];
    for await (const [n, h] of handle.entries()) {
        if (names.length >= NAME_MAX) break;
        if (h.kind === 'directory') subdirs.push([n, h]);
        else if (AUDIO_RE.test(n)) {
            names.push({ name: n, sub: prefix });
            builder.add(n, prefix);
            if (files.length < MAX_FILES) files.push({ name: n, handle: h, sub: prefix });
            if (names.length % 250 === 0) onEmit();   // grow the chip list live
        }
    }
    for (const [n, h] of subdirs) { if (names.length >= NAME_MAX) break; await window.gatherAll(h, prefix ? `${prefix}/${n}` : n, files, names, builder, onEmit, depth + 1); }
};
