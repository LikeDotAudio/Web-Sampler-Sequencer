# Web Sampler & Sequencer

A fully-featured, standalone, open-source drum sampler and sequencer that runs entirely in your web browser. 

Designed to mimic classic 16-pad MPC workflows, this project leverages modern web APIs to deliver a professional music production experience without needing any backend server, installation, or build tools. Just open `index.html` and start making beats.

## Features

- **Standalone Execution**: Zero dependencies. No Node.js, no Webpack, no server required. The app is entirely static HTML, CSS, and client-side JavaScript, running React natively in the browser via standalone Babel.
- **MPC-Style Drum Pads (16 Voices)**: A classic 4x4 pad layout. Supports velocity sensitivity (center vs. edge click) and triggers realistic glow animations.
- **Advanced Step Sequencer**: A multi-track sequencer offering granular control over step velocity, per-track volume/pan/pitch, and swing (shuffle). Pattern options include 4, 8, 16, 32, and 64 steps.
- **Local File System Integration**: Utilizes the modern **File System Access API** (Chromium-based browsers) to let you select a local folder of samples. It recursively scans your files and builds a visual, searchable thumbnail grid directly in the browser—without uploading any of your files to a server.
- **Broad Audio Format Support**: Easily loads and decodes WAV, MP3, OGG, FLAC, and AAC files via the native Web Audio API. Also includes a custom pure-JavaScript AIFF/AIFC decoder for classic sample libraries.
- **Web MIDI Support**: Plug in any class-compliant USB MIDI controller (like an Akai MPD or Novation Launchpad) and start finger-drumming immediately. The app automatically maps incoming MIDI notes to the pads and captures velocity data.
- **Offline Persistence**: Drum kit presets, sequencer patterns, and favored samples are saved locally in the browser using `localStorage` and `IndexedDB`.
- **Tone Mode (Chromatic Pitching)**: Hold `CTRL` and click a pad to enter Tone Mode, mapping a single sample chromatically across all 16 pads to play melodies and basslines.

## How to Use

1. Clone or download this repository.
2. Open `index.html` in any modern web browser (Google Chrome or Microsoft Edge recommended for full File System Access API support).
3. **Load Samples**: Click the `🎛 Pad Browser` or `ALT+Click` any pad to choose a folder on your computer containing audio samples. The app will quickly scan them. 
4. **Assign Sounds**: Click on audio files in the browser to map them to your 16 drum pads.
5. **Sequence Beats**: Open the Sequencer panel, set your BPM, and click steps on the grid to create a drum pattern. Press **Play**.

## Philosophy & Architecture

This project strictly adheres to a modular, lightweight, and transparent design philosophy:
- **No file over 200 lines**: The entire codebase is meticulously broken down into single-responsibility hooks and components, making the logic incredibly easy to read, audit, and modify for open-source contributors.
- **No compilation steps**: Open source should be accessible. Anyone can right-click, "View Source", and immediately understand how the app works or tweak the code with a simple text editor. 

## Open Source

This project is 100% open-source. Whether you're a web developer interested in the Web Audio API or a beatmaker looking for a free, portable drum machine, you're encouraged to dive in, study the code, modify the UI, and contribute back.

## Browser Compatibility

- **Google Chrome / Microsoft Edge / Brave / Opera**: Full support (includes File System Access API for seamless local folder browsing and Web MIDI).
- **Firefox / Safari**: Supported, but folder browsing relies on the standard multi-file picker fallback due to lack of File System Access API support. Web MIDI requires a polyfill or extension on Safari.

## License

[MIT License](LICENSE) - Free to use, modify, and distribute.
