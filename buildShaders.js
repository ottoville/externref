var fs = require('fs');
let dirname = 'shaders/';
fs.readdir(dirname, async function (err, filenames) {
    if (err) {
        onError(err);
        return;
    }
    let obj = {};
    await Promise.all(filenames.map(filename => new Promise((res, rej) => {
        fs.readFile(dirname + filename, 'utf-8', function (err, content) {
            if (err) {
                rej(err);
                return;
            }
            obj[filename] = content.replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '');
            res();
        })
    })));
    fs.writeFile('wwwroot/shaders/shaders.json', JSON.stringify(obj), (err) => {
        if (err) throw err;
        console.log('Shaders optimized');
    });
});