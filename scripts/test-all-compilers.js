const compilers = {
    javascript: { compiler: 'nodejs-20.17.0', code: 'console.log("JS works!");' },
    python: { compiler: 'cpython-head', code: 'print("Python works!")' },
    cpp: { compiler: 'gcc-head', code: '#include <iostream>\nint main(){ std::cout << "C++ works!" << std::endl; return 0; }' },
    java: { compiler: 'openjdk-jdk-22+36', code: 'class Main { public static void main(String[] a){ System.out.println("Java works!"); } }' },
    c: { compiler: 'gcc-head-c', code: '#include <stdio.h>\nint main(){ printf("C works!\\n"); return 0; }' },
    go: { compiler: 'go-1.23.2', code: 'package main\nimport "fmt"\nfunc main(){ fmt.Println("Go works!") }' },
    rust: { compiler: 'rust-1.82.0', code: 'fn main(){ println!("Rust works!"); }' },
    typescript: { compiler: 'typescript-5.6.2', code: 'const msg: string = "TypeScript works!"; console.log(msg);' }
};

async function testAll() {
    for (const [lang, cfg] of Object.entries(compilers)) {
        try {
            const res = await fetch('https://wandbox.org/api/compile.json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    compiler: cfg.compiler,
                    code: cfg.code,
                    stdin: ''
                })
            });
            const data = await res.json();
            console.log(`[${lang}] Status:`, data.status, '| Output:', data.program_output?.trim() || data.compiler_error?.trim());
        } catch (e) {
            console.error(`[${lang}] Failed:`, e.message);
        }
    }
}

testAll();
