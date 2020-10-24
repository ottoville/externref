var fs = require('fs');


const changed = new Set();

async function handleFile(folder, file) {
   // console.log(folder + "/" + file);
    return new Promise((res, rej) => {
        if (changed.has(folder + "/" + file))
            return res();
        changed.add(folder + "/" + file);
        fs.readFile(folder + "/" + file, 'utf-8', async function (err, content) {
            if (err) return rej(err);
            let path = folder.split("/");
            path.pop();
            let counter = 0;
            try {
                
                content = (await Promise.all(content.split('\r\n').map(line =>
                    new Promise(async (res2, rej2) => {
                        if (line.substr(0, 7) == 'import ' || line.substr(0, 13) == 'export * from') {
                           // console.log(line);
                            let hyp="'";
                            if (line.substr(-2) == '";') {
                                hyp = '"';
                            }
                            let splittet = line.split(hyp);
                            if (splittet[1].substr(-3) != '.js') {
                                counter++;
                                splittet[1] += '.js';
                                line = splittet.join(hyp);
                            }
                            let newUrl = new URL(splittet[1], 'http://' + folder + "/").href.substr(7).split('/');
                            //let newUrl = oldUrl.split("../").join(parentFolder + "/").split("./").join(folder + "/").split("/");
                            let newfilename = newUrl.pop();
                            try {
                                // console.log('opening file ', newUrl.join("/") + "/" + newfilename + ' on line ' + line + " on file " + folder + "/" + file);
                                await handleFile(newUrl.join("/"), newfilename);
                            } catch (e) {
                                rej2(e);
                            }
                        }
                        res2(line);
                    }).catch(rej)
                ))).join('\r\n');
            } catch (e) {
                rej(e);
            }
            fs.writeFile(folder + "/" + file, content, (err) => {
                if (err)
                    return rej(err);
                res();
                console.log('Extensions (',counter,') changed to ', folder + "/" + file);
            });
        })
    })


}

(async () => {

    try {
        await Promise.all([
            handleFile("wwwroot/js/lib/babylon/Engines", "webgpuEngine.js"),
            handleFile("wwwroot/js/world", "scene.js"),
            handleFile("wwwroot/js", "code.js")
        ]);
    } catch (e) {
        console.error(e);
    }

})();



/*
function readFiles(dirname, obj, prefix = "") {
    return new Promise((mres, mrej) => {
        fs.readdir(dirname, async function (err, filenames) {
            if (err) {
                console.log(err);
                return;
            }
            Promise.all(filenames.map(filename => new Promise((res, rej) => {
                if (filename.substr(-5) == '.vert' || filename.substr(-5) == '.frag' || filename.substr(-5) == '.comp' || filename.substr(-3) == '.fx') {
                    fs.readFile(dirname + filename, 'utf-8', function (err, content) {
                        if (err) {
                            rej(err);
                            return;
                        }
                        if (filename.substr(-11) == 'fragment.fx') {
                            filename = filename.substr(0,filename.length-7)
                        } else if (filename.substr(-9) == 'vertex.fx') {
                            filename = filename.substr(0, filename.length -5)
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
    await Promise.all([readFiles('wwwroot/shaders/', obj), readFiles('src/lib/babylon/Shaders/', obj), readFiles('src/lib/babylon/Shaders/ShadersInclude/', obj, "ShadersInclude/")]).then(() => {
        fs.writeFile('wwwroot/shaders/shaders.json', JSON.stringify(obj), (err) => {
            if (err) throw err;
            console.log('Shaders optimized');
        });
    });
})();
*/