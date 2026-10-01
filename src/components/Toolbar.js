import React, { useState, useRef, useEffect } from 'react';
import { LANGUAGES, THEMES, FONT_SIZES, getFileIcon } from '../languages';

const Toolbar = ({
    openFiles = [],
    activeFileId,
    onSelectFile,
    onCloseFile,
    onNewFile,
    selectedLanguage,
    onLanguageSelect,
    selectedTheme,
    onThemeSelect,
    fontSize,
    onFontSizeSelect,
    onRunCode,
    isRunning,
    onClearCode,
    onCopyCode,
    onDownloadCode,
    isConsoleOpen,
    onToggleConsole,
    onLoadStarter,
}) => {
    const [openDropdown, setOpenDropdown] = useState(null); // 'lang' | 'theme' | 'font' | null
    const [copiedRecently, setCopiedRecently] = useState(false);
    const [isCreatingTab, setIsCreatingTab] = useState(false);
    const [newTabName, setNewTabName] = useState('');
    const newTabInputRef = useRef(null);
    const tabsListRef = useRef(null);
    const toolbarRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isCreatingTab && newTabInputRef.current) {
            newTabInputRef.current.focus();
        }
    }, [isCreatingTab]);

    const handleCopy = () => {
        onCopyCode();
        setCopiedRecently(true);
        setTimeout(() => setCopiedRecently(false), 1500);
    };

    const handleCreateTabSubmit = (e) => {
        e?.preventDefault();
        const trimmed = newTabName.trim();
        if (trimmed) {
            onNewFile(trimmed);
        }
        setIsCreatingTab(false);
        setNewTabName('');
    };

    return (
        <div className="editorHeaderBar" ref={toolbarRef}>
            {/* Left: Scrollable Tabs Container with Always-Accessible '+' Button */}
            <div className="editorTabsArea">
                <div
                    className="editorFileTabsList"
                    ref={tabsListRef}
                    onWheel={(e) => {
                        if (tabsListRef.current) {
                            tabsListRef.current.scrollLeft += e.deltaY;
                        }
                    }}
                >
                    {openFiles.map((file) => {
                        const isActive = file.id === activeFileId;
                        return (
                            <div
                                key={file.id}
                                className={`editorTabItem ${isActive ? 'active' : ''}`}
                                onClick={() => onSelectFile(file.id)}
                            >
                                <span className="tabFileIcon">{getFileIcon(file.name)}</span>
                                <span className="tabFileName">{file.name}</span>
                                {openFiles.length > 1 && (
                                    <button
                                        type="button"
                                        className="tabCloseBtn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCloseFile(file.id);
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {/* Inline Tab Creation Form (like VS Code) */}
                    {isCreatingTab && (
                        <form className="editorTabItem newTabInputForm" onSubmit={handleCreateTabSubmit}>
                            <span className="tabFileIcon">{newTabName ? getFileIcon(newTabName) : '📄'}</span>
                            <input
                                ref={newTabInputRef}
                                type="text"
                                className="newTabInlineInput"
                                placeholder="filename.js"
                                value={newTabName}
                                onChange={(e) => setNewTabName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        setIsCreatingTab(false);
                                        setNewTabName('');
                                    }
                                }}
                                onBlur={() => {
                                    if (newTabName.trim()) {
                                        handleCreateTabSubmit();
                                    } else {
                                        setIsCreatingTab(false);
                                    }
                                }}
                            />
                        </form>
                    )}
                </div>

                {/* Always-Accessible New Tab Button */}
                <button
                    type="button"
                    className="newFileTabBtn"
                    onClick={() => {
                        setIsCreatingTab(true);
                        setNewTabName('');
                    }}
                >
                    +
                </button>
            </div>

            {/* Right: Custom Dropdowns, Actions & Execution */}
            <div className="editorActionControls">
                {/* 1. Custom Dropdowns Group */}
                <div className="toolbarSelectGroup">
                    {/* Language Dropdown */}
                    <div className="customDropdownWrapper">
                        <button
                            type="button"
                            className={`customDropdownTrigger ${openDropdown === 'lang' ? 'open' : ''}`}
                            onClick={() => setOpenDropdown(openDropdown === 'lang' ? null : 'lang')}
                            disabled={!activeFileId}
                            title={!activeFileId ? 'No file open' : 'Select language'}
                        >
                            <span className="triggerIcon">{selectedLanguage?.icon || '📝'}</span>
                            <span className="triggerLabel">{selectedLanguage?.name || 'Language'}</span>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" className="chevronIcon">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {openDropdown === 'lang' && (
                            <div className="customDropdownMenu langMenu">
                                <div className="dropdownHeaderTitle">SELECT LANGUAGE</div>
                                <div className="dropdownItemsList">
                                    {LANGUAGES.map((lang) => (
                                        <button
                                            key={lang.id}
                                            type="button"
                                            className={`dropdownMenuItem ${lang.id === selectedLanguage.id ? 'selected' : ''}`}
                                            onClick={() => {
                                                onLanguageSelect(lang);
                                                setOpenDropdown(null);
                                            }}
                                        >
                                            <span className="itemIcon">{lang.icon}</span>
                                            <span className="itemName">{lang.name}</span>
                                            {lang.id === selectedLanguage.id && (
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#4aed88" strokeWidth="2.5" className="checkIcon">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Theme Dropdown */}
                    <div className="customDropdownWrapper">
                        <button
                            type="button"
                            className={`customDropdownTrigger ${openDropdown === 'theme' ? 'open' : ''}`}
                            onClick={() => setOpenDropdown(openDropdown === 'theme' ? null : 'theme')}
                            disabled={!activeFileId}
                            title={!activeFileId ? 'No file open' : 'Select theme'}
                        >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" className="triggerIcon">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                            <span className="triggerLabel">
                                {THEMES.find((t) => t.id === selectedTheme)?.name || 'Dracula'}
                            </span>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" className="chevronIcon">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {openDropdown === 'theme' && (
                            <div className="customDropdownMenu themeMenu">
                                <div className="dropdownHeaderTitle">COLOR THEME</div>
                                <div className="dropdownItemsList">
                                    {THEMES.map((theme) => (
                                        <button
                                            key={theme.id}
                                            type="button"
                                            className={`dropdownMenuItem ${theme.id === selectedTheme ? 'selected' : ''}`}
                                            onClick={() => {
                                                onThemeSelect(theme.id);
                                                setOpenDropdown(null);
                                            }}
                                        >
                                            <span className="itemName">{theme.name}</span>
                                            {theme.id === selectedTheme && (
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#4aed88" strokeWidth="2.5" className="checkIcon">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Font Size Dropdown */}
                    <div className="customDropdownWrapper">
                        <button
                            type="button"
                            className={`customDropdownTrigger ${openDropdown === 'font' ? 'open' : ''}`}
                            onClick={() => setOpenDropdown(openDropdown === 'font' ? null : 'font')}
                            disabled={!activeFileId}
                            title={!activeFileId ? 'No file open' : 'Select font size'}
                        >
                            <span className="fontGlyph">Aa</span>
                            <span className="triggerLabel">{fontSize}</span>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" className="chevronIcon">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {openDropdown === 'font' && (
                            <div className="customDropdownMenu fontMenu">
                                <div className="dropdownHeaderTitle">FONT SIZE</div>
                                <div className="dropdownItemsList">
                                    {FONT_SIZES.map((size) => (
                                        <button
                                            key={size}
                                            type="button"
                                            className={`dropdownMenuItem ${size === fontSize ? 'selected' : ''}`}
                                            onClick={() => {
                                                onFontSizeSelect(size);
                                                setOpenDropdown(null);
                                            }}
                                        >
                                            <span className="itemName">{size}</span>
                                            {size === fontSize && (
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#4aed88" strokeWidth="2.5" className="checkIcon">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="actionDivider" />

                {/* 2. Quick Editor Utility Buttons */}
                <div className="toolbarButtonsGroup">
                    {/* ONLY icon with hover text: Load Starter Template */}
                    <button
                        type="button"
                        className="actionBtn iconOnly"
                        onClick={onLoadStarter}
                        title="Load Starter Template"
                        disabled={!activeFileId}
                    >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="12" y1="18" x2="12" y2="12" />
                            <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        className="actionBtn iconOnly"
                        onClick={handleCopy}
                        disabled={!activeFileId}
                    >
                        {copiedRecently ? (
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#4aed88" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        )}
                    </button>

                    <button
                        type="button"
                        className="actionBtn iconOnly"
                        onClick={onDownloadCode}
                        disabled={!activeFileId}
                    >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        className="actionBtn iconOnly dangerHover"
                        onClick={onClearCode}
                        disabled={!activeFileId}
                    >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </button>

                    {/* Integrated Terminal Toggle Button */}
                    <button
                        type="button"
                        className={`actionBtn iconWithText ${isConsoleOpen ? 'activeTerminal' : ''}`}
                        onClick={onToggleConsole}
                    >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="4 17 10 11 4 5" />
                            <line x1="12" y1="19" x2="20" y2="19" />
                        </svg>
                        <span>Terminal</span>
                    </button>
                </div>

                <div className="actionDivider" />

                {/* 3. Run Code Button */}
                <button
                    type="button"
                    className={`actionBtn runBtn ${isRunning ? 'running' : ''}`}
                    onClick={onRunCode}
                    disabled={isRunning || !activeFileId}
                >
                    {isRunning ? (
                        <>
                            <span className="runSpinner" />
                            <span>Running</span>
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" className="runPlayIcon">
                                <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            <span>Run</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
