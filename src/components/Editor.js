import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import * as Y from 'yjs';
import { SocketIOProvider } from 'y-socket.io';
import { CodemirrorBinding } from 'y-codemirror';

import 'codemirror/lib/codemirror.css';
// Themes
import 'codemirror/theme/dracula.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/theme/material-darker.css';
import 'codemirror/theme/nord.css';
import 'codemirror/theme/eclipse.css';
import 'codemirror/theme/gruvbox-dark.css';

// Syntax Modes
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/python/python';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/go/go';
import 'codemirror/mode/rust/rust';

// Addons
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';

import { SOCKET_URL } from '../socket';

export const getConsistentUserColor = (username) => {
    if (!username) return '#4aed88';
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 75%, 55%)`;
};

const Editor = ({
    roomId,
    username,
    activeFileId,
    language,
    theme,
    fontSize,
    onParticipantsChange,
    onConnectionStatusChange,
    onEditorReady,
    onRunCodeRef,
    onNewFile,
}) => {
    const editorRef = useRef(null);
    const providerRef = useRef(null);
    const ydocRef = useRef(null);
    const bindingRef = useRef(null);

    // Dynamic mode/theme updates without recreating Yjs binding
    useEffect(() => {
        if (editorRef.current && language) {
            editorRef.current.setOption('mode', language.mode || { name: 'javascript', json: true });
        }
    }, [language]);

    useEffect(() => {
        if (editorRef.current && theme) {
            editorRef.current.setOption('theme', theme);
        }
    }, [theme]);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.refresh();
        }
    }, [fontSize]);

    // Handle dynamic file switching
    useEffect(() => {
        if (!ydocRef.current || !editorRef.current || !providerRef.current) return;

        // Destroy previous file binding
        if (bindingRef.current) {
            bindingRef.current.destroy();
            bindingRef.current = null;
        }

        if (!activeFileId) {
            editorRef.current.setValue('');
            if (onEditorReady) {
                onEditorReady(editorRef.current, null, ydocRef.current);
            }
            return;
        }

        const ytext = ydocRef.current.getText('file_' + activeFileId);

        const binding = new CodemirrorBinding(
            ytext,
            editorRef.current,
            providerRef.current.awareness
        );
        bindingRef.current = binding;

        if (onEditorReady) {
            onEditorReady(editorRef.current, ytext, ydocRef.current);
        }
    }, [activeFileId, language, onEditorReady]);

    useEffect(() => {
        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;

        const provider = new SocketIOProvider(
            SOCKET_URL,
            roomId,
            ydoc,
            { resyncInterval: 10000 },
            { transports: ['websocket'] }
        );
        providerRef.current = provider;

        editorRef.current = Codemirror.fromTextArea(
            document.getElementById('realtimeEditor'),
            {
                mode: language?.mode || { name: 'javascript', json: true },
                theme: theme || 'dracula',
                autoCloseTags: true,
                autoCloseBrackets: true,
                lineNumbers: true,
                extraKeys: {
                    'Ctrl-Enter': () => {
                        onRunCodeRef?.current?.();
                    },
                    'Cmd-Enter': () => {
                        onRunCodeRef?.current?.();
                    },
                },
            }
        );

        if (activeFileId) {
            const ytext = ydoc.getText('file_' + activeFileId);
            const binding = new CodemirrorBinding(
                ytext,
                editorRef.current,
                provider.awareness
            );
            bindingRef.current = binding;

            if (onEditorReady) {
                onEditorReady(editorRef.current, ytext, ydoc);
            }
        } else {
            editorRef.current.setValue('');
            if (onEditorReady) {
                onEditorReady(editorRef.current, null, ydoc);
            }
        }

        provider.awareness.setLocalStateField('user', {
            name: username,
            color: getConsistentUserColor(username),
            isTyping: false,
        });

        const updateParticipants = () => {
            const participants = Array.from(
                provider.awareness.getStates().entries()
            )
                .filter(([, state]) => state.user)
                .map(([clientId, state]) => ({
                    clientId,
                    username: state.user.name,
                    color: state.user.color,
                    isTyping: Boolean(state.user.isTyping),
                    isCurrentUser: clientId === ydoc.clientID,
                }))
                .sort((left, right) =>
                    left.username.localeCompare(right.username)
                );

            onParticipantsChange(participants);
        };

        const handleStatus = ({ status }) => {
            onConnectionStatusChange(status);
        };

        let typingTimeout;
        const setTypingState = (isTyping) => {
            const localState = provider.awareness.getLocalState();
            if (!localState?.user || localState.user.isTyping === isTyping) {
                return;
            }
            provider.awareness.setLocalStateField('user', {
                ...localState.user,
                isTyping,
            });
        };

        const handleEditorChanges = (instance, changes) => {
            const isLocalChange = changes.some(
                (change) => change.origin !== 'y-codemirror'
            );
            if (!isLocalChange) {
                return;
            }

            setTypingState(true);
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => setTypingState(false), 900);
        };

        provider.awareness.on('change', updateParticipants);
        provider.on('status', handleStatus);
        editorRef.current.on('changes', handleEditorChanges);
        updateParticipants();

        return () => {
            clearTimeout(typingTimeout);
            if (bindingRef.current) {
                bindingRef.current.destroy();
                bindingRef.current = null;
            }
            if (editorRef.current) {
                editorRef.current.off('changes', handleEditorChanges);
                editorRef.current.toTextArea();
                editorRef.current = null;
            }
            provider.awareness.off('change', updateParticipants);
            provider.off('status', handleStatus);
            provider.destroy();
            ydoc.destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        roomId,
        username,
        onParticipantsChange,
        onConnectionStatusChange,
        onRunCodeRef,
    ]);

    return (
        <div className="editorInnerWrapper" style={{ fontSize: fontSize || '16px' }}>
            <div className={`editorCodeAreaWrapper ${activeFileId ? 'active' : 'hidden'}`}>
                <textarea id="realtimeEditor"></textarea>
            </div>
            {!activeFileId && (
                <div className="emptyEditorState">
                    <div className="emptyEditorGlowBackdrop" />
                    <div className="emptyEditorIconCard">
                        <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="emptyStateFolderIcon">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="9" y1="13" x2="15" y2="13" />
                            <line x1="9" y1="17" x2="13" y2="17" />
                        </svg>
                    </div>
                    <h3 className="emptyEditorTitle">No Open Files</h3>
                    <p className="emptyEditorSubtitle">
                        Create a new file or select an existing file from the workspace explorer to start coding.
                    </p>
                    {onNewFile && (
                        <button
                            type="button"
                            className="emptyEditorNewFileBtn"
                            onClick={() => onNewFile()}
                        >
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            <span>New File</span>
                        </button>
                    )}
                    <div className="emptyEditorShortcutsRow">
                        <div className="shortcutPill">
                            <span className="shortcutKeys"><kbd>Ctrl</kbd> + <kbd>Enter</kbd></span>
                            <span className="shortcutDesc">Run Code</span>
                        </div>
                        <div className="shortcutPill">
                            <span className="shortcutIndicatorDot" />
                            <span className="shortcutDesc">Real-Time Sync Active</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Editor;
