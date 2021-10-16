var fs = require('fs');
const promises=[];
function readFiles(dirname, obj) {
    return new Promise((res, rej) => {
        fs.readdir(dirname, async function (err, filenames) {
            if (err) {
                console.log(err);
                rej();
                return;
            }
            await Promise.all(filenames.map(async filename => {
                const stat = fs.lstatSync(dirname + filename);
                if (stat.isDirectory()) {
                    return readFiles(dirname + filename+'/', obj);
                } else {
                    if (filename.substr(-8) == '.test.js') {
                        obj.push(dirname + filename)
                    }
                }
            }));
            res();
        });
    })
    
}
let obj = [];
promises.push(readFiles('./', obj));
Promise.all(promises).then(() => {
    fs.writeFile('./tests.json', JSON.stringify(obj), (err) => {
        if (err) throw err;
        console.log('tests loaded');
    });
});
