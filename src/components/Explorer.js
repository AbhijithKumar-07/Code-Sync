import React, { useState } from 'react';
import { getFileIcon } from '../languages';

const Explorer = ({
    files,
    activeFileId,
    onSelectFile,
    onCreateFile,
    onCreateFolder,
    onDeleteEntry,
    onRenameEntry,
}) => {
    const [isCreating, setIsCreating] = useState(null); // 'file' | 'folder' | null
    const [createParentId, setCreateParentId] = useState(null);
    const [newItemName, setNewItemName] = useState('');
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [expandedFolders, setExpandedFolders] = useState({ root: true });
    const [isWorkspaceCollapsed, setIsWorkspaceCollapsed] = useState(false);

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
        setRenamingId(null);
        if (parentId) {
            setExpandedFolders((prev) => ({ ...prev, [parentId]: true }));
        }
        if (isWorkspaceCollapsed) {
            setIsWorkspaceCollapsed(false);
        }
    };

    const handleStartRename = (item, e) => {
        e?.stopPropagation();
        setRenamingId(item.id);
        setRenameValue(item.name);
        setIsCreating(null);
    };

    const handleRenameSubmit = (itemId, e) => {
        e?.preventDefault();
        const trimmed = renameValue.trim();
        if (trimmed && onRenameEntry) {
            onRenameEntry(itemId, trimmed);
        }
        setRenamingId(null);
        setRenameValue('');
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
                    const isRenamingThis = renamingId === item.id;

                    return (
                        <div key={item.id} className="explorerTreeItemWrapper">
                            <div
                                className={`explorerRow ${isActive ? 'activeFile' : ''} ${isFolder ? 'folderRow' : 'fileRow'}`}
                                style={{ paddingLeft: `${level * 14 + 10}px` }}
                                onClick={() => {
                                    if (isRenamingThis) return;
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

                                {isRenamingThis ? (
                                    <form
                                        className="explorerInlineRenameForm"
                                        onSubmit={(e) => handleRenameSubmit(item.id, e)}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <input
                                            type="text"
                                            autoFocus
                                            className="explorerRenameInput"
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') {
                                                    setRenamingId(null);
                                                }
                                            }}
                                            onBlur={() => handleRenameSubmit(item.id)}
                                        />
                                    </form>
                                ) : (
                                    <span
                                        className="explorerItemName"
                                        title={`${item.name} (Double-click to rename)`}
                                        onDoubleClick={(e) => handleStartRename(item, e)}
                                    >
                                        {item.name}
                                    </span>
                                )}

                                <div className="explorerRowActions" onClick={(e) => e.stopPropagation()}>
                                    {isFolder && (
                                        <>
                                            <button
                                                type="button"
                                                className="rowActionBtn"
                                                title="New File Inside"
                                                onClick={() => handleStartCreate('file', item.id)}
                                            >
                                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <line x1="12" y1="11" x2="12" y2="17" />
                                                    <line x1="9" y1="14" x2="15" y2="14" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                className="rowActionBtn"
                                                title="New Folder Inside"
                                                onClick={() => handleStartCreate('folder', item.id)}
                                            >
                                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                                    <line x1="12" y1="11" x2="12" y2="17" />
                                                    <line x1="9" y1="14" x2="15" y2="14" />
                                                </svg>
                                            </button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        className="rowActionBtn"
                                        title={`Rename ${isFolder ? 'Folder' : 'File'}`}
                                        onClick={(e) => handleStartRename(item, e)}
                                    >
                                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        className="rowActionBtn danger"
                                        title={`Delete ${isFolder ? 'Folder' : 'File'}`}
                                        onClick={() => onDeleteEntry(item)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Render inline creation form inside this folder if active */}
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
                                        placeholder={isCreating === 'folder' ? 'subfolder-name' : 'filename.js'}
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

                            {/* Render children if folder is expanded */}
                            {isFolder && isExpanded && renderTree(item.id, level + 1)}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="explorerSidebarContainer">
            {/* Clean Section Header (VS Code Style) */}
            <div className="explorerSectionHeader">
                <div 
                    className="sectionTitleGroup"
                    onClick={() => setIsWorkspaceCollapsed((prev) => !prev)}
                >
                    <span className={`sectionChevronSvg ${isWorkspaceCollapsed ? 'collapsed' : ''}`}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </span>
                    <span className="explorerSectionTitle">WORKSPACE</span>
                </div>
                <div className="explorerActionBtnsGroup">
                    <button
                        type="button"
                        className="explorerActionIconBtn"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStartCreate('file', null);
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <line x1="12" y1="11" x2="12" y2="17" />
                            <line x1="9" y1="14" x2="15" y2="14" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className="explorerActionIconBtn"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStartCreate('folder', null);
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            <line x1="12" y1="11" x2="12" y2="17" />
                            <line x1="9" y1="14" x2="15" y2="14" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Tree Area */}
            {!isWorkspaceCollapsed && (
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
                        <div className="explorerEmptyStateCard">
                            <div className="emptyStateIconBox">
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="12" y1="12" x2="12" y2="16" />
                                    <line x1="10" y1="14" x2="14" y2="14" />
                                </svg>
                            </div>
                            <h4 className="emptyStateTitle">No Files in Workspace</h4>
                            <p className="emptyStateSubtitle">Create a file or folder to start collaborating</p>
                            <div className="emptyStateActionRow">
                                <button
                                    type="button"
                                    className="emptyCreateFileBtn"
                                    onClick={() => handleStartCreate('file', null)}
                                >
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <line x1="12" y1="11" x2="12" y2="17" />
                                        <line x1="9" y1="14" x2="15" y2="14" />
                                    </svg>
                                    <span>New File</span>
                                </button>
                                <button
                                    type="button"
                                    className="emptyCreateFolderBtn"
                                    onClick={() => handleStartCreate('folder', null)}
                                >
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                        <line x1="12" y1="11" x2="12" y2="17" />
                                        <line x1="9" y1="14" x2="15" y2="14" />
                                    </svg>
                                    <span>New Folder</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Explorer;
