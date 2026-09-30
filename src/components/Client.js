import React from 'react';
import Avatar from 'react-avatar';
import { getConsistentUserColor } from './Editor';

const Client = ({ username, color, isCurrentUser, isTyping }) => {
    const userColor = color || getConsistentUserColor(username);
    return (
        <div className={`client ${isTyping ? 'typing' : ''}`}>
            <Avatar
                name={username}
                size={38}
                round="10px"
                color={userColor}
            />
            <div className="clientInfo">
                <span className="userName">{username}</span>
                <span className="clientPresence">
                    {isTyping ? 'Typing now...' : isCurrentUser ? 'You' : 'Member'}
                </span>
            </div>
        </div>
    );
};

export default Client;

