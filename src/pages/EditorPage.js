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
    const latencySamplesRef = useRef([]);
    const warmupCountRef = useRef(0);
    const username = location.state?.username;

    const latencyQuality =
        averageLatency === null
            ? 'Measuring'
            : averageLatency < 300
            ? 'Excellent'
            : averageLatency < 500
            ? 'Good'
            : averageLatency < 800
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

        const handleErrors = (e) => {
            console.log('socket error', e);
            toast.error('Connection interrupted. Reconnecting...');
        };

        const handlePongCheck = (sentAt) => {
            if (typeof sentAt !== 'number') {
                return;
            }

            const rtt = performance.now() - sentAt;
            if (warmupCountRef.current < 3) {
                warmupCountRef.current += 1;
                return;
            }

            const samples = latencySamplesRef.current;
            samples.push(rtt);
            if (samples.length > 10) {
                samples.shift();
            }

            const average =
                samples.reduce((sum, sample) => sum + sample, 0) /
                samples.length;
            setAverageLatency(average);
        };

        const measureLatency = () => {
            if (!socketRef.current || !socketRef.current.connected) {
                return;
            }

            socketRef.current.emit(ACTIONS.LATENCY_PING, performance.now());
        };

        const init = async () => {
            latencySamplesRef.current = [];
            warmupCountRef.current = 0;

            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', handleErrors);
            socketRef.current.on('connect_failed', handleErrors);

            const joinRoom = () => {
                socketRef.current.emit(ACTIONS.JOIN, {
                    roomId,
                    username,
                });
            };

            socketRef.current.on('connect', joinRoom);
            socketRef.current.on(ACTIONS.LATENCY_PONG, handlePongCheck);

            if (socketRef.current.connected) {
                joinRoom();
            }

            socketRef.current.on(ACTIONS.JOINED, ({ username }) => {
                if (username !== location.state?.username) {
                    toast.success(`${username} Joined The Room.`);
                    console.log(`${username} Joined`);
                }
            });

            socketRef.current.on(ACTIONS.DISCONNECTED, ({ username }) => {
                toast.success(`${username} Left The Room.`);
            });

            measureLatency();
            latencyInterval = setInterval(measureLatency, 3000);
        };

        init();

        return () => {
            clearInterval(latencyInterval);
            if (socketRef.current) {
                socketRef.current.off('connect_error', handleErrors);
                socketRef.current.off('connect_failed', handleErrors);
                socketRef.current.off('connect');
                socketRef.current.off(ACTIONS.PONG_CHECK, handlePongCheck);
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.disconnect();
            }
        };
    }, [location.state?.username, roomId, username]);

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
