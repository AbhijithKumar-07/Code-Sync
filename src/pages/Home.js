import React, { useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();

    const [roomId, setRoomId] = useState(() => {
        return sessionStorage.getItem('codesync_draft_room_id') || '';
    });
    const [username, setUsername] = useState(() => {
        return sessionStorage.getItem('codesync_draft_username') || '';
    });

    const [showRoomId, setShowRoomId] = useState(false);

    const handleRoomIdChange = (val) => {
        setRoomId(val);
        if (val) {
            sessionStorage.setItem('codesync_draft_room_id', val);
        } else {
            sessionStorage.removeItem('codesync_draft_room_id');
        }
    };

    const handleUsernameChange = (val) => {
        setUsername(val);
        if (val) {
            sessionStorage.setItem('codesync_draft_username', val);
        } else {
            sessionStorage.removeItem('codesync_draft_username');
        }
    };

    const createNewRoom = (e) => {
        e.preventDefault();
        if (roomId && roomId.trim().length > 0) {
            toast('Room ID is already generated! Enter username to join.', {
                id: 'room-gen-toast',
                icon: '🔑',
            });
            return;
        }
        const id = uuidV4();
        handleRoomIdChange(id);
        toast.success('Generated New Room ID', {
            id: 'room-gen-toast',
        });
    };

    const joinRoom = () => {
        if (!roomId || !username) {
            toast.error('Room ID & Username are required', {
                id: 'room-join-toast',
            });
            return;
        }

        sessionStorage.setItem('codesync_draft_room_id', roomId);
        sessionStorage.setItem('codesync_draft_username', username);
        localStorage.setItem('codesync_last_username', username);

        // Redirect
        navigate(`/editor/${roomId}`, {
            state: {
                username,
            },
        });
    };

    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    };

    return (
        <div className="homePageWrapper">
            <div className="formWrapper">
                <div className="logoHeader">
                    <img
                        className="homePageLogo"
                        src="/code-sync.png"
                        alt="code-sync-logo"
                    />
                </div>

                <div className="homeFormHeader">
                    <p className="mainSubLabel">Enter a room ID and your name to join live collaboration</p>
                </div>

                <div className="inputGroup">
                    <div className="inputFieldWrapper">
                        <div className="inputWithIconWrapper">
                            <span className="inputLeadingIcon">
                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="4" y1="9" x2="20" y2="9" />
                                    <line x1="4" y1="15" x2="20" y2="15" />
                                    <line x1="10" y1="3" x2="8" y2="21" />
                                    <line x1="16" y1="3" x2="14" y2="21" />
                                </svg>
                            </span>
                            <input
                                type={showRoomId ? 'text' : 'password'}
                                className={`inputBox withIcon ${!showRoomId && roomId ? 'isMasked' : ''}`}
                                placeholder="ROOM ID"
                                onChange={(e) => handleRoomIdChange(e.target.value)}
                                value={roomId}
                                onKeyUp={handleInputEnter}
                                autoComplete="off"
                                spellCheck="false"
                            />
                            {roomId && (
                                <button
                                    type="button"
                                    className="toggleVisibilityBtn"
                                    onClick={() => setShowRoomId((prev) => !prev)}
                                    title={showRoomId ? 'Hide Room ID' : 'Show Room ID'}
                                    tabIndex={-1}
                                >
                                    {showRoomId ? (
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="inputFieldWrapper">
                        <div className="inputWithIconWrapper">
                            <span className="inputLeadingIcon">
                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                className="inputBox withIcon"
                                placeholder="USERNAME"
                                onChange={(e) => handleUsernameChange(e.target.value)}
                                value={username}
                                onKeyUp={handleInputEnter}
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <button className="btn joinBtn" onClick={joinRoom}>
                        <span>JOIN ROOM</span>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </button>

                    <div className="createRoomHelper">
                        <span className="createPrompt">Don't have an invite?</span>
                        <button
                            type="button"
                            onClick={createNewRoom}
                            className="createNewRoomBtn"
                        >
                            <span>Create New Room</span>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <footer className="homeFooter">
                <div className="footerPill">
                    <span className="footerText">Built with</span>
                    <span className="heartIcon">🩷</span>
                    <span className="footerText">by</span>
                    <a
                        href="https://github.com/AbhijithKumar-07"
                        target="_blank"
                        rel="noreferrer"
                        className="authorLink"
                    >
                        <span>Abhijith Kumar</span>
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="7" y1="17" x2="17" y2="7" />
                            <polyline points="7 7 17 7 17 17" />
                        </svg>
                    </a>
                </div>
            </footer>
        </div>
    );
};

export default Home;
