import { io } from 'socket.io-client';

export const SOCKET_URL =
    process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        transports: ['websocket'],
    };
    return io(SOCKET_URL, options);
};
