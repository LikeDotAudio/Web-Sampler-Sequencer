const Header = ({ activeTabs, toggleTab }) => {
    const btnStyle = (tab, isLast = false) => ({
        flex: 1,
        padding: '8px 16px',
        background: activeTabs.includes(tab) ? 'var(--accent)' : 'var(--strip)',
        color: activeTabs.includes(tab) ? '#06222e' : 'var(--text)',
        border: 'none',
        borderRight: isLast ? 'none' : '1px solid #3a3f49',
        borderRadius: 0,
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '14px',
        opacity: activeTabs.includes(tab) ? 1 : 0.6
    });

    return (
        <header className="app-header">
            <style>{`
                .app-header {
                    display: flex; align-items: center; gap: 14px;
                    padding: 10px 16px; background: var(--panel);
                    box-shadow: 0 2px 8px #0006; z-index: 10; flex-wrap: wrap;
                    justify-content: space-between;
                }
                .header-logo {
                    font-size: 18px; margin: 0; font-weight: 400; letter-spacing: 2px; color: var(--accent);
                }
                .header-tabs {
                    display: flex; gap: 0; flex: 1; margin-left: 20px; border-radius: 6px; overflow: hidden; border: 1px solid #3a3f49;
                }
                @media (max-width: 800px) {
                    .app-header {
                        flex-direction: column;
                        justify-content: center;
                        gap: 10px;
                    }
                    .header-logo {
                        font-size: 14px;
                        text-align: center;
                        width: 100%;
                    }
                    .header-tabs {
                        margin-left: 0;
                        width: 100%;
                    }
                }
            `}</style>
            <h1 className="header-logo">
                <a href="https://github.com/LikeDotAudio/Web-Sampler-Sequencer" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                    <b style={{ fontWeight: 800 }}>SAMPLER</b>.LIKE.AUDIO
                </a>
            </h1>
            
            <div className="header-tabs">
                <button onClick={() => toggleTab('PADS')} style={btnStyle('PADS')}>PADS</button>
                <button onClick={() => toggleTab('SEQ')} style={btnStyle('SEQ')}>SEQ</button>
                <button onClick={() => toggleTab('SONG')} style={btnStyle('SONG')}>SONG</button>
                <button onClick={() => toggleTab('EDITOR')} style={btnStyle('EDITOR')}>EDITOR</button>
                <button onClick={() => toggleTab('MIXER')} style={btnStyle('MIXER', true)}>MIXER</button>
            </div>
        </header>
    );
};

window.Header = Header;
