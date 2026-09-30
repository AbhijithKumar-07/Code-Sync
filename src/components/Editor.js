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
        if (!ydocRef.current || !editorRef.current || !providerRef.current || !activeFileId) return;

        // Destroy previous file binding
        if (bindingRef.current) {
            bindingRef.current.destroy();
        }

        const ytext = ydocRef.current.getText('file_' + activeFileId);
        if (ytext.length === 0 && language && language.starter) {
            ytext.insert(0, language.starter);
        }

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

        const initialFileId = activeFileId || 'f_index';
        const ytext = ydoc.getText('file_' + initialFileId);
        if (ytext.length === 0 && language && language.starter) {
            ytext.insert(0, language.starter);
        }

        const binding = new CodemirrorBinding(
            ytext,
            editorRef.current,
            provider.awareness
        );
        bindingRef.current = binding;

        if (onEditorReady) {
            onEditorReady(editorRef.current, ytext, ydoc);
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
            <textarea id="realtimeEditor"></textarea>
        </div>
    );
};

export default Editor;
