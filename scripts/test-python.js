async function testPy() {
    const res = await fetch('https://wandbox.org/api/compile.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            compiler: 'cpython-3.12.7',
            code: 'print("Python 3.12 works perfectly!")\nimport math\nprint("sqrt(16) =", math.sqrt(16))',
            stdin: ''
        })
    });
    const data = await res.json();
    console.log('Result:', data);
}
testPy();
