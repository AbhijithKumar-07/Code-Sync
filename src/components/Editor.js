import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import * as Y from 'yjs';
import { SocketIOProvider } from 'y-socket.io';
import { CodemirrorBinding } from 'y-codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import { SOCKET_URL } from '../socket';

const getUserColor = (clientId) => `hsl(${clientId % 360}, 75%, 55%)`;

const Editor = ({
    roomId,
    username,
    onParticipantsChange,
    onConnectionStatusChange,
}) => {
    const editorRef = useRef(null);

    useEffect(() => {
        const ydoc = new Y.Doc();
        const provider = new SocketIOProvider(
            SOCKET_URL,
            roomId,
            ydoc,
            { resyncInterval: 10000 },
            { transports: ['websocket'] }
        );
        const ytext = ydoc.getText('codemirror');

        editorRef.current = Codemirror.fromTextArea(
            document.getElementById('realtimeEditor'),
            {
                mode: { name: 'javascript', json: true },
                theme: 'dracula',
                autoCloseTags: true,
                autoCloseBrackets: true,
                lineNumbers: true,
            }
        );

        provider.awareness.setLocalStateField('user', {
            name: username,
            color: getUserColor(ydoc.clientID),
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

        const binding = new CodemirrorBinding(
            ytext,
            editorRef.current,
            provider.awareness
        );
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
            editorRef.current.off('changes', handleEditorChanges);
            provider.awareness.off('change', updateParticipants);
            provider.off('status', handleStatus);
            binding.destroy();
            editorRef.current.toTextArea();
            editorRef.current = null;
            provider.destroy();
            ydoc.destroy();
        };
    }, [
        roomId,
        username,
        onParticipantsChange,
        onConnectionStatusChange,
    ]);

    return <textarea id="realtimeEditor"></textarea>;
};

export default Editor;
