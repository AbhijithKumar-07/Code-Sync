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
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="ROOM ID"
                        onChange={(e) => handleRoomIdChange(e.target.value)}
                        value={roomId}
                        onKeyUp={handleInputEnter}
                    />
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
