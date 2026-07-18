// Folders-only tree node (files live in the right-hand grid).
window.SoundFolderNode = ({ name, handle, depth, defaultOpen, onSelectFolder, selectedFolder, pathPrefix }) => {
    const [open, setOpen] = React.useState(!!defaultOpen);
    const [subdirs, setSubdirs] = React.useState(null);
    const load = async () => {
        const dirs = [];
        try { for await (const [n, h] of handle.entries()) if (h.kind === 'directory') dirs.push({ name: n, handle: h }); } catch (e) {}
        dirs.sort((a, b) => a.name.localeCompare(b.name));
        setSubdirs(dirs);
    };
    React.useEffect(() => { if (defaultOpen && subdirs === null) load(); }, []);
    const isSel = selectedFolder === handle;
    return (
        <div>
            <div onClick={() => { onSelectFolder(handle, pathPrefix); if (!open) { setOpen(true); if (subdirs === null) load(); } }}
                style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '3px 4px', paddingLeft: `${4 + depth * 12}px`, cursor: 'pointer', fontSize: '12px', background: isSel ? '#33291a' : 'transparent', color: isSel ? '#f4902c' : '#cdd', borderRadius: '3px' }}>
                <span onClick={(e) => { e.stopPropagation(); const nx = !open; setOpen(nx); if (nx && subdirs === null) load(); }} style={{ width: '10px', color: '#888' }}>{open ? '▾' : '▸'}</span>
                <span>📁 {name}</span>
            </div>
            {open && subdirs && subdirs.map((d, i) => (
                <window.SoundFolderNode key={i} name={d.name} handle={d.handle} depth={depth + 1} onSelectFolder={onSelectFolder} selectedFolder={selectedFolder} pathPrefix={`${pathPrefix}/${d.name}`} />
            ))}
        </div>
    );
};
