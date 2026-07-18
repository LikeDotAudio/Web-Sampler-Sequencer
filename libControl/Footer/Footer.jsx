const Footer = () => {
    return (
        <footer style={{ padding: '10px 20px', backgroundColor: 'var(--panel)', borderTop: '1px solid #3a3f49', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--muted)' }}>
            {/* 
              This slot is populated by Pads.jsx using a React Portal.
              Because Pads.jsx is always mounted (even when not visible), 
              the MIDI configuration will persistently render here. 
            */}
            <div id="midi-footer-slot" style={{ display: 'flex', alignItems: 'center' }}></div>
            <div>Created by Anthony Kuzub — for educational and experimental purposes</div>
        </footer>
    );
};

window.Footer = Footer;
