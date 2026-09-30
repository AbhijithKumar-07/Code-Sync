import React, { useState, useEffect, useRef } from 'react';
import { getConsistentUserColor } from './Editor';

const Chat = ({ messages, onSendMessage, currentUsername, currentUserColor }) => {
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);
    const isFirstMount = useRef(true);

    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSubmit = (e) => {
        e?.preventDefault();
        const trimmed = inputMessage.trim();
        if (!trimmed) return;
        onSendMessage(trimmed);
        setInputMessage('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="modernChatContainer">
            {/* Messages Scroll Area */}
            <div className="modernChatMessagesList">
                {messages.length === 0 ? (
                    <div className="emptyChatState">
                        <div className="emptyChatIconWrapper">
                            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h4>Room Discussion</h4>
                        <p>Send messages, share thoughts, or drop code snippets with your team.</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        if (msg.isSystem) {
                            return (
                                <div key={msg.id} className="systemEventPill">
                                    <span className="systemEventIcon">⚡</span>
                                    <span className="systemEventText">{msg.message}</span>
                                    <span className="systemEventTime">{msg.time}</span>
                                </div>
                            );
                        }

                        const isMe = msg.username === currentUsername;
                        const initial = (msg.username || '?').charAt(0).toUpperCase();
                        const userColor = isMe
                            ? (currentUserColor || getConsistentUserColor(currentUsername))
                            : (msg.color || getConsistentUserColor(msg.username));

                        return (
                            <div
                                key={msg.id}
                                className={`chatMessageRow ${isMe ? 'outgoing' : 'incoming'}`}
                            >
                                {!isMe && (
                                    <div
                                        className="chatAvatar"
                                        style={{ backgroundColor: userColor }}
                                    >
                                        {initial}
                                    </div>
                                )}

                                <div className="chatBubbleWrapper">
                                    <div className="chatBubbleHeader">
                                        <span
                                            className="chatBubbleSender"
                                            style={{ color: isMe ? '#4aed88' : userColor }}
                                        >
                                            {isMe ? 'You' : msg.username}
                                        </span>
                                        <span className="chatBubbleTime">{msg.time}</span>
                                    </div>
                                    <div className="chatBubbleBody">
                                        {msg.message}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input Form */}
            <form className="modernChatInputForm" onSubmit={handleSubmit}>
                <div className="inputBoxWrapper">
                    <input
                        type="text"
                        className="modernChatInput"
                        placeholder="Type a message... (Press Enter)"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        type="submit"
                        className="modernChatSendBtn"
                        title="Send message (Enter)"
                        disabled={!inputMessage.trim()}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chat;
