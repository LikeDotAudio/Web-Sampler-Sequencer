window.useKeyboardPads = (triggerPadKey) => {
    // Number row/pad mapping: keys 1-9 map to pads 1-9, key 0 maps to pad 10.
    const NUMKEY_TO_PADNUM = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 0: 10 };

    React.useEffect(() => {
        const onKey = (e) => {
            const t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
            const m = /^(?:Numpad|Digit)([0-9])$/.exec(e.code || '');
            if (!m) return;
            const padNum = NUMKEY_TO_PADNUM[parseInt(m[1], 10)];
            if (!padNum) return;
            e.preventDefault();
            triggerPadKey(padNum - 1, padNum);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [triggerPadKey]);
};
