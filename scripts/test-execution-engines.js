const fetch = globalThis.fetch || require('node-fetch');

async function testPiston() {
    console.log('--- Testing Piston Execution Engine ---');
    const start = Date.now();
    try {
        const res = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: 'python',
                version: '*',
                files: [{ content: 'print("Hello from Production Piston Engine!")\nfor i in range(3): print(f"Count: {i}")' }],
            }),
        });
        const data = await res.json();
        console.log(`Piston responded in ${Date.now() - start}ms:`, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Piston error:', e.message);
    }
}

async function testJudge0() {
    console.log('\n--- Testing Judge0 Engine ---');
    const start = Date.now();
    try {
        // Public CE submission endpoint
        const res = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': process.env.JUDGE0_API_KEY || 'demo-key',
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            },
            body: JSON.stringify({
                language_id: 71,
                source_code: 'print("Hello from Judge0!")',
            }),
        });
        const data = await res.json();
        console.log(`Judge0 responded in ${Date.now() - start}ms:`, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Judge0 test note:', e.message);
    }
}

async function run() {
    await testPiston();
    await testJudge0();
}

run();
