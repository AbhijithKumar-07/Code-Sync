const fetch = globalThis.fetch || require('node-fetch');

async function testWandbox(lang, code) {
    const start = Date.now();
    try {
        const res = await fetch('https://wandbox.org/api/compile.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                compiler: lang === 'python' ? 'cpython-3.12.7' : 'nodejs-20.17.0',
                code,
            }),
        });
        const data = await res.json();
        console.log(`Wandbox (${lang}) responded in ${Date.now() - start}ms:`, data.program_output || data.compiler_error);
    } catch (e) {
        console.error('Wandbox error:', e.message);
    }
}

async function run() {
    await testWandbox('python', 'print("Hello Python from Wandbox!")');
    await testWandbox('javascript', 'console.log("Hello JS from Wandbox!")');
}

run();
