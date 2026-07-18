window.makeChipBuilder = () => {
    const map = new Map(); // lowerToken -> { display, count, folders:Set }
    return {
        add(name, sub) {
            const base = name.replace(/\.[^.]+$/, '');
            const parts = base.split(/[^A-Za-z0-9]+/).filter((t) => t.length >= 2 && !/^\d+$/.test(t));
            const seen = new Set();
            parts.forEach((p) => {
                const k = p.toLowerCase();
                if (seen.has(k)) return; seen.add(k);
                let e = map.get(k); if (!e) { e = { display: p, count: 0, folders: new Set() }; map.set(k, e); }
                e.count++; e.folders.add(sub || '');
            });
        },
        top() {
            return Array.from(map.values())
                .filter((e) => e.count >= 2)
                .sort((a, b) => (b.folders.size - a.folders.size) || (b.count - a.count))
                .slice(0, 28);
        },
    };
};
