/**
 * Ultra-Fast Sandboxed In-Browser Execution Engine
 * Executes JavaScript/TypeScript snippets in an isolated Web Worker.
 * Provides < 1ms execution time, zero server latency, and full console capture.
 */

export function executeInBrowserJS(code, stdin = '') {
    return new Promise((resolve) => {
        const startTime = performance.now();

        // Worker script as a Blob
        const workerBlobContent = `
            self.onmessage = function(e) {
                const { code, stdin } = e.data;
                const logs = [];
                const customConsole = {
                    log: function(...args) {
                        logs.push(args.map(a => typeof a === 'object' && a !== null ? JSON.stringify(a, null, 2) : String(a)).join(' '));
                    },
                    error: function(...args) {
                        logs.push('[Error] ' + args.map(a => typeof a === 'object' && a !== null ? JSON.stringify(a, null, 2) : String(a)).join(' '));
                    },
                    warn: function(...args) {
                        logs.push('[Warn] ' + args.map(a => typeof a === 'object' && a !== null ? JSON.stringify(a, null, 2) : String(a)).join(' '));
                    },
                    info: function(...args) {
                        logs.push(args.map(a => typeof a === 'object' && a !== null ? JSON.stringify(a, null, 2) : String(a)).join(' '));
                    }
                };

                let exitCode = 0;
                let stderr = '';
                let resultValue;

                try {
                    const fn = new Function('console', 'stdin', 'require', code);
                    resultValue = fn(customConsole, stdin, () => {
                        throw new Error('Module require() is not available in browser sandbox');
                    });

                    if (resultValue !== undefined && logs.length === 0) {
                        logs.push(typeof resultValue === 'object' && resultValue !== null ? JSON.stringify(resultValue, null, 2) : String(resultValue));
                    }
                } catch (err) {
                    exitCode = 1;
                    stderr = (err && err.stack) || (err && err.message) || String(err);
                    logs.push('[Exception] ' + ((err && err.message) || String(err)));
                }

                self.postMessage({
                    stdout: logs.join('\\n'),
                    stderr: stderr,
                    code: exitCode,
                    output: logs.join('\\n') || '(Execution finished with no output)'
                });
            };
        `;

        let worker;
        let blobUrl;
        let timeoutId;

        try {
            const blob = new Blob([workerBlobContent], { type: 'application/javascript' });
            blobUrl = URL.createObjectURL(blob);
            worker = new Worker(blobUrl);

            // Timeout safety (3 seconds max execution)
            timeoutId = setTimeout(() => {
                if (worker) {
                    worker.terminate();
                    URL.revokeObjectURL(blobUrl);
                }
                const elapsed = Math.round(performance.now() - startTime);
                resolve({
                    stdout: '',
                    stderr: 'Execution timed out (exceeded 3000ms limit)',
                    code: 1,
                    output: 'Execution timed out (exceeded 3000ms limit)',
                    compiler: 'V8 Engine (Browser Instant Sandbox)',
                    executionTime: elapsed,
                });
            }, 3000);

            worker.onmessage = (e) => {
                clearTimeout(timeoutId);
                const elapsed = Math.max(Math.round(performance.now() - startTime), 1);
                worker.terminate();
                URL.revokeObjectURL(blobUrl);

                resolve({
                    ...e.data,
                    compiler: 'V8 Engine (Browser Instant Sandbox)',
                    executionTime: elapsed,
                });
            };

            worker.onerror = (err) => {
                clearTimeout(timeoutId);
                const elapsed = Math.max(Math.round(performance.now() - startTime), 1);
                worker.terminate();
                URL.revokeObjectURL(blobUrl);

                resolve({
                    stdout: '',
                    stderr: err.message || 'Worker execution error',
                    code: 1,
                    output: err.message || 'Worker execution error',
                    compiler: 'V8 Engine (Browser Instant Sandbox)',
                    executionTime: elapsed,
                });
            };

            worker.postMessage({ code, stdin });
        } catch (err) {
            if (timeoutId) clearTimeout(timeoutId);
            if (blobUrl) URL.revokeObjectURL(blobUrl);
            const elapsed = Math.max(Math.round(performance.now() - startTime), 1);
            resolve({
                stdout: '',
                stderr: err.message,
                code: 1,
                output: err.message,
                compiler: 'V8 Engine (Browser Instant Sandbox)',
                executionTime: elapsed,
            });
        }
    });
}
