async function findPython() {
    const res = await fetch('https://wandbox.org/api/list.json');
    const list = await res.json();
    const py = list.filter(i => i.language.toLowerCase().includes('python'));
    console.log('Python compilers:', py.map(p => ({ name: p.name, ver: p.version })));
}
findPython();
