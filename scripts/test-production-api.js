const fetch = globalThis.fetch || require('node-fetch');

async function testLocalApi(lang, code) {
    const start = Date.now();
    try {
        const res = await fetch('http://localhost:5000/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: lang, code }),
        });
        const data = await res.json();
        console.log(`[${lang.toUpperCase()}] Responded in ${Date.now() - start}ms (${data.compiler}):`);
        console.log(data.run?.output || data.run?.stdout || data.run?.stderr);
        console.log('---');
    } catch (e) {
        console.error(`Error testing ${lang}:`, e.message);
    }
}

async function run() {
    console.log('Testing Code-Sync Multi-Tier Production API on Port 5000...\n');
    await testLocalApi('javascript', 'console.log("Production JS Execution Test!"); console.log("Result:", Array.from({length: 5}, (_, i) => i * 10));');
    await testLocalApi('python', 'print("Production Python Execution Test!")\nprint([x**2 for x in range(6)])');
    await testLocalApi('cpp', '#include <iostream>\nint main() { std::cout << "Production C++ Execution Test!" << std::endl; return 0; }');
}

run();
