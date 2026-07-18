window.useSoundBrowseKeys = (shown, selectedIndex, selectFileByIndex, chooseIt, onClose, gridScrollRef, selectedThumbRef) => {
    // Keep the selected thumbnail centered in the grid as you browse.
    React.useEffect(() => {
        const el = selectedThumbRef.current, cont = gridScrollRef.current;
        if (!el || !cont) return;
        const cr = cont.getBoundingClientRect(), er = el.getBoundingClientRect();
        const delta = (er.top - cr.top) - (cont.clientHeight / 2 - el.clientHeight / 2);
        if (Math.abs(delta) > 2) cont.scrollTo({ top: cont.scrollTop + delta, behavior: 'smooth' });
    }, [selectedIndex, gridScrollRef, selectedThumbRef]);

    // Arrow-key navigation across the thumbnail grid; Enter = Load.
    React.useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') { onClose(); e.preventDefault(); return; }
            if (e.target && (e.target.tagName === 'INPUT')) return;  // don't hijack the filter box
            if (!shown.length) return;
            let d = 0;
            // Snake traversal: forward advances one (…over, over, over, down a row),
            // back reverses, both wrapping around the whole grid.
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') d = 1;
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') d = -1;
            else if (e.key === 'Enter') { chooseIt(); e.preventDefault(); return; }
            else return;
            e.preventDefault();
            const n = shown.length;
            const base = selectedIndex < 0 ? (d > 0 ? -1 : 0) : selectedIndex;
            selectFileByIndex(((base + d) % n + n) % n);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [shown, selectedIndex, selectFileByIndex, chooseIt, onClose]);
};
