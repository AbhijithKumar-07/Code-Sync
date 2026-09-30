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
        return sessionStorage.getItem('codesync_draft_username') || localStorage.getItem('codesync_last_username') || '';
    });

    const [showRoomId, setShowRoomId] = useState(false);

    const handleRoomIdChange = (val) => {
        setRoomId(val);
        sessionStorage.setItem('codesync_draft_room_id', val);
    };

    const handleUsernameChange = (val) => {
        setUsername(val);
        sessionStorage.setItem('codesync_draft_username', val);
        localStorage.setItem('codesync_last_username', val);
    };

    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidV4();
        handleRoomIdChange(id);
        setShowRoomId(true);
        toast.success('Created a New Room');
    };

    const joinRoom = () => {
        if (!roomId || !username) {
            toast.error('Room ID & Username Is Required');
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
                <img
                    className="homePageLogo"
                    src="/code-sync.png"
                    alt="code-sync-logo"
                />
                <h4 className="mainLabel">Paste Invitation Room ID</h4>
                <div className="inputGroup">
                    <div className="roomIdInputWrapper">
                        <input
                            type={showRoomId ? 'text' : 'password'}
                            className="inputBox roomIdInput"
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
                                aria-label={showRoomId ? 'Hide Room ID' : 'Show Room ID'}
                                tabIndex={-1}
                            >
                                {showRoomId ? (
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="USERNAME"
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        value={username}
                        onKeyUp={handleInputEnter}
                    />
                    <button className="btn joinBtn" onClick={joinRoom}>
                        JOIN
                    </button>
                    <span className="createInfo">
                        If You Don't Have An Invite Then Create &nbsp;
                        <button
                            type="button"
                            onClick={createNewRoom}
                            className="createNewBtn"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                            New Room
                        </button>
                    </span>
                </div>
            </div>
            <footer>
                <h4>
                    Built With 🩷 By &nbsp;
                    <a href="https://github.com/AbhijithKumar-07" target="_blank" rel="noreferrer">Abhijith Kumar</a>
                </h4>
            </footer>
        </div>
    );
};

export default Home;
