const Footer = () => {
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 800);
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 800);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <footer style={{ padding: '10px 20px', backgroundColor: 'var(--panel)', borderTop: '1px solid #3a3f49', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--muted)', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <div id="seq-footer-slot" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}></div>
                <div id="midi-footer-slot" style={{ display: 'flex', alignItems: 'center' }}></div>
            </div>
            {!isMobile && <div>Created by Anthony Kuzub — for educational and experimental purposes</div>}
        </footer>
    );
};

window.Footer = Footer;
