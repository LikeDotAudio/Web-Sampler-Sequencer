window.SeqTrack = ({ 
    trackName, trkIdx, muted, tvol, 
    toggleMute, openMenu,
    steps, pattern, isPlaying, currentStep, activeFader, recordedNotes,
    onStepPointerDown
}) => {
    const volAngle = -135 + tvol * 270;
    const velOf = (c) => (typeof c === 'number' ? c : (c ? 100 : 0));
    
    return (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ width: '70px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', paddingRight: '6px', position: 'sticky', left: 0, background: '#161616', zIndex: 2 }}>
                <span
                    onClick={openMenu}
                    title={`${trackName} — click to pick a sample / pitch / vol / pan`}
                    style={{ fontSize: '11px', color: muted ? '#666' : '#ccc', textAlign: 'right', whiteSpace: 'nowrap', cursor: 'pointer' }}
                >
                    {trackName}
                </span>
            </div>
            <div style={{ display: 'flex', gap: '3px', background: '#0a0a0a', padding: '4px', borderRadius: '4px', border: '1px solid #222', opacity: muted ? 0.4 : 1 }}>
                {[...Array(steps)].map((_, step) => {
                    const vel = velOf(pattern[trkIdx][step]);
                    const isLit = vel > 0;
                    const isBeat = step % 4 === 0;
                    const isCurrent = isPlaying && currentStep === step;
                    const isFading = activeFader && activeFader.trkIdx === trkIdx && activeFader.step === step;
                    const isNewlyRecorded = recordedNotes.has(`${trkIdx}-${step}`);

                    return (
                        <div key={step}
                            data-oa-trk={trkIdx} data-oa-step={step}
                            onPointerDown={(e) => onStepPointerDown(e, trkIdx, step)}
                            title={isLit ? `Velocity ${vel} — Drag up/down to adjust intensity` : 'Click/drag horizontally to paint · Drag vertically for intensity'}
                            style={{
                                position: 'relative', overflow: 'hidden',
                                width: '18px', height: '20px',
                                backgroundColor: isCurrent ? '#fff' : (isBeat && !isLit ? '#333' : '#1a1a1a'),
                                border: isFading ? '1px solid #fff' : (isLit ? (isNewlyRecorded ? '1px solid #ff5252' : '1px solid #ffa726') : '1px solid #111'),
                                cursor: 'pointer', borderRadius: '2px', touchAction: 'none',
                                boxShadow: isLit ? (isNewlyRecorded ? `0 0 4px rgba(211, 47, 47, ${0.2 + 0.4 * (vel / 100)})` : `0 0 4px rgba(244, 144, 44, ${0.2 + 0.4 * (vel / 100)})`) : 'none',
                            }}>
                            {isLit && !isCurrent && (
                                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${Math.max(14, vel)}%`, background: isNewlyRecorded ? `rgba(211, 47, 47, ${0.4 + 0.6 * (vel / 100)})` : `rgba(244, 144, 44, ${0.4 + 0.6 * (vel / 100)})`, pointerEvents: 'none' }} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
