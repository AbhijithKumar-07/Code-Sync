import React, { useState } from 'react';
import { getFileIcon } from '../languages';

const Explorer = ({
    files,
    activeFileId,
    onSelectFile,
    onCreateFile,
    onCreateFolder,
    onDeleteEntry,
}) => {
    const [isCreating, setIsCreating] = useState(null); // 'file' | 'folder' | null
    const [createParentId, setCreateParentId] = useState(null);
    const [newItemName, setNewItemName] = useState('');
    const [expandedFolders, setExpandedFolders] = useState({ root: true });

    const toggleFolder = (folderId) => {
        setExpandedFolders((prev) => ({
            ...prev,
            [folderId]: !prev[folderId],
        }));
    };

    const handleStartCreate = (type, parentId = null) => {
        setIsCreating(type);
        setCreateParentId(parentId);
        setNewItemName('');
        if (parentId) {
            setExpandedFolders((prev) => ({ ...prev, [parentId]: true }));
        }
    };

    const handleCreateSubmit = (e) => {
        e?.preventDefault();
        const trimmed = newItemName.trim();
        if (!trimmed) {
            setIsCreating(null);
            return;
        }

        if (isCreating === 'file') {
            onCreateFile(trimmed, createParentId);
        } else if (isCreating === 'folder') {
            onCreateFolder(trimmed, createParentId);
        }
        setIsCreating(null);
        setNewItemName('');
    };

    const renderTree = (parentId = null, level = 0) => {
        const items = files.filter((f) => (f.parentId || null) === parentId);

        // Sort folders first, then files alphabetically
        const sorted = [...items].sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1;
        });

        return (
            <div className="explorerTreeBranch">
                {sorted.map((item) => {
                    const isFolder = item.type === 'folder';
                    const isExpanded = isFolder ? Boolean(expandedFolders[item.id]) : false;
                    const isActive = !isFolder && item.id === activeFileId;

                    return (
                        <div key={item.id} className="explorerTreeItemWrapper">
                            <div
                                className={`explorerRow ${isActive ? 'activeFile' : ''} ${isFolder ? 'folderRow' : 'fileRow'}`}
                                style={{ paddingLeft: `${level * 14 + 10}px` }}
                                onClick={() => {
                                    if (isFolder) {
                                        toggleFolder(item.id);
                                    } else {
                                        onSelectFile(item.id);
                                    }
                                }}
                            >
                                <span className="explorerItemIcon">
                                    {getFileIcon(item.name, isFolder, isExpanded)}
                                </span>
                                <span className="explorerItemName">{item.name}</span>

                                <div className="explorerRowActions" onClick={(e) => e.stopPropagation()}>
                                    {isFolder && (
                                        <button
                                            type="button"
                                            className="rowActionBtn"
                                            onClick={() => handleStartCreate('file', item.id)}
                                        >
                                            +
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="rowActionBtn danger"
                                        onClick={() => onDeleteEntry(item)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Render children if folder is expanded */}
                            {isFolder && isExpanded && renderTree(item.id, level + 1)}

                            {/* Inline creation input inside this folder */}
                            {isFolder && isExpanded && isCreating && createParentId === item.id && (
                                <form
                                    className="explorerInlineForm"
                                    style={{ paddingLeft: `${(level + 1) * 14 + 10}px` }}
                                    onSubmit={handleCreateSubmit}
                                >
                                    <span className="inlineIcon">
                                        {isCreating === 'folder' ? '📁' : '📄'}
                                    </span>
                                    <input
                                        type="text"
                                        autoFocus
                                        className="explorerInlineInput"
                                        placeholder={isCreating === 'folder' ? 'folder-name' : 'filename.js'}
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') setIsCreating(null);
                                        }}
                                        onBlur={() => {
                                            if (!newItemName.trim()) setIsCreating(null);
                                        }}
                                    />
                                </form>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="explorerSidebarContainer">
            <div className="explorerActionBar">
                <span className="explorerSectionTitle">WORKSPACE FILES</span>
                <div className="explorerActionBtnsGroup">
                    <button
                        type="button"
                        className="explorerTopBtn"
                        onClick={() => handleStartCreate('file', null)}
                    >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <line x1="12" y1="11" x2="12" y2="17" />
                            <line x1="9" y1="14" x2="15" y2="14" />
                        </svg>
                        <span>New File</span>
                    </button>
                    <button
                        type="button"
                        className="explorerTopBtn"
                        onClick={() => handleStartCreate('folder', null)}
                    >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            <line x1="12" y1="11" x2="12" y2="17" />
                            <line x1="9" y1="14" x2="15" y2="14" />
                        </svg>
                        <span>New Folder</span>
                    </button>
                </div>
            </div>

            <div className="explorerTreeScrollArea">
                {/* Root level inline creation */}
                {isCreating && createParentId === null && (
                    <form
                        className="explorerInlineForm rootInline"
                        onSubmit={handleCreateSubmit}
                    >
                        <span className="inlineIcon">
                            {isCreating === 'folder' ? '📁' : '📄'}
                        </span>
                        <input
                            type="text"
                            autoFocus
                            className="explorerInlineInput"
                            placeholder={isCreating === 'folder' ? 'folder-name' : 'filename.js'}
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') setIsCreating(null);
                            }}
                            onBlur={() => {
                                if (!newItemName.trim()) setIsCreating(null);
                            }}
                        />
                    </form>
                )}

                {renderTree(null, 0)}

                {files.length === 0 && !isCreating && (
                    <div className="explorerEmptyNotice">
                        <p>No files in workspace.</p>
                        <button
                            type="button"
                            className="createFirstFileBtn"
                            onClick={() => handleStartCreate('file', null)}
                        >
                            + Create index.js
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Explorer;
