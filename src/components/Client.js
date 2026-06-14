import React from 'react';
import Avatar from 'react-avatar';

const Client = ({ username, color, isCurrentUser, isTyping }) => {
    return (
        <div className={`client ${isTyping ? 'typing' : ''}`}>
            <Avatar
                name={username}
                size={42}
                round="12px"
                color={color}
            />
            <div className="clientInfo">
                <span className="userName">{username}</span>
                <span className="clientPresence">
                    <span
                        className="presenceDot"
                        style={{ backgroundColor: color }}
                    />
                    {isTyping ? 'Typing now' : isCurrentUser ? 'You' : 'Online'}
                </span>
            </div>
        </div>
    );
};

export default Client;
