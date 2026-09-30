async function test() {
    try {
        console.log('Testing Wandbox API...');
        const res = await fetch('https://wandbox.org/api/compile.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                compiler: 'cpython-3.10.4',
                code: 'print("Hello from Python on Wandbox!")\nimport sys\nprint("Python version:", sys.version)',
                stdin: ''
            })
        });
        const data = await res.json();
        console.log('Wandbox result:', data);
    } catch (e) {
        console.error('Wandbox error:', e);
    }

    try {
        console.log('Testing JavaScript compiler on Wandbox...');
        const res = await fetch('https://wandbox.org/api/compile.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                compiler: 'nodejs-20.12.2',
                code: 'console.log("Hello from Node.js on Wandbox!"); console.log(2 + 3);',
                stdin: ''
            })
        });
        const data = await res.json();
        console.log('JS result:', data);
    } catch (e) {
        console.error('JS error:', e);
    }

    try {
        console.log('Testing C++ on Wandbox...');
        const res = await fetch('https://wandbox.org/api/compile.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                compiler: 'gcc-head',
                code: '#include <iostream>\nint main() { std::cout << "Hello from C++ on Wandbox!" << std::endl; return 0; }',
                stdin: ''
            })
        });
        const data = await res.json();
        console.log('C++ result:', data);
    } catch (e) {
        console.error('C++ error:', e);
    }
}

test();
