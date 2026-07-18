// Extracted from index.html: the root component and its mount.
        function App() {
            const [activeTabs, setActiveTabs] = React.useState(['PADS']); // default
            const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 800);
            const [deferredPrompt, setDeferredPrompt] = React.useState(null);
            
            React.useEffect(() => {
                const handleResize = () => setIsMobile(window.innerWidth <= 800);
                window.addEventListener('resize', handleResize);
                
                const handleBeforeInstall = (e) => {
                    e.preventDefault();
                    setDeferredPrompt(e);
                };
                window.addEventListener('beforeinstallprompt', handleBeforeInstall);

                return () => {
                    window.removeEventListener('resize', handleResize);
                    window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
                };
            }, []);

            const installApp = () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            setDeferredPrompt(null);
                        }
                    });
                }
            };

            // activeTabs is ordered most-recently-pressed FIRST, and at most two
            // panels are open at once — pressing a third drops the older one.
            const MAX_TABS = 2;
            const toggleTab = (tab) => {
                setActiveTabs(prev => {
                    // Pressing an open tab promotes it to the top rather than closing it —
                    // a panel only ever leaves by being pushed out by a third tab.
                    if (prev[0] === tab) return prev;
                    return [tab, ...prev.filter(t => t !== tab)].slice(0, MAX_TABS);
                });
            };

            // Panels can request focus (e.g. loading a pattern opens the grid to edit it).
            React.useEffect(() => {
                const open = (e) => { const t = e.detail && e.detail.tab; if (t) toggleTab(t); };
                window.addEventListener('oa-open-tab', open);
                return () => window.removeEventListener('oa-open-tab', open);
            }, []);

            // Explicit dismissal (e.g. the Editor's ✕) — the tab bar itself never closes.
            const closeTab = (tab) => setActiveTabs(prev => prev.length > 1 ? prev.filter(t => t !== tab) : prev);

            // Panels stay mounted (audio + browser state survives a tab switch) and
            // are re-ordered with flex `order`; the newest one sticks under the header.
            const panelStyle = (...tabs) => {
                const idxs = tabs.map(t => activeTabs.indexOf(t)).filter(i => i >= 0);
                if (!idxs.length) return { display: 'none' };
                const order = Math.min(...idxs);
                return {
                    order,
                    flex: '0 0 auto',
                    width: '100%',
                    ...(order === 0 && activeTabs.length > 1 ? {
                        position: 'sticky',
                        top: 0,
                        zIndex: 5,
                        background: 'var(--bg)',
                        borderBottom: '1px solid #333',
                        paddingBottom: '10px'
                    } : {})
                };
            };

            return (
                <div id="app-container">
                    {window.Header ? <window.Header activeTabs={activeTabs} toggleTab={toggleTab} deferredPrompt={deferredPrompt} installApp={installApp} /> : <header>Loading HEADER...</header>}
                    
                    <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '10px 0' : '10px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ ...panelStyle('PADS'), display: activeTabs.includes('PADS') ? 'flex' : 'none', justifyContent: 'center' }}>
                            {window.Pads ? <window.Pads showSets={activeTabs.includes('PADS')} /> : <div>Loading PADS...</div>}
                        </div>

                        <div style={panelStyle('SEQ', 'SONG')}>
                            {window.Sequencer ? <window.Sequencer activeTabs={activeTabs} /> : <div>Loading SEQ/SONG...</div>}
                        </div>

                        <div style={{ ...panelStyle('EDITOR'), display: activeTabs.includes('EDITOR') ? 'flex' : 'none', justifyContent: 'center', alignItems: 'center' }}>
                            {window.SoundBrowser ? <window.SoundBrowser inline={true} onClose={() => closeTab('EDITOR')} /> : <div>Loading EDITOR...</div>}
                        </div>

                        <div style={panelStyle('MIXER')}>
                            {window.Mixer ? <window.Mixer /> : <div>Loading MIXER...</div>}
                        </div>
                    </main>

                    {window.Footer ? <window.Footer /> : null}
                </div>
            );
        }

        // Everything above is already in this bundle, in order — nothing to wait
        // for. (This used to sleep 500ms for Babel to compile the .jsx files.)
        ReactDOM.createRoot(document.getElementById('root')).render(<App />);

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').then(reg => {
                    console.log('ServiceWorker registration successful');
                }).catch(err => {
                    console.error('ServiceWorker registration failed: ', err);
                });
            });
        }
