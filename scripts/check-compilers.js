async function getCompilers() {
    const res = await fetch('https://wandbox.org/api/list.json');
    const list = await res.json();
    const map = {};
    for (const item of list) {
        if (!map[item.language]) {
            map[item.language] = [];
        }
        map[item.language].push(item.name);
    }
    console.log('Available languages and top compilers:');
    for (const [lang, compilers] of Object.entries(map)) {
        console.log(lang, '->', compilers[0]);
    }
}

getCompilers();
