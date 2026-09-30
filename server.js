const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { YSocketIO } = require('y-socket.io/dist/server');
const ACTIONS = require('./src/Actions');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    transports: ['websocket'],
    perMessageDeflate: false,
    httpCompression: false,
});
const ysocketio = new YSocketIO(io);

ysocketio.initialize();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());

const fs = require('fs');
const os = require('os');
const vm = require('vm');
const { spawn, exec, execFile } = require('child_process');

// ========================================================
// Judge0 Language ID Mapping (Standard Judge0 CE)
// ========================================================
const JUDGE0_LANGUAGE_MAP = {
    javascript: 93, // Node.js 18.15.0 (or 63)
    js: 93,
    python: 71, // Python 3.8.1 (or 92)
    py: 71,
    cpp: 54, // C++ (GCC 9.2.0) / 105
    'c++': 54,
    c: 50, // C (GCC 9.2.0)
    java: 62, // Java (OpenJDK 13.0.1)
    go: 60, // Go (1.13.5)
    rust: 73, // Rust (1.40.0)
    typescript: 74, // TypeScript (3.7.4)
    ts: 74,
    php: 68, // PHP (7.4.1)
    ruby: 72, // Ruby (2.7.0)
    csharp: 51, // C# (Mono 6.6.0.161)
    cs: 51,
};

// ========================================================
// Piston Language Mapping
// ========================================================
const PISTON_LANGUAGE_MAP = {
    javascript: 'javascript',
    js: 'javascript',
    python: 'python',
    py: 'python',
    cpp: 'c++',
    'c++': 'c++',
    c: 'c',
    java: 'java',
    go: 'go',
    rust: 'rust',
    typescript: 'typescript',
    ts: 'typescript',
    php: 'php',
    ruby: 'ruby',
    csharp: 'csharp',
    cs: 'csharp',
};

// ========================================================
// Wandbox Fallback Compiler Map
// ========================================================
const WANDBOX_COMPILER_MAP = {
    javascript: 'nodejs-20.17.0',
    python: 'cpython-3.12.7',
    cpp: 'gcc-head',
    'c++': 'gcc-head',
    c: 'gcc-head-c',
    java: 'openjdk-jdk-22+36',
    go: 'go-1.23.2',
    rust: 'rust-1.82.0',
    typescript: 'typescript-5.6.2',
    php: 'php-8.3.12',
    ruby: 'ruby-4.0.2',
};

// --------------------------------------------------------
// 1. Judge0 Execution Handler (Production Sandboxing)
// --------------------------------------------------------
async function executeViaJudge0(langKey, code, stdin = '') {
    const judge0Url = process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
    const apiKey = process.env.JUDGE0_API_KEY;
    const apiHost = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';
    const langId = JUDGE0_LANGUAGE_MAP[langKey];

    if (!langId || (!apiKey && judge0Url.includes('rapidapi.com'))) {
        return null;
    }

    const startTime = Date.now();
    try {
        const endpoint = `${judge0Url.replace(/\/+$/, '')}/submissions?base64_encoded=false&wait=true`;
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey && judge0Url.includes('rapidapi.com')) {
            headers['X-RapidAPI-Key'] = apiKey;
            headers['X-RapidAPI-Host'] = apiHost;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                language_id: langId,
                source_code: code,
                stdin: stdin || '',
                cpu_time_limit: 5,
                memory_limit: 128000,
            }),
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) return null;
        const data = await response.json();
        const elapsed = Date.now() - startTime;

        const stdout = data.stdout || '';
        const stderr = data.stderr || data.compile_output || data.message || '';
        const isSuccess = data.status?.id === 3; // 3 is "Accepted" in Judge0

        return {
            stdout,
            stderr,
            code: isSuccess ? 0 : 1,
            output: stdout || stderr || '(No output produced)',
            compiler: `Sandbox Engine (${data.status?.description || 'Executed'})`,
            executionTime: Math.round(parseFloat(data.time || 0) * 1000) || elapsed,
        };
    } catch (err) {
        return null;
    }
}

// --------------------------------------------------------
// 2. Piston Execution Handler
// --------------------------------------------------------
async function executeViaPiston(langKey, code, stdin = '') {
    const pistonUrl = process.env.PISTON_API_URL;
    if (!pistonUrl) return null;

    const pistonLang = PISTON_LANGUAGE_MAP[langKey];
    if (!pistonLang) return null;

    const startTime = Date.now();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(pistonUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: pistonLang,
                version: '*',
                files: [{ content: code }],
                stdin: stdin || '',
                run_timeout: 4000,
            }),
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) return null;
        const data = await response.json();
        const run = data.run;
        if (!run) return null;

        const elapsed = Date.now() - startTime;
        return {
            stdout: run.stdout || '',
            stderr: run.stderr || '',
            code: run.code === 0 ? 0 : 1,
            output: run.output || run.stdout || run.stderr || '(No output produced)',
            compiler: `Piston Sandbox (${data.language} ${data.version || ''})`.trim(),
            executionTime: elapsed,
        };
    } catch (err) {
        return null;
    }
}

// --------------------------------------------------------
// 3. Local Sandboxed Execution (Zero-latency runtime)
// --------------------------------------------------------
function executeLocalJS(code) {
    const startTime = Date.now();
    let logs = [];
    const sandbox = {
        console: {
            log: (...args) => logs.push(args.map(a => typeof a === 'object' && a !== null ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
            error: (...args) => logs.push('[Error] ' + args.map(a => typeof a === 'object' && a !== null ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
            warn: (...args) => logs.push('[Warn] ' + args.map(a => typeof a === 'object' && a !== null ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
            info: (...args) => logs.push(args.map(a => typeof a === 'object' && a !== null ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
        },
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Math,
        Date,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        Map,
        Set,
        Promise,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
    };
    try {
        const context = vm.createContext(sandbox);
        const result = vm.runInContext(code, context, { timeout: 3500 });
        if (result !== undefined && logs.length === 0) {
            logs.push(typeof result === 'object' && result !== null ? JSON.stringify(result, null, 2) : String(result));
        }
        const elapsed = Math.max(Date.now() - startTime, 1);
        return {
            stdout: logs.join('\n'),
            stderr: '',
            code: 0,
            output: logs.join('\n') || '(Execution finished with no output)',
            compiler: 'V8 Sandbox (Instant)',
            executionTime: elapsed,
        };
    } catch (err) {
        return {
            stdout: logs.join('\n'),
            stderr: err.stack || err.message,
            code: 1,
            output: err.message,
            compiler: 'V8 Sandbox (Instant)',
            executionTime: Math.max(Date.now() - startTime, 1),
        };
    }
}

function executeLocalPython(code, stdin = '') {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
        
        function trySpawn(bin) {
            let proc;
            try {
                proc = spawn(bin, ['-u', '-c', code], {
                    timeout: 4500,
                    env: { PYTHONUNBUFFERED: '1' },
                });
            } catch (e) {
                return resolve(null);
            }

            let stdout = '';
            let stderr = '';
            if (stdin) {
                try {
                    proc.stdin.write(stdin);
                    proc.stdin.end();
                } catch {}
            }
            proc.stdout?.on('data', (d) => { stdout += d.toString(); });
            proc.stderr?.on('data', (d) => { stderr += d.toString(); });
            proc.on('close', (exitCode) => {
                const elapsed = Math.max(Date.now() - startTime, 1);
                resolve({
                    stdout,
                    stderr,
                    code: exitCode === 0 ? 0 : 1,
                    output: stdout || stderr || '(No output produced)',
                    compiler: 'Python 3 (Instant Isolated)',
                    executionTime: elapsed,
                });
            });
            proc.on('error', () => {
                if (bin === 'python3') {
                    trySpawn('python'); // Try fallback to python
                } else {
                    resolve(null);
                }
            });
        }

        trySpawn(pythonBin);
    });
}

function executeLocalCpp(code, stdin = '') {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const tempDir = os.tmpdir();
        const timestamp = Date.now() + Math.random().toString(36).substr(2, 4);
        const srcFile = path.join(tempDir, `code_${timestamp}.cpp`);
        const exeFile = path.join(tempDir, `code_${timestamp}.exe`);
        try {
            fs.writeFileSync(srcFile, code);
        } catch (e) {
            return resolve(null);
        }
        exec(`g++ "${srcFile}" -o "${exeFile}"`, { timeout: 4000 }, (compileErr, compStdout, compStderr) => {
            try { fs.unlinkSync(srcFile); } catch {}
            if (compileErr) {
                return resolve(null); // Smooth fallback to cloud/Judge0/Wandbox
            }
            const runProc = execFile(exeFile, { timeout: 3500 }, (runErr, runStdout, runStderr) => {
                try { fs.unlinkSync(exeFile); } catch {}
                const elapsed = Math.max(Date.now() - startTime, 1);
                resolve({
                    stdout: runStdout,
                    stderr: runStderr || (runErr ? runErr.message : ''),
                    code: runErr ? 1 : 0,
                    output: runStdout || runStderr || '(No output produced)',
                    compiler: 'GCC Native',
                    executionTime: elapsed,
                });
            });
            if (stdin && runProc && runProc.stdin) {
                try {
                    runProc.stdin.write(stdin);
                    runProc.stdin.end();
                } catch {}
            }
        });
    });
}

function executeLocalC(code, stdin = '') {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const tempDir = os.tmpdir();
        const timestamp = Date.now() + Math.random().toString(36).substr(2, 4);
        const srcFile = path.join(tempDir, `code_${timestamp}.c`);
        const exeFile = path.join(tempDir, `code_${timestamp}.exe`);
        try { fs.writeFileSync(srcFile, code); } catch { return resolve(null); }
        exec(`gcc "${srcFile}" -o "${exeFile}"`, { timeout: 4000 }, (compileErr) => {
            try { fs.unlinkSync(srcFile); } catch {}
            if (compileErr) return resolve(null);
            const runProc = execFile(exeFile, { timeout: 3500 }, (runErr, runStdout, runStderr) => {
                try { fs.unlinkSync(exeFile); } catch {}
                const elapsed = Math.max(Date.now() - startTime, 1);
                resolve({
                    stdout: runStdout,
                    stderr: runStderr || (runErr ? runErr.message : ''),
                    code: runErr ? 1 : 0,
                    output: runStdout || runStderr || '(No output produced)',
                    compiler: 'GCC Native (C)',
                    executionTime: elapsed,
                });
            });
            if (stdin && runProc && runProc.stdin) {
                try { runProc.stdin.write(stdin); runProc.stdin.end(); } catch {}
            }
        });
    });
}

function executeLocalJava(code, stdin = '') {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const tempDir = os.tmpdir();
        const timestamp = Date.now() + Math.random().toString(36).substr(2, 4);
        const javaDir = path.join(tempDir, `java_${timestamp}`);
        try {
            fs.mkdirSync(javaDir, { recursive: true });
            const match = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
            const className = match ? match[1] : 'Main';
            const srcFile = path.join(javaDir, `${className}.java`);
            fs.writeFileSync(srcFile, code);

            exec(`javac "${srcFile}"`, { timeout: 5000, cwd: javaDir }, (compileErr) => {
                if (compileErr) {
                    try { fs.rmSync(javaDir, { recursive: true, force: true }); } catch {}
                    return resolve(null);
                }
                const runProc = exec(`java -cp "${javaDir}" ${className}`, { timeout: 4000, cwd: javaDir }, (runErr, runStdout, runStderr) => {
                    try { fs.rmSync(javaDir, { recursive: true, force: true }); } catch {}
                    const elapsed = Math.max(Date.now() - startTime, 1);
                    resolve({
                        stdout: runStdout,
                        stderr: runStderr || (runErr ? runErr.message : ''),
                        code: runErr ? 1 : 0,
                        output: runStdout || runStderr || '(No output produced)',
                        compiler: 'OpenJDK Native (Java)',
                        executionTime: elapsed,
                    });
                });
                if (stdin && runProc && runProc.stdin) {
                    try { runProc.stdin.write(stdin); runProc.stdin.end(); } catch {}
                }
            });
        } catch {
            return resolve(null);
        }
    });
}

function executeLocalGo(code, stdin = '') {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const tempDir = os.tmpdir();
        const timestamp = Date.now() + Math.random().toString(36).substr(2, 4);
        const srcFile = path.join(tempDir, `main_${timestamp}.go`);
        try { fs.writeFileSync(srcFile, code); } catch { return resolve(null); }
        const runProc = exec(`go run "${srcFile}"`, { timeout: 5000 }, (runErr, runStdout, runStderr) => {
            try { fs.unlinkSync(srcFile); } catch {}
            if (runErr && !runStdout && !runStderr) return resolve(null);
            const elapsed = Math.max(Date.now() - startTime, 1);
            resolve({
                stdout: runStdout,
                stderr: runStderr || (runErr ? runErr.message : ''),
                code: runErr ? 1 : 0,
                output: runStdout || runStderr || '(No output produced)',
                compiler: 'Go Native',
                executionTime: elapsed,
            });
        });
        if (stdin && runProc && runProc.stdin) {
            try { runProc.stdin.write(stdin); runProc.stdin.end(); } catch {}
        }
    });
}

function executeLocalRust(code, stdin = '') {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const tempDir = os.tmpdir();
        const timestamp = Date.now() + Math.random().toString(36).substr(2, 4);
        const srcFile = path.join(tempDir, `code_${timestamp}.rs`);
        const exeFile = path.join(tempDir, `code_${timestamp}.exe`);
        try { fs.writeFileSync(srcFile, code); } catch { return resolve(null); }
        exec(`rustc "${srcFile}" -o "${exeFile}"`, { timeout: 5000 }, (compileErr) => {
            try { fs.unlinkSync(srcFile); } catch {}
            if (compileErr) return resolve(null);
            const runProc = execFile(exeFile, { timeout: 3500 }, (runErr, runStdout, runStderr) => {
                try { fs.unlinkSync(exeFile); } catch {}
                const elapsed = Math.max(Date.now() - startTime, 1);
                resolve({
                    stdout: runStdout,
                    stderr: runStderr || (runErr ? runErr.message : ''),
                    code: runErr ? 1 : 0,
                    output: runStdout || runStderr || '(No output produced)',
                    compiler: 'Rust Native',
                    executionTime: elapsed,
                });
            });
            if (stdin && runProc && runProc.stdin) {
                try { runProc.stdin.write(stdin); runProc.stdin.end(); } catch {}
            }
        });
    });
}

function executeLocalPhp(code, stdin = '') {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const tempDir = os.tmpdir();
        const timestamp = Date.now() + Math.random().toString(36).substr(2, 4);
        const srcFile = path.join(tempDir, `code_${timestamp}.php`);
        try { fs.writeFileSync(srcFile, code); } catch { return resolve(null); }
        const runProc = exec(`php "${srcFile}"`, { timeout: 4000 }, (runErr, runStdout, runStderr) => {
            try { fs.unlinkSync(srcFile); } catch {}
            if (runErr && !runStdout && !runStderr) return resolve(null);
            const elapsed = Math.max(Date.now() - startTime, 1);
            resolve({
                stdout: runStdout,
                stderr: runStderr || (runErr ? runErr.message : ''),
                code: runErr ? 1 : 0,
                output: runStdout || runStderr || '(No output produced)',
                compiler: 'PHP Native',
                executionTime: elapsed,
            });
        });
        if (stdin && runProc && runProc.stdin) {
            try { runProc.stdin.write(stdin); runProc.stdin.end(); } catch {}
        }
    });
}

function executeLocalRuby(code, stdin = '') {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const tempDir = os.tmpdir();
        const timestamp = Date.now() + Math.random().toString(36).substr(2, 4);
        const srcFile = path.join(tempDir, `code_${timestamp}.rb`);
        try { fs.writeFileSync(srcFile, code); } catch { return resolve(null); }
        const runProc = exec(`ruby "${srcFile}"`, { timeout: 4000 }, (runErr, runStdout, runStderr) => {
            try { fs.unlinkSync(srcFile); } catch {}
            if (runErr && !runStdout && !runStderr) return resolve(null);
            const elapsed = Math.max(Date.now() - startTime, 1);
            resolve({
                stdout: runStdout,
                stderr: runStderr || (runErr ? runErr.message : ''),
                code: runErr ? 1 : 0,
                output: runStdout || runStderr || '(No output produced)',
                compiler: 'Ruby Native',
                executionTime: elapsed,
            });
        });
        if (stdin && runProc && runProc.stdin) {
            try { runProc.stdin.write(stdin); runProc.stdin.end(); } catch {}
        }
    });
}

// --------------------------------------------------------
// 4. Wandbox Universal Compiler Fallback
// --------------------------------------------------------
async function executeViaWandbox(langKey, code, stdin = '') {
    const compiler = WANDBOX_COMPILER_MAP[langKey] || 'nodejs-20.17.0';
    const startTime = Date.now();
    const response = await fetch('https://wandbox.org/api/compile.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compiler, code, stdin }),
    });

    const data = await response.json();
    const elapsed = Date.now() - startTime;
    const isSuccess = data.status === '0' || data.status === 0;
    const stdout = data.program_output || data.compiler_output || '';
    const stderr = data.program_error || data.compiler_error || data.compiler_message || '';

    return {
        stdout,
        stderr,
        code: isSuccess ? 0 : 1,
        signal: data.signal || null,
        output: stdout || stderr || '(No output produced)',
        compiler: `Wandbox (${compiler})`,
        executionTime: elapsed,
    };
}

// ========================================================
// Multi-Tier Unified Code Execution API Endpoint
// ========================================================
app.post('/api/execute', async (req, res) => {
    const { language, files, code: rawCode, stdin = '' } = req.body;
    const code = rawCode || (files && files[0]?.content) || '';
    const langKey = language?.toLowerCase();
    const allowLocal = process.env.ENABLE_LOCAL_EXECUTION !== 'false';

    try {
        // Step 1: Instant Local JS Execution (0-2ms)
        if (langKey === 'javascript' || langKey === 'js') {
            const jsResult = executeLocalJS(code);
            return res.json({ run: jsResult, compiler: jsResult.compiler, executionTime: jsResult.executionTime });
        }

        // Step 2: Instant Local Python Execution if available (10-30ms)
        if (allowLocal && (langKey === 'python' || langKey === 'py')) {
            const pyResult = await executeLocalPython(code, stdin);
            if (pyResult) {
                return res.json({ run: pyResult, compiler: pyResult.compiler, executionTime: pyResult.executionTime });
            }
        }

        // Step 3: Fast Cloud Sandboxing via Judge0 CE (~150-300ms)
        const judge0Result = await executeViaJudge0(langKey, code, stdin);
        if (judge0Result) {
            return res.json({ run: judge0Result, compiler: judge0Result.compiler, executionTime: judge0Result.executionTime });
        }

        // Step 4: Fast Local Sandboxed Native Compilers (if installed)
        if (allowLocal) {
            if (langKey === 'cpp' || langKey === 'c++') {
                const cppResult = await executeLocalCpp(code, stdin);
                if (cppResult) {
                    return res.json({ run: cppResult, compiler: cppResult.compiler, executionTime: cppResult.executionTime });
                }
            }
            if (langKey === 'c') {
                const cResult = await executeLocalC(code, stdin);
                if (cResult) {
                    return res.json({ run: cResult, compiler: cResult.compiler, executionTime: cResult.executionTime });
                }
            }
            if (langKey === 'java') {
                const javaResult = await executeLocalJava(code, stdin);
                if (javaResult) {
                    return res.json({ run: javaResult, compiler: javaResult.compiler, executionTime: javaResult.executionTime });
                }
            }
            if (langKey === 'go') {
                const goResult = await executeLocalGo(code, stdin);
                if (goResult) {
                    return res.json({ run: goResult, compiler: goResult.compiler, executionTime: goResult.executionTime });
                }
            }
            if (langKey === 'rust') {
                const rustResult = await executeLocalRust(code, stdin);
                if (rustResult) {
                    return res.json({ run: rustResult, compiler: rustResult.compiler, executionTime: rustResult.executionTime });
                }
            }
            if (langKey === 'php') {
                const phpResult = await executeLocalPhp(code, stdin);
                if (phpResult) {
                    return res.json({ run: phpResult, compiler: phpResult.compiler, executionTime: phpResult.executionTime });
                }
            }
            if (langKey === 'ruby') {
                const rubyResult = await executeLocalRuby(code, stdin);
                if (rubyResult) {
                    return res.json({ run: rubyResult, compiler: rubyResult.compiler, executionTime: rubyResult.executionTime });
                }
            }
        }

        // Step 5: Check Piston Integration
        const pistonResult = await executeViaPiston(langKey, code, stdin);
        if (pistonResult) {
            return res.json({ run: pistonResult, compiler: pistonResult.compiler, executionTime: pistonResult.executionTime });
        }

        // Step 4: Universal Cloud Compiler Fallback (Wandbox)
        const wandboxResult = await executeViaWandbox(langKey, code, stdin);
        return res.json({
            run: wandboxResult,
            compiler: wandboxResult.compiler,
            executionTime: wandboxResult.executionTime,
        });
    } catch (error) {
        console.error('Execution pipeline error:', error);
        return res.status(500).json({
            message: 'Execution error: ' + error.message,
            run: {
                stdout: '',
                stderr: `Execution failed: ${error.message}`,
                code: 1,
                output: `Execution failed: ${error.message}`,
            },
        });
    }
});


app.use(express.static('build'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};
const roomChatHistory = {};
const pendingDisconnects = {};

function addRoomChatMessage(roomId, messageObj) {
    if (!roomId) return;
    if (!roomChatHistory[roomId]) {
        roomChatHistory[roomId] = [];
    }
    roomChatHistory[roomId].push(messageObj);
    if (roomChatHistory[roomId].length > 200) {
        roomChatHistory[roomId].shift();
    }
}

function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);

        const disconnectKey = `${roomId}_${username}`;
        const isReconnecting = Boolean(pendingDisconnects[disconnectKey]);

        if (isReconnecting) {
            clearTimeout(pendingDisconnects[disconnectKey]);
            delete pendingDisconnects[disconnectKey];
        }

        // Send existing chat history to the user
        socket.emit(ACTIONS.SYNC_CHAT_HISTORY, {
            chatHistory: roomChatHistory[roomId] || [],
        });

        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
                isReconnecting,
            });
        });
    });

    socket.on(ACTIONS.SEND_MESSAGE, ({ roomId, message, username, color, time, id }) => {
        const msgData = {
            message,
            username,
            color,
            time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            id: id || Date.now() + Math.random().toString(36).substr(2, 9),
            socketId: socket.id,
        };
        addRoomChatMessage(roomId, msgData);
        io.to(roomId).emit(ACTIONS.RECEIVE_MESSAGE, msgData);
    });

    socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language, username }) => {
        const eventMsg = {
            id: Date.now() + Math.random().toString(),
            isSystem: true,
            message: `${username} switched language to ${language}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addRoomChatMessage(roomId, eventMsg);
        socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, {
            language,
            username,
        });
    });

    socket.on(ACTIONS.CODE_EXECUTED, ({ roomId, output, language, username, status, executionTime }) => {
        const eventMsg = {
            id: Date.now() + Math.random().toString(),
            isSystem: true,
            message: `${username} ran code (${language}) [${status === 'success' ? '✓ Exit 0' : '✗ Error'}] in ${executionTime}ms`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addRoomChatMessage(roomId, eventMsg);
        socket.in(roomId).emit(ACTIONS.CODE_EXECUTED, {
            output,
            language,
            username,
            status,
            executionTime,
        });
    });

    socket.on(ACTIONS.LATENCY_PING, (sentAt) => {
        socket.emit(ACTIONS.LATENCY_PONG, sentAt);
    });

    socket.on('disconnecting', () => {
        const username = userSocketMap[socket.id];
        const rooms = [...socket.rooms].filter((r) => r !== socket.id);
        delete userSocketMap[socket.id];

        if (username) {
            rooms.forEach((roomId) => {
                const disconnectKey = `${roomId}_${username}`;
                pendingDisconnects[disconnectKey] = setTimeout(() => {
                    delete pendingDisconnects[disconnectKey];
                    const currentClients = getAllConnectedClients(roomId);
                    const stillConnected = currentClients.some(
                        (c) => c.username === username
                    );
                    if (!stillConnected) {
                        socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                            socketId: socket.id,
                            username,
                        });
                    }
                }, 3500);
            });
        }
    });
});



const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));

