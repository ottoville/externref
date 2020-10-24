var fs = require('fs');
function readFiles(dirname, obj, prefix = "") {
    return new Promise((mres, mrej) => {
        fs.readdir(dirname, async function (err, filenames) {
            if (err) {
                console.log(err);
                return;
            }
            Promise.all(filenames.map(filename => new Promise((res, rej) => {
                if (filename.substr(-5) == '.vert' || filename.substr(-5) == '.frag' || filename.substr(-5) == '.comp') {
                    fs.readFile(dirname + filename, 'utf-8', function (err, content) {
                        if (err) {
                            rej(err);
                            return;
                        }
                        obj[prefix+filename] = content.replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '');
                        res();
                    })
                } else {
                    res();
                }
            }))).then(mres);
        });
    })
}
let obj = {};
(async () => {
    await Promise.all([readFiles('wwwroot/shaders/', obj), readFiles('wwwroot/shaders/terrain/', obj), readFiles('wwwroot/shaders/grass/', obj)]).then(() => {
        fs.writeFile('wwwroot/shaders/shaders.json', JSON.stringify(obj), (err) => {
            if (err) throw err;
            console.log('Shaders optimized');
        });
    });
})();
