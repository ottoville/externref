var fs = require('fs');
let dirname = 'wwwroot/shaders/';
fs.readdir(dirname, async function (err, filenames) {
    if (err) {
        console.log(err);
        return;
    }
    let obj = {};
    await Promise.all(filenames.map(filename => new Promise((res, rej) => {
        if (filename.substr(-5) == '.vert' || filename.substr(-5) == '.frag') {
            fs.readFile(dirname + filename, 'utf-8', function (err, content) {
                if (err) {
                    rej(err);
                    return;
                }
                obj[filename] = content.replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '');
                res();
            })
        } else {
            res();
        }

    })));
    fs.writeFile('wwwroot/shaders/shaders.json', JSON.stringify(obj), (err) => {
        if (err) throw err;
        console.log('Shaders optimized');
    });
});