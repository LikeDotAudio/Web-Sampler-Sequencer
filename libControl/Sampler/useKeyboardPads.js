window.useKeyboardPads = (triggerPadKey, visibleRef) => {
    // Number-pad → pad mapping (only while this Sampler is on screen). The 3×3
    // numpad maps spatially to the bottom-left 3×3 of the MPC pads:
    //   1 2 3 → pads 1 2 3   ·   4 5 6 → pads 5 6 7   ·   7 8 9 → pads 9 10 11
    const NUMKEY_TO_PADNUM = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 6, 6: 7, 7: 9, 8: 10, 9: 11 };

    React.useEffect(() => {
        const onKey = (e) => {
            if (!visibleRef.current) return;
            const t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
            const m = /^(?:Numpad|Digit)([1-9])$/.exec(e.code || '');
            if (!m) return;
            const padNum = NUMKEY_TO_PADNUM[parseInt(m[1], 10)];
            if (!padNum) return;
            e.preventDefault();
            triggerPadKey(padNum - 1, padNum);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [triggerPadKey, visibleRef]);
};
