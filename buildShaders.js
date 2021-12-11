var fs = require('fs');
function readFiles(dirname, obj) {
    return new Promise((mres, mrej) => {
        fs.readdir(dirname,{ withFileTypes: true }, async function (err, filenames) {
            if (err) {
                console.log(err);
                return;
            }
            await Promise.all(filenames.map(async filename =>  {
                if(filename.isDirectory()) {
                    return readFiles(dirname+filename.name+'/',obj);
                }
                else if (filename.name.substr(-5) == '.wgsl') {
                    return new Promise(rres => {
                        fs.readFile(dirname + filename.name, 'utf-8', function (err, content) {
                            if (err) {
                                console.error(err);
                                return;
                            }
                            obj[dirname.substr(10)+filename.name] = content.replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '');
                            rres();
                        })
                    })

                } else {
                }
            }));
            mres();
        });
    })
}
let obj = {};
(async () => {
    await Promise.all([readFiles('./shaders/', obj)]).then(() => {
        fs.writeFile('./shaders.json', JSON.stringify(obj), (err) => {
            if (err) throw err;
            console.log('Shaders optimized');
        });
    });
})();
