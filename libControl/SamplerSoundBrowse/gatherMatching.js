window.gatherMatching = async (handle, prefix, out, term, depth) => {
    const AUDIO_RE = /\.(mp3|wav|wave|aif|aiff|aac|m4a|ogg|oga|flac|opus)$/i;
    const DEEP_MAX = 20000;
    if (depth > 12 || out.length >= DEEP_MAX) return;
    const subdirs = [];
    for await (const [n, h] of handle.entries()) {
        if (out.length >= DEEP_MAX) break;
        if (h.kind === 'directory') subdirs.push([n, h]);
        else if (AUDIO_RE.test(n) && n.toLowerCase().includes(term)) out.push({ name: n, handle: h, sub: prefix });
    }
    for (const [n, h] of subdirs) { if (out.length >= DEEP_MAX) break; await window.gatherMatching(h, prefix ? `${prefix}/${n}` : n, out, term, depth + 1); }
};
