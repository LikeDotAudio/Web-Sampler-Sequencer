window.midiNoteName = (n) => {
    const MIDI_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return `${MIDI_NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 2}`;
};
