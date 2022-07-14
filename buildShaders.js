var fs = require('fs');
const imports = new Map();
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
                else if (filename.name.endsWith('.wgsl') && !filename.name.endsWith('.export.wgsl')) {
                    try {
                        const content = (await Promise.all((await fs.promises.readFile(dirname + filename.name, 'utf-8')).split("\n").map(line => line.trim()).map(async line => {
                            if(line.startsWith('#import')) {
                                const filename=line.split('"')[1];
                                let importPromise = imports.get(line.split('"')[1]);
                                if(!importPromise) {
                                    importPromise = fs.promises.readFile(dirname + filename, 'utf-8');
                                    imports.set(filename, importPromise);
                                }
                                line = await importPromise;
                            }
                            return line;
                        }))).join('\n');
                        obj[dirname.substr(10)+filename.name] = content.replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '');
                    } catch(err) {
                        console.error(err);
                        return;
                    }
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
        return new Promise(res => {
            fs.writeFile('./shaders.json', JSON.stringify(obj), (err) => {
                if (err) throw err;
                //Sleep one second so shaders.json timestamp is older than build files
                setTimeout(res, 1000);

            });
        })
    });
    console.log('Shaders optimized');

})();
