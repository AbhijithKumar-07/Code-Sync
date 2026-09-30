import { io } from 'socket.io-client';

export const SOCKET_URL =
    process.env.REACT_APP_BACKEND_URL ||
    (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5000'
        : 'https://code-sync-backend-fn7b.onrender.com');

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        transports: ['websocket'],
        upgrade: false,
    };
    return io(SOCKET_URL, options);
};
