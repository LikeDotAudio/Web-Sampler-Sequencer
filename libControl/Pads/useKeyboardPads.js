window.useKeyboardPads = (triggerPadKey) => {
    // The numpad is laid out like the bottom-left 3x3 of the pad grid, so it
    // triggers the pads that sit in the same physical positions:
    //
    //     pads            numpad
    //   13 14 15 16
    //    9 10 11 12   ->   7 8 9
    //    5  6  7  8   ->   4 5 6
    //    1  2  3  4   ->   1 2 3
    //
    // Hitting numpad 7 fires the pad up and left, exactly where your eye is.
    const NUMPAD_TO_PADNUM = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 6, 6: 7, 7: 9, 8: 10, 9: 11 };

    // The number ROW is a straight line, not a grid, so it keeps running along
    // the pads in order: 1-9 then 0 for pad 10.
    const DIGIT_TO_PADNUM = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 0: 10 };

    React.useEffect(() => {
        const onKey = (e) => {
            const t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
            const m = /^(Numpad|Digit)([0-9])$/.exec(e.code || '');
            if (!m) return;
            const n = parseInt(m[2], 10);
            const padNum = m[1] === 'Numpad' ? NUMPAD_TO_PADNUM[n] : DIGIT_TO_PADNUM[n];
            if (!padNum) return;
            e.preventDefault();
            triggerPadKey(padNum - 1, padNum);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [triggerPadKey]);
};
