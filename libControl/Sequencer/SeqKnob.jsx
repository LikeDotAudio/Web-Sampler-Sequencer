// Sequencer knob — a label/readout wrapper around the SHARED window.Knob
// (libControl/Knobs/Knob). Face, caps, drag/wheel/ALT-to-default behavior all
// come from the shared component, so a style change there restyles this too.
window.SeqKnob = ({ value, min, max, onChange, label, display, size = 60, color = '#f4902c', flash, title, step = 1, def }) => (
    <div title={title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', filter: flash ? 'drop-shadow(0 0 7px rgba(244,144,44,0.95))' : 'none', transition: 'filter 0.08s' }}>
        <window.Knob
            value={value}
            onChange={(v) => onChange(Math.round(Math.max(min, Math.min(max, v))))}
            size={size}
            config={{ min, max, step, value_default: def, arc_width: 3, indicator_color: color }}
        />
        <span style={{ fontSize: '10px', color, fontWeight: 'bold', lineHeight: 1 }}>{display !== undefined ? display : Math.round(value)}</span>
        <span style={{ fontSize: '8px', color: '#888', letterSpacing: '0.5px' }}>{label}</span>
    </div>
);
