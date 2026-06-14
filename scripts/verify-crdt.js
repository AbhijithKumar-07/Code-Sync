const http = require('http');
const { Server } = require('socket.io');
const Y = require('yjs');
const { SocketIOProvider } = require('y-socket.io');
const { YSocketIO } = require('y-socket.io/dist/server');

const waitFor = async (condition, label, timeout = 5000) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
        if (condition()) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error(`Timed out while waiting for ${label}`);
};

const createProvider = (url, room, doc) =>
    new SocketIOProvider(
        url,
        room,
        doc,
        { autoConnect: false, disableBc: true, resyncInterval: 1000 },
        { transports: ['websocket'] }
    );

const run = async () => {
    const httpServer = http.createServer();
    const io = new Server(httpServer);
    const ysocketio = new YSocketIO(io);
    ysocketio.initialize();

    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));

    const url = `http://127.0.0.1:${httpServer.address().port}`;
    const firstDoc = new Y.Doc();
    const secondDoc = new Y.Doc();
    const firstProvider = createProvider(url, 'collision-test', firstDoc);
    const secondProvider = createProvider(url, 'collision-test', secondDoc);
    const firstText = firstDoc.getText('codemirror');
    const secondText = secondDoc.getText('codemirror');

    try {
        firstProvider.connect();
        secondProvider.connect();
        await waitFor(
            () => firstProvider.synced && secondProvider.synced,
            'initial synchronization'
        );

        firstText.insert(0, 'start:end');
        await waitFor(
            () => secondText.toString() === 'start:end',
            'shared base text'
        );

        firstProvider.disconnect();
        secondProvider.disconnect();
        await waitFor(
            () =>
                !firstProvider.socket.connected &&
                !secondProvider.socket.connected,
            'both clients to disconnect'
        );

        const insertionPoint = 'start:'.length;
        firstText.insert(insertionPoint, 'ALPHA ');
        secondText.insert(insertionPoint, 'BETA ');

        firstProvider.connect();
        secondProvider.connect();
        await waitFor(
            () =>
                firstText.toString() === secondText.toString() &&
                firstText.toString().includes('ALPHA ') &&
                firstText.toString().includes('BETA '),
            'concurrent edits to converge'
        );

        secondProvider.disconnect();
        await waitFor(
            () => !secondProvider.socket.connected,
            'second client to disconnect'
        );
        firstText.insert(firstText.length, ' recovered');
        secondProvider.connect();
        await waitFor(
            () => firstText.toString() === secondText.toString(),
            'reconnect recovery'
        );

        console.log('CRDT collision test passed.');
        console.log(`Converged document: "${firstText.toString()}"`);
        console.log('Both concurrent same-position edits were preserved.');
        console.log('Disconnected client recovered missed updates.');
    } finally {
        firstProvider.destroy();
        secondProvider.destroy();
        firstDoc.destroy();
        secondDoc.destroy();
        io.close();
        httpServer.close();
    }
};

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
