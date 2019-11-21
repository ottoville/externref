var fs = require('fs');
fs.readFile('TerraSim.csproj', 'utf-8', function (err, content) {
    if (err) {
        console.log(err);
        return;
    }
    let re = /<Version>([^<]*)<\/Version>/
    let version = re.exec(content)[1];
    fs.readFile('wwwroot/sw.js', 'utf-8', function (err, content2) {
        if (err) {
            console.log(err);
            return;
        }
        content2=content2.split('_VERSION_').join(version + '.' + new Date().getTime()).replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '');
        fs.writeFile('wwwroot/sw.js', content2, (err) => {
            if (err) throw err;
            console.log('Version bumped');
        });
    })
})