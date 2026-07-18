const Header = ({ activeTabs, toggleTab }) => {
    const btnStyle = (tab) => ({
        flex: 1,
        padding: '8px 16px',
        background: activeTabs.includes(tab) ? 'var(--accent)' : 'var(--strip)',
        color: activeTabs.includes(tab) ? '#06222e' : 'var(--text)',
        border: '1px solid #3a3f49',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '14px',
        opacity: activeTabs.includes(tab) ? 1 : 0.6
    });

    return (
        <header style={{ 
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '10px 16px', background: 'var(--panel)',
            boxShadow: '0 2px 8px #0006', zIndex: 10, flexWrap: 'wrap',
            justifyContent: 'space-between'
        }}>
            <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 400, letterSpacing: '2px', color: 'var(--accent)' }}>
                <a href="https://github.com/LikeDotAudio/Web-Sampler-Sequencer" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                    <b style={{ fontWeight: 800 }}>SAMPLER</b>.LIKE.AUDIO
                </a>
            </h1>
            
            <div style={{ display: 'flex', gap: '8px', flex: 1, marginLeft: '20px' }}>
                <button onClick={() => toggleTab('PADS')} style={btnStyle('PADS')}>PADS</button>
                <button onClick={() => toggleTab('SEQ')} style={btnStyle('SEQ')}>SEQ</button>
                <button onClick={() => toggleTab('EDITOR')} style={btnStyle('EDITOR')}>EDITOR</button>
                <button onClick={() => toggleTab('MIXER')} style={btnStyle('MIXER')}>MIXER</button>
            </div>
        </header>
    );
};

window.Header = Header;
