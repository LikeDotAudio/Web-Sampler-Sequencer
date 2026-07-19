const Footer = () => {
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 800);
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 800);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <footer style={{ padding: '10px 20px', backgroundColor: 'var(--panel)', borderTop: '1px solid #3a3f49', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--muted)', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div id="seq-footer-slot" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {!isMobile && (
                    <a
                        href="https://github.com/LikeDotAudio/Web-Sampler-Sequencer"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View the source on GitHub"
                        style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px solid transparent' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderBottomColor = 'var(--accent)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'inherit'; e.currentTarget.style.borderBottomColor = 'transparent'; }}
                    >
                        Created by Anthony Kuzub — {window.OA_BUILD_VERSION || 'Vdev'}
                    </a>
                )}
                <div id="config-footer-slot" style={{ display: 'flex', alignItems: 'center' }}></div>
            </div>
        </footer>
    );
};

window.Footer = Footer;
