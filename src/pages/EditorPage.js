import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor, { getConsistentUserColor } from '../components/Editor';
import Toolbar from '../components/Toolbar';
import Console from '../components/Console';
import Chat from '../components/Chat';
import Explorer from '../components/Explorer';
import { getLanguageByFilename } from '../languages';
import { executeInBrowserJS } from '../services/clientExecutor';
import { initSocket, SOCKET_URL } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const INITIAL_DEFAULT_FILES = [
    { id: 'f_index', name: 'index.js', type: 'file', parentId: null },
];

const EditorPage = () => {
    const socketRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();

    const storedUsername = sessionStorage.getItem(`codesync_user_${roomId}`);
    const username = location.state?.username || storedUsername;

    useEffect(() => {
        if (location.state?.username) {
            sessionStorage.setItem(`codesync_user_${roomId}`, location.state.username);
        }
    }, [location.state?.username, roomId]);

    // Multi-File Workspace State
    const [files, setFiles] = useState(() => {
        try {
            const cached = sessionStorage.getItem(`codesync_files_${roomId}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch {}
        return INITIAL_DEFAULT_FILES;
    });

    const [openFileIds, setOpenFileIds] = useState(() => {
        try {
            const cached = sessionStorage.getItem(`codesync_open_tabs_${roomId}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch {}
        return ['f_index'];
    });

    const [activeFileId, setActiveFileId] = useState(() => {
        return sessionStorage.getItem(`codesync_active_file_${roomId}`) || 'f_index';
    });

    // Save files & tabs to session storage
    useEffect(() => {
        if (roomId) {
            sessionStorage.setItem(`codesync_files_${roomId}`, JSON.stringify(files));
            sessionStorage.setItem(`codesync_open_tabs_${roomId}`, JSON.stringify(openFileIds));
            sessionStorage.setItem(`codesync_active_file_${roomId}`, activeFileId);
        }
    }, [files, openFileIds, activeFileId, roomId]);

    // Collaboration & Room State
    const [clients, setClients] = useState(() => {
        try {
            const cached = sessionStorage.getItem(`codesync_clients_${roomId}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch {}
        return username ? [{
            clientId: 'self',
            username: username,
            color: getConsistentUserColor(username),
            isCurrentUser: true,
            isTyping: false,
        }] : [];
    });
    const [activeSidebarView, setActiveSidebarView] = useState(() => {
        return sessionStorage.getItem('codesync_sidebar_view') || 'explorer';
    });
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [chatMessages, setChatMessages] = useState(() => {
        try {
            const saved = sessionStorage.getItem(`codesync_chat_${roomId}`);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Keep cached chat messages up to date in session storage
    useEffect(() => {
        if (roomId && chatMessages.length > 0) {
            sessionStorage.setItem(`codesync_chat_${roomId}`, JSON.stringify(chatMessages));
        }
    }, [chatMessages, roomId]);

    const handleSidebarViewChange = (view) => {
        setActiveSidebarView(view);
        sessionStorage.setItem('codesync_sidebar_view', view);
        if (view === 'chat') {
            setUnreadChatCount(0);
        }
    };

    // Calculate active language dynamically based on active file's extension and overrides
    const [languageOverrides, setLanguageOverrides] = useState({});
    const currentActiveFile = files.find((f) => f.id === activeFileId) || files.find((f) => f.type === 'file') || files[0];
    const selectedLanguage = languageOverrides[activeFileId] || getLanguageByFilename(currentActiveFile?.name);

    // Editor & Customization State (Persisted in localStorage across refreshes)
    const [selectedTheme, setSelectedTheme] = useState(() => {
        return localStorage.getItem('codesync_theme') || 'dracula';
    });
    const [fontSize, setFontSize] = useState(() => {
        return localStorage.getItem('codesync_fontsize') || '15px';
    });

    const handleThemeSelect = (themeId) => {
        setSelectedTheme(themeId);
        localStorage.setItem('codesync_theme', themeId);
    };

    const handleFontSizeSelect = (size) => {
        setFontSize(size);
        localStorage.setItem('codesync_fontsize', size);
    };

    // Execution & Terminal State
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    const [stdin, setStdin] = useState('');
    const [executionOutput, setExecutionOutput] = useState(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionStatus, setExecutionStatus] = useState(null);
    const [executionTime, setExecutionTime] = useState(null);
    const [compilerName, setCompilerName] = useState(null);

    // Modern In-App Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        confirmVariant: 'primary',
        onConfirm: null,
    });
    const [idCopied, setIdCopied] = useState(false);

    const editorInstanceRef = useRef(null);
    const ytextInstanceRef = useRef(null);
    const onRunCodeRef = useRef(null);

    const handleParticipantsChange = useCallback((participants) => {
        if (Array.isArray(participants) && participants.length > 0) {
            setClients(participants);
            sessionStorage.setItem(`codesync_clients_${roomId}`, JSON.stringify(participants));
        }
    }, [roomId]);

    const handleConnectionStatusChange = useCallback(() => {}, []);

    const handleEditorReady = useCallback((editor, ytext) => {
        editorInstanceRef.current = editor;
        ytextInstanceRef.current = ytext;
    }, []);

    // Send Realtime Chat Message
    const handleSendMessage = useCallback((messageText) => {
        if (!socketRef.current || !messageText.trim()) return;

        const userColor = getConsistentUserColor(username);
        const msgData = {
            roomId,
            message: messageText.trim(),
            username,
            color: userColor,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            id: Date.now() + Math.random().toString(36).substr(2, 9),
        };

        socketRef.current.emit(ACTIONS.SEND_MESSAGE, msgData);
    }, [roomId, username]);

    // Execute Code Handler (Zero-Latency Hybrid Engine)
    const handleRunCode = useCallback(async () => {
        if (!editorInstanceRef.current) return;
        const code = editorInstanceRef.current.getValue();

        if (!code || !code.trim()) {
            toast.error('Editor is empty! Write some code to execute.');
            return;
        }

        setIsExecuting(true);
        setExecutionStatus('running');
        setIsConsoleOpen(true);
        const startTime = performance.now();
        const langKey = selectedLanguage.id?.toLowerCase();

        try {
            let runResult = null;
            let compiler = selectedLanguage.name;
            let execTime = 0;

            // 1. Instant Client-Side Web Worker Sandbox for JavaScript (< 1ms)
            if (langKey === 'javascript' || langKey === 'js') {
                try {
                    const clientRes = await executeInBrowserJS(code, stdin);
                    if (clientRes) {
                        runResult = clientRes;
                        compiler = clientRes.compiler || 'V8 Engine (Browser Sandbox)';
                        execTime = clientRes.executionTime || Math.round(performance.now() - startTime);
                    }
                } catch (clientErr) {
                    console.warn('Client JS sandbox error, falling back to backend:', clientErr);
                }
            }

            // 2. Multi-Tier Production Backend Cascade (Judge0 / Piston / Local Sandbox / Wandbox)
            if (!runResult) {
                const response = await fetch(`${SOCKET_URL}/api/execute`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        language: selectedLanguage.id,
                        code: code,
                        stdin: stdin,
                    }),
                });

                const data = await response.json();
                const elapsed = Math.round(performance.now() - startTime);
                execTime = data?.executionTime || elapsed;
                compiler = data?.compiler || selectedLanguage.name;

                if (data?.run) {
                    runResult = data.run;
                } else if (data?.message) {
                    runResult = { stdout: '', stderr: data.message, code: 1, output: data.message };
                }
            }

            if (runResult) {
                setExecutionTime(execTime);
                setCompilerName(compiler);
                setExecutionOutput(runResult);
                const isSuccess = runResult.code === 0;
                setExecutionStatus(isSuccess ? 'success' : 'error');

                // Broadcast execution result to room collaborators
                socketRef.current?.emit(ACTIONS.CODE_EXECUTED, {
                    roomId,
                    output: runResult,
                    language: selectedLanguage.name,
                    username,
                    status: isSuccess ? 'success' : 'error',
                    executionTime: execTime,
                });
            } else {
                setExecutionOutput({ stderr: 'Unexpected response from execution engine' });
                setExecutionStatus('error');
            }
        } catch (err) {
            console.error('Execution error:', err);
            setExecutionOutput({ stderr: `Execution failed: ${err.message}` });
            setExecutionStatus('error');
        } finally {
            setIsExecuting(false);
        }
    }, [roomId, selectedLanguage, stdin, username]);

    // Keep onRunCodeRef updated so keyboard shortcut Ctrl+Enter runs the latest code
    useEffect(() => {
        onRunCodeRef.current = handleRunCode;
    }, [handleRunCode]);

    // File Selection
    const handleSelectFile = (fileId) => {
        setActiveFileId(fileId);
        if (!openFileIds.includes(fileId)) {
            setOpenFileIds((prev) => [...prev, fileId]);
        }
    };

    // Close File Tab
    const handleCloseFile = (fileIdToClose) => {
        setOpenFileIds((prev) => {
            const next = prev.filter((id) => id !== fileIdToClose);
            if (next.length === 0) {
                const firstFile = files.find((f) => f.type === 'file');
                if (firstFile) {
                    setActiveFileId(firstFile.id);
                    return [firstFile.id];
                }
                return [];
            }
            if (activeFileId === fileIdToClose) {
                const closedIndex = prev.indexOf(fileIdToClose);
                const newActiveIndex = closedIndex > 0 ? closedIndex - 1 : 0;
                setActiveFileId(next[newActiveIndex] || next[0]);
            }
            return next;
        });
    };

    // Create File
    const handleCreateFile = (name, parentId = null) => {
        const newFile = {
            id: 'f_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
            name,
            type: 'file',
            parentId,
        };
        setFiles((prev) => [...prev, newFile]);
        setOpenFileIds((prev) => (prev.includes(newFile.id) ? prev : [...prev, newFile.id]));
        setActiveFileId(newFile.id);
    };

    // Create Folder
    const handleCreateFolder = (name, parentId = null) => {
        const newFolder = {
            id: 'd_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
            name,
            type: 'folder',
            parentId,
        };
        setFiles((prev) => [...prev, newFolder]);
    };

    // Delete Entry (File or Folder)
    const handleDeleteEntry = (item) => {
        setConfirmModal({
            isOpen: true,
            title: `Delete ${item.type === 'folder' ? 'Folder' : 'File'}`,
            message: `Delete '${item.name}'?`,
            confirmText: 'Delete',
            confirmVariant: 'danger',
            onConfirm: () => {
                const idsToDelete = new Set([item.id]);
                const collectDescendants = (parentId) => {
                    files.forEach((f) => {
                        if (f.parentId === parentId) {
                            idsToDelete.add(f.id);
                            if (f.type === 'folder') collectDescendants(f.id);
                        }
                    });
                };
                if (item.type === 'folder') collectDescendants(item.id);

                const remainingFiles = files.filter((f) => !idsToDelete.has(f.id));
                setFiles(remainingFiles);

                const remainingOpen = openFileIds.filter((id) => !idsToDelete.has(id));
                setOpenFileIds(remainingOpen);

                if (idsToDelete.has(activeFileId)) {
                    const nextFile = remainingOpen[0] || remainingFiles.find((f) => f.type === 'file');
                    setActiveFileId(nextFile ? nextFile.id : null);
                }

                setConfirmModal({ isOpen: false });
            },
        });
    };

    const handleNewFileTab = (customName) => {
        let name = typeof customName === 'string' && customName.trim() ? customName.trim() : null;
        if (!name) {
            const existingNames = new Set(files.map((f) => f.name));
            let count = 1;
            while (existingNames.has(`untitled-${count}.js`)) {
                count++;
            }
            name = `untitled-${count}.js`;
        }
        handleCreateFile(name, null);
    };

    // Switch Language (from dropdown)
    const handleLanguageSelect = (lang) => {
        if (activeFileId) {
            setLanguageOverrides((prev) => ({
                ...prev,
                [activeFileId]: lang,
            }));
            setFiles((prev) =>
                prev.map((f) => {
                    if (f.id === activeFileId && f.type === 'file') {
                        const dotIndex = f.name.lastIndexOf('.');
                        const baseName = dotIndex !== -1 ? f.name.substring(0, dotIndex) : f.name;
                        return { ...f, name: `${baseName}.${lang.extension}` };
                    }
                    return f;
                })
            );
        }
        socketRef.current?.emit(ACTIONS.LANGUAGE_CHANGE, {
            roomId,
            language: lang.name,
            username,
        });
    };

    // Load Starter Template with In-App Confirmation
    const handleLoadStarter = () => {
        if (!ytextInstanceRef.current) return;
        const currentVal = ytextInstanceRef.current.toString();
        if (currentVal.trim().length > 0) {
            setConfirmModal({
                isOpen: true,
                title: 'Load Starter Template',
                message: `Replace editor with the ${selectedLanguage.name} starter template?`,
                confirmText: 'Load Template',
                confirmVariant: 'primary',
                onConfirm: () => {
                    ytextInstanceRef.current.delete(0, ytextInstanceRef.current.length);
                    ytextInstanceRef.current.insert(0, selectedLanguage.starter);
                    setConfirmModal({ isOpen: false });
                },
            });
            return;
        }
        ytextInstanceRef.current.insert(0, selectedLanguage.starter);
    };

    // Clear Code with In-App Confirmation
    const handleClearCode = () => {
        if (!ytextInstanceRef.current) return;
        setConfirmModal({
            isOpen: true,
            title: 'Clear Editor',
            message: 'Are you sure you want to clear the editor?',
            confirmText: 'Clear',
            confirmVariant: 'danger',
            onConfirm: () => {
                ytextInstanceRef.current.delete(0, ytextInstanceRef.current.length);
                setConfirmModal({ isOpen: false });
            },
        });
    };

    // Copy Code (Silent clipboard copy)
    const handleCopyCode = async () => {
        if (!editorInstanceRef.current) return;
        const code = editorInstanceRef.current.getValue();
        try {
            await navigator.clipboard.writeText(code);
        } catch {
            toast.error('Failed to copy code');
        }
    };

    // Download Code
    const handleDownloadCode = () => {
        if (!editorInstanceRef.current) return;
        const code = editorInstanceRef.current.getValue();
        const element = document.createElement('a');
        const file = new Blob([code], { type: 'text/plain;charset=utf-8' });
        element.href = URL.createObjectURL(file);
        element.download = currentActiveFile?.name || selectedLanguage.file || `code.${selectedLanguage.extension}`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    // Socket Connection & Lifecycle
    useEffect(() => {
        const handleErrors = (e) => {
            console.log('socket error', e);
            toast.error('Connection interrupted. Reconnecting...');
        };

        const init = async () => {
            const socket = await initSocket();
            socketRef.current = socket;

            socket.on('connect_error', handleErrors);
            socket.on('connect_failed', handleErrors);

            const joinRoom = () => {
                socket.emit(ACTIONS.JOIN, {
                    roomId,
                    username,
                });
            };

            socket.on('connect', joinRoom);

            if (socket.connected) {
                joinRoom();
            }

            // Real-time Event Listeners
            socket.on(ACTIONS.JOINED, ({ username: joinedUser, isReconnecting }) => {
                if (joinedUser !== username && !isReconnecting) {
                    toast.success(`${joinedUser} joined the room.`);
                    setChatMessages((prev) => [
                        ...prev,
                        {
                            id: Date.now() + Math.random().toString(),
                            isSystem: true,
                            message: `${joinedUser} joined the room`,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        },
                    ]);
                }
            });

            socket.on(ACTIONS.DISCONNECTED, ({ username: leftUser }) => {
                if (leftUser && leftUser !== username) {
                    toast(`${leftUser} left the room.`, { icon: '👋' });
                    setChatMessages((prev) => [
                        ...prev,
                        {
                            id: Date.now() + Math.random().toString(),
                            isSystem: true,
                            message: `${leftUser} left the room`,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        },
                    ]);
                }
            });

            socket.on(ACTIONS.SYNC_CHAT_HISTORY, ({ chatHistory }) => {
                if (Array.isArray(chatHistory)) {
                    setChatMessages((prev) => {
                        if (JSON.stringify(prev) === JSON.stringify(chatHistory)) {
                            return prev;
                        }
                        return chatHistory;
                    });
                }
            });

            socket.on(ACTIONS.RECEIVE_MESSAGE, (msgData) => {
                setChatMessages((prev) => [...prev, msgData]);
                setActiveSidebarView((currentView) => {
                    if (currentView !== 'chat') {
                        setUnreadChatCount((count) => count + 1);
                    }
                    return currentView;
                });
            });

            socket.on(ACTIONS.CODE_EXECUTED, ({ username: executor, status, language, executionTime: time }) => {
                toast(`${executor} ran ${language} (${status === 'success' ? '✓' : '✗'} in ${time} ms)`, {
                    icon: status === 'success' ? '⚡' : '⚠️',
                });
            });

            socket.on(ACTIONS.LANGUAGE_CHANGE, () => {});
        };

        init();

        return () => {
            if (socketRef.current) {
                socketRef.current.off('connect_error', handleErrors);
                socketRef.current.off('connect_failed', handleErrors);
                socketRef.current.off('connect');
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off(ACTIONS.SYNC_CHAT_HISTORY);
                socketRef.current.off(ACTIONS.RECEIVE_MESSAGE);
                socketRef.current.off(ACTIONS.CODE_EXECUTED);
                socketRef.current.off(ACTIONS.LANGUAGE_CHANGE);
                socketRef.current.disconnect();
            }
        };
    }, [roomId, username]);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            setIdCopied(true);
            setTimeout(() => setIdCopied(false), 1500);
        } catch (err) {
            toast.error('Could not copy room ID');
        }
    }

    function handleLeaveRoomRequest() {
        setConfirmModal({
            isOpen: true,
            title: 'Leave Session',
            message: 'Are you sure you want to disconnect from this collaborative coding session?',
            confirmText: 'Leave Room',
            confirmVariant: 'danger',
            onConfirm: () => {
                sessionStorage.removeItem(`codesync_user_${roomId}`);
                sessionStorage.removeItem('codesync_sidebar_view');
                if (socketRef.current) {
                    socketRef.current.disconnect();
                }
                reactNavigator('/', { replace: true });
            },
        });
    }

    if (!username) {
        return <Navigate to="/" />;
    }

    const openFiles = openFileIds
        .map((id) => files.find((f) => f.id === id))
        .filter(Boolean);

    return (
        <div className="ideContainer">
            {/* 1. Slim Activity Bar (Far Left) */}
            <div className="activityBar">
                <div className="activityBarTop">
                    {/* Explorer Button */}
                    <button
                        className={`activityBtn ${activeSidebarView === 'explorer' ? 'active' : ''}`}
                        onClick={() => handleSidebarViewChange('explorer')}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                    </button>

                    {/* Collaborators Button */}
                    <button
                        className={`activityBtn ${activeSidebarView === 'collaborators' ? 'active' : ''}`}
                        onClick={() => handleSidebarViewChange('collaborators')}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                        <span className="activityBadge">{Math.max(clients.length, 1)}</span>
                    </button>

                    {/* Live Chat Button */}
                    <button
                        className={`activityBtn ${activeSidebarView === 'chat' ? 'active' : ''}`}
                        onClick={() => handleSidebarViewChange('chat')}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
                        </svg>
                        {unreadChatCount > 0 && (
                            <span className="activityUnreadDot">{unreadChatCount}</span>
                        )}
                    </button>
                </div>

                <div className="activityBarBottom">
                    {/* Leave Room Button */}
                    <button
                        className="activityBtn leave"
                        onClick={handleLeaveRoomRequest}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 2. Primary Sidebar (Explorer, Collaborators, or Chat) */}
            <div className="ideSidebar">
                <div className="sidebarHeader">
                    <div className="sidebarTitleArea">
                        <h2 className="sidebarMainTitle">
                            {activeSidebarView === 'explorer'
                                ? 'EXPLORER'
                                : activeSidebarView === 'collaborators'
                                ? 'COLLABORATORS'
                                : 'LIVE CHAT'}
                        </h2>
                    </div>
                </div>

                <div className="sidebarContentArea">
                    {activeSidebarView === 'explorer' ? (
                        <Explorer
                            files={files}
                            activeFileId={activeFileId}
                            onSelectFile={handleSelectFile}
                            onCreateFile={handleCreateFile}
                            onCreateFolder={handleCreateFolder}
                            onDeleteEntry={handleDeleteEntry}
                        />
                    ) : activeSidebarView === 'collaborators' ? (
                        <div className="collaboratorsView">
                            <div className="collaboratorsList">
                                {clients.map((client) => (
                                    <Client
                                        key={client.clientId}
                                        username={client.username}
                                        color={client.color}
                                        isCurrentUser={client.isCurrentUser}
                                        isTyping={client.isTyping}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <Chat
                            messages={chatMessages}
                            onSendMessage={handleSendMessage}
                            currentUsername={username}
                            currentUserColor={getConsistentUserColor(username)}
                        />
                    )}
                </div>

                {/* Sidebar Bottom Room Actions - Copy Room ID */}
                <div className="sidebarFooterActions">
                    <button className={`copyRoomIdPillBtn ${idCopied ? 'copied' : ''}`} onClick={copyRoomId}>
                        {idCopied ? (
                            <>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Room ID Copied!</span>
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
                                </svg>
                                <span>Copy Room ID</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 3. Main Editor & Console Area */}
            <div className="ideMainArea">
                <Toolbar
                    openFiles={openFiles}
                    activeFileId={activeFileId}
                    onSelectFile={handleSelectFile}
                    onCloseFile={handleCloseFile}
                    onNewFile={handleNewFileTab}
                    selectedLanguage={selectedLanguage}
                    onLanguageSelect={handleLanguageSelect}
                    selectedTheme={selectedTheme}
                    onThemeSelect={handleThemeSelect}
                    fontSize={fontSize}
                    onFontSizeSelect={handleFontSizeSelect}
                    onRunCode={handleRunCode}
                    isRunning={isExecuting}
                    onClearCode={handleClearCode}
                    onCopyCode={handleCopyCode}
                    onDownloadCode={handleDownloadCode}
                    isConsoleOpen={isConsoleOpen}
                    onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
                    onLoadStarter={handleLoadStarter}
                />

                <div className="editorAndConsoleContainer">
                    <Editor
                        roomId={roomId}
                        username={username}
                        activeFileId={activeFileId}
                        language={selectedLanguage}
                        theme={selectedTheme}
                        fontSize={fontSize}
                        onParticipantsChange={handleParticipantsChange}
                        onConnectionStatusChange={handleConnectionStatusChange}
                        onEditorReady={handleEditorReady}
                        onRunCodeRef={onRunCodeRef}
                    />

                    <Console
                        isOpen={isConsoleOpen}
                        onClose={() => setIsConsoleOpen(false)}
                        output={executionOutput}
                        isRunning={isExecuting}
                        status={executionStatus}
                        executionTime={executionTime}
                        compiler={compilerName}
                        stdin={stdin}
                        onStdinChange={setStdin}
                        onClear={() => {
                            setExecutionOutput(null);
                            setExecutionStatus(null);
                            setExecutionTime(null);
                        }}
                    />
                </div>
            </div>

            {/* In-App Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="modalOverlay" onClick={() => setConfirmModal({ isOpen: false })}>
                    <div className="modalCard" onClick={(e) => e.stopPropagation()}>
                        <div className="modalHeader">
                            <h3>{confirmModal.title}</h3>
                            <button
                                className="modalCloseBtn"
                                onClick={() => setConfirmModal({ isOpen: false })}
                            >
                                ✕
                            </button>
                        </div>
                        <p className="modalMessage">{confirmModal.message}</p>
                        <div className="modalActions">
                            <button
                                className="modalCancelBtn"
                                onClick={() => setConfirmModal({ isOpen: false })}
                            >
                                Cancel
                            </button>
                            <button
                                className={`modalConfirmBtn ${confirmModal.confirmVariant || 'primary'}`}
                                onClick={confirmModal.onConfirm}
                            >
                                {confirmModal.confirmText || 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditorPage;
