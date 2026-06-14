import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [averageLatency, setAverageLatency] = useState(null);
    const username = location.state?.username;

    const latencyQuality =
        averageLatency === null
            ? 'Measuring'
            : averageLatency < 50
            ? 'Excellent'
            : averageLatency < 100
            ? 'Good'
            : averageLatency < 200
            ? 'Fair'
            : 'Slow';

    const connectionLabel =
        connectionStatus === 'connected'
            ? 'Connected to room'
            : connectionStatus === 'connecting'
            ? 'Connecting to room'
            : 'Reconnecting';

    const handleParticipantsChange = useCallback((participants) => {
        setClients(participants);
    }, []);

    const handleConnectionStatusChange = useCallback((status) => {
        setConnectionStatus(status);
    }, []);

    useEffect(() => {
        let latencyInterval;
        const latencySamples = [];

        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Connection interrupted. Reconnecting...');
            }

            const joinRoom = () => {
                socketRef.current.emit(ACTIONS.JOIN, {
                    roomId,
                    username,
                });
            };

            socketRef.current.on('connect', joinRoom);
            if (socketRef.current.connected) {
                joinRoom();
            }

            socketRef.current.on(
                ACTIONS.JOINED,
                ({ username }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} Joined The Room.`);
                        console.log(`${username} Joined`);
                    }
                }
            );

            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ username }) => {
                    toast.success(`${username} Left The Room.`);
                }
            );

            const measureLatency = () => {
                const startedAt = performance.now();
                socketRef.current.emit(ACTIONS.LATENCY_PING, () => {
                    const latency = performance.now() - startedAt;
                    latencySamples.push(latency);
                    if (latencySamples.length > 20) {
                        latencySamples.shift();
                    }
                    const total = latencySamples.reduce(
                        (sum, sample) => sum + sample,
                        0
                    );
                    setAverageLatency(total / latencySamples.length);
                });
            };

            measureLatency();
            latencyInterval = setInterval(measureLatency, 3000);
        };
        init();
        return () => {
            clearInterval(latencyInterval);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
            }
        };
    }, [location.state?.username, reactNavigator, roomId, username]);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID Copied To Your Clipboard');
        } catch (err) {
            toast.error('Could Not Copy The Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img
                            className="logoImage"
                            src="/code-sync.png"
                            alt="logo"
                        />
                        <div className="brandCopy">
                            <strong>Code Sync</strong>
                            <span>Realtime workspace</span>
                        </div>
                    </div>
                    <div className="sectionHeading">
                        <div>
                            <span className="eyebrow">Room members</span>
                            <h3>Collaborators</h3>
                        </div>
                        <span className="participantCount">
                            {clients.length}
                        </span>
                    </div>
                    <div className="clientsList">
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
                    <div
                        className={`collaborationStats ${connectionStatus}`}
                        title="Connection health and average Socket.io round-trip time"
                    >
                        <div className="healthHeader">
                            <span className="statusIndicator" />
                            <div>
                                <span className="eyebrow">
                                    Collaboration health
                                </span>
                                <strong>{connectionLabel}</strong>
                            </div>
                        </div>
                        <div className="latencyRow">
                            <span>Network response</span>
                            <strong>
                                {averageLatency === null
                                    ? 'Measuring...'
                                    : `${averageLatency.toFixed(1)} ms`}
                            </strong>
                        </div>
                        <div className="latencyTrack">
                            <span
                                className={`latencyFill ${latencyQuality.toLowerCase()}`}
                            />
                        </div>
                        <span className="qualityLabel">
                            {latencyQuality} connection
                        </span>
                    </div>
                </div>
                <div className="asideActions">
                    <button className="btn copyBtn" onClick={copyRoomId}>
                        Copy room ID
                    </button>
                    <button className="btn leaveBtn" onClick={leaveRoom}>
                        Leave room
                    </button>
                </div>
            </div>
            <div className="editorWrap">
                <Editor
                    roomId={roomId}
                    username={username}
                    onParticipantsChange={handleParticipantsChange}
                    onConnectionStatusChange={handleConnectionStatusChange}
                />
            </div>
        </div>
    );
};

export default EditorPage;
