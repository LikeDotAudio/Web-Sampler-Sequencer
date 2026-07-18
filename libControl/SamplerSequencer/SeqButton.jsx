// Sequencer button — the SHARED window.OcaButton (libControl/buttons/Button)
// compacted for the toolbar. Style tweaks to OcaButton flow in here.
window.SeqButton = ({ label, onClick, active, color = '#333', activeColor = '#f4902c', textColor, title, disabled, style }) => (
    <window.OcaButton
        label={label}
        onClick={onClick}
        title={title}
        disabled={disabled}
        color={active ? activeColor : color}
        style={Object.assign(
            { padding: '4px 9px', fontSize: '12px', borderRadius: '3px', border: '1px solid #444', boxShadow: 'none', color: textColor || (active ? '#111' : '#ccc') },
            style
        )}
    />
);
