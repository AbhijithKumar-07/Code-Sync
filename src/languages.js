export const LANGUAGES = [
    {
        id: 'javascript',
        name: 'JavaScript',
        file: 'index.js',
        icon: '🟨',
        mode: { name: 'javascript', json: true },
        extension: 'js',
        starter: `// JavaScript Playground - Code Sync
function solve() {
    const message = "Hello from Code-Sync!";
    console.log(message);
    
    const numbers = [1, 2, 3, 4, 5];
    const sum = numbers.reduce((acc, curr) => acc + curr, 0);
    console.log("Sum of [1, 2, 3, 4, 5]:", sum);
}

solve();
`,
    },
    {
        id: 'python',
        name: 'Python 3',
        file: 'main.py',
        icon: '🐍',
        mode: 'python',
        extension: 'py',
        starter: `# Python 3 Playground - Code Sync
def main():
    message = "Hello from Code-Sync!"
    print(message)
    
    # Calculate Fibonacci series
    n = 10
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[-1] + fib[-2])
    print(f"First {n} Fibonacci numbers: {fib}")

if __name__ == "__main__":
    main()
`,
    },
    {
        id: 'cpp',
        name: 'C++',
        file: 'main.cpp',
        icon: '⚡',
        mode: 'text/x-c++src',
        extension: 'cpp',
        starter: `// C++ Playground - Code Sync
#include <iostream>
#include <vector>
#include <numeric>

using namespace std;

int main() {
    cout << "Hello from Code-Sync C++!" << endl;
    vector<int> nums = {10, 20, 30, 40, 50};
    int total = accumulate(nums.begin(), nums.end(), 0);
    cout << "Total Sum: " << total << endl;
    return 0;
}
`,
    },
    {
        id: 'java',
        name: 'Java',
        file: 'Main.java',
        icon: '☕',
        mode: 'text/x-java',
        extension: 'java',
        starter: `// Java Playground - Code Sync
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Code-Sync Java!");
        int a = 15;
        int b = 27;
        System.out.println("Result: " + a + " + " + b + " = " + (a + b));
    }
}
`,
    },
    {
        id: 'c',
        name: 'C (GCC)',
        file: 'main.c',
        icon: '🔵',
        mode: 'text/x-csrc',
        extension: 'c',
        starter: `// C Playground - Code Sync
#include <stdio.h>

int main() {
    printf("Hello from Code-Sync C!\\n");
    int val = 42;
    printf("The answer is %d\\n", val);
    return 0;
}
`,
    },
    {
        id: 'go',
        name: 'Go',
        file: 'main.go',
        icon: '🐹',
        mode: 'go',
        extension: 'go',
        starter: `// Go Playground - Code Sync
package main

import "fmt"

func main() {
    fmt.Println("Hello from Code-Sync Go!")
    msg := "Realtime collaborative development"
    fmt.Println("Status:", msg)
}
`,
    },
    {
        id: 'rust',
        name: 'Rust',
        file: 'main.rs',
        icon: '🦀',
        mode: 'rust',
        extension: 'rs',
        starter: `// Rust Playground - Code Sync
fn main() {
    println!("Hello from Code-Sync Rust!");
    let numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().sum();
    println!("Vector sum is: {}", sum);
}
`,
    },
    {
        id: 'typescript',
        name: 'TypeScript',
        file: 'index.ts',
        icon: '🔷',
        mode: 'text/typescript',
        extension: 'ts',
        starter: `// TypeScript Playground - Code Sync
interface Developer {
    name: string;
    language: string;
    level: string;
}

const dev: Developer = {
    name: "Collaborator",
    language: "TypeScript",
    level: "Pro",
};

console.log(\`Hello \${dev.name} from Code-Sync! Working in \${dev.language}.\`);
`,
    },
    {
        id: 'html',
        name: 'HTML',
        file: 'index.html',
        icon: '🌐',
        mode: 'htmlmixed',
        extension: 'html',
        starter: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Code-Sync Workspace</title>
</head>
<body>
    <h1>Hello from Code-Sync!</h1>
    <p>Live collaborative coding environment.</p>
</body>
</html>
`,
    },
    {
        id: 'css',
        name: 'CSS',
        file: 'styles.css',
        icon: '🎨',
        mode: 'css',
        extension: 'css',
        starter: `/* Code-Sync Stylesheet */
body {
    margin: 0;
    padding: 20px;
    font-family: 'Inter', sans-serif;
    background: #0f111a;
    color: #ffffff;
}

h1 {
    color: #4aed88;
}
`,
    },
    {
        id: 'json',
        name: 'JSON',
        file: 'data.json',
        icon: '📋',
        mode: 'application/json',
        extension: 'json',
        starter: `{
  "project": "Code-Sync",
  "version": "2.0.0",
  "collaborative": true,
  "features": [
    "real-time editing",
    "multi-language execution",
    "multi-file workspace"
  ]
}
`,
    },
];

export const THEMES = [
    { id: 'dracula', name: 'Dracula Dark' },
    { id: 'monokai', name: 'Monokai' },
    { id: 'nord', name: 'Nord Frost' },
    { id: 'material-darker', name: 'Material Dark' },
    { id: 'gruvbox-dark', name: 'Gruvbox Dark' },
    { id: 'eclipse', name: 'Eclipse Light' },
];

export const FONT_SIZES = ['13px', '14px', '15px', '16px', '18px', '20px'];

export const getLanguageByFilename = (filename) => {
    if (!filename) return LANGUAGES[0];
    const ext = filename.split('.').pop()?.toLowerCase();
    const baseName = filename.split('.')[0] || 'Main';

    let lang = null;
    switch (ext) {
        case 'js':
        case 'jsx':
        case 'mjs':
            lang = LANGUAGES.find((l) => l.id === 'javascript');
            break;
        case 'py':
            lang = LANGUAGES.find((l) => l.id === 'python');
            break;
        case 'cpp':
        case 'cc':
        case 'cxx':
        case 'hpp':
        case 'h':
            lang = LANGUAGES.find((l) => l.id === 'cpp');
            break;
        case 'java': {
            const javaLang = LANGUAGES.find((l) => l.id === 'java');
            if (javaLang && baseName && baseName !== 'Main') {
                // Return customized starter with exact matching class name
                const customStarter = `// Java Playground - Code Sync\npublic class ${baseName} {\n    public static void main(String[] args) {\n        System.out.println("Hello from Code-Sync Java!");\n        int a = 15;\n        int b = 27;\n        System.out.println("Result: " + a + " + " + b + " = " + (a + b));\n    }\n}\n`;
                return { ...javaLang, starter: customStarter };
            }
            lang = javaLang;
            break;
        }
        case 'c':
            lang = LANGUAGES.find((l) => l.id === 'c');
            break;
        case 'go':
            lang = LANGUAGES.find((l) => l.id === 'go');
            break;
        case 'rs':
            lang = LANGUAGES.find((l) => l.id === 'rust');
            break;
        case 'ts':
        case 'tsx':
            lang = LANGUAGES.find((l) => l.id === 'typescript');
            break;
        case 'html':
        case 'htm':
            lang = LANGUAGES.find((l) => l.id === 'html');
            break;
        case 'css':
            lang = LANGUAGES.find((l) => l.id === 'css');
            break;
        case 'json':
            lang = LANGUAGES.find((l) => l.id === 'json');
            break;
        default:
            lang = LANGUAGES.find((l) => l.extension === ext);
            break;
    }
    return lang || LANGUAGES[0];
};

export const getFileIcon = (filename, isFolder = false, isExpanded = false) => {
    if (isFolder) return isExpanded ? '📂' : '📁';
    const ext = filename?.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'js':
        case 'jsx':
            return '🟨';
        case 'ts':
        case 'tsx':
            return '🔷';
        case 'py':
            return '🐍';
        case 'cpp':
        case 'cc':
        case 'hpp':
            return '⚡';
        case 'java':
            return '☕';
        case 'c':
            return '🔵';
        case 'go':
            return '🐹';
        case 'rs':
            return '🦀';
        case 'html':
            return '🌐';
        case 'css':
            return '🎨';
        case 'json':
            return '📋';
        case 'md':
            return '📝';
        default:
            return '📄';
    }
};
