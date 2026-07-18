window.useKeyboardPads = (triggerPadKey) => {
    // The numpad is laid out like the left 3 columns of the pad grid, so it
    // triggers the pads that sit in the same physical positions — including the
    // operator row, which sits above 7 8 9 just as pads 13-15 sit above 9-11:
    //
    //     pads            numpad
    //   13 14 15 16   ->   / * -
    //    9 10 11 12   ->   7 8 9 +
    //    5  6  7  8   ->   4 5 6
    //    1  2  3  4   ->   1 2 3
    //
    // Hitting numpad 7 fires the pad up and left, exactly where your eye is.
    // + is a tall key spanning two rows; it takes the upper one, pad 12.
    const NUMPAD_TO_PADNUM = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 6, 6: 7, 7: 9, 8: 10, 9: 11 };
    const NUMPAD_OP_TO_PADNUM = {
        NumpadDivide: 13,
        NumpadMultiply: 14,
        NumpadSubtract: 15,
        NumpadAdd: 12,
    };

    // The number ROW is a straight line, not a grid, so it keeps running along
    // the pads in order: 1-9 then 0 for pad 10.
    const DIGIT_TO_PADNUM = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 0: 10 };

    React.useEffect(() => {
        const onKey = (e) => {
            const t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
            const op = NUMPAD_OP_TO_PADNUM[e.code];
            const m = /^(Numpad|Digit)([0-9])$/.exec(e.code || '');
            if (!op && !m) return;
            const padNum = op || (m[1] === 'Numpad'
                ? NUMPAD_TO_PADNUM[parseInt(m[2], 10)]
                : DIGIT_TO_PADNUM[parseInt(m[2], 10)]);
            if (!padNum) return;
            e.preventDefault();
            triggerPadKey(padNum - 1, padNum);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [triggerPadKey]);
};
