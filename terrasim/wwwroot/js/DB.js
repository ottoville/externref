const ObjectStores = {
    zones: {
        version: 1,
        parameters: { keyPath: "id", autoIncrement: true },
    },
    plantae: {
        version: 2,
        parameters: { keyPath: "id", autoIncrement: true },
        indices: [
            { version: 3, name: 'family', keyPath: 'family', options: { unique: false } }
        ]
    },
    save: {
        version: 3,
        parameters: { keyPath: "id", autoIncrement: true }
    },
    maps: {
        version: 4,
        parameters: { keyPath: "id", autoIncrement: true }
    }
};
DB = new Promise(function (res, rej) {
    var IDB = indexedDB.open("City", 4);
    IDB.onupgradeneeded = function (e) {
        console.log('IDBVersionChangeEvent', e);
        // Save the IDBDatabase interface 
        var db = this.result;
        console.log(db);
        Object.keys(ObjectStores).forEach((objstore) => {
            let createdStore;
            if (ObjectStores[objstore].version > e.oldVersion) {
                createdStore = db.createObjectStore(objstore, ObjectStores[objstore].parameters);
            }
            else {
                createdStore = this.transaction.objectStore(objstore);
            }
            if (ObjectStores[objstore].indices) {
                ObjectStores[objstore].indices.forEach((index) => {
                    if (e.oldVersion < index.version) {
                        createdStore.createIndex(index.name, index.keyPath, index.options);
                    }
                });
            }
        });
    };
    IDB.onsuccess = function (event) {
        this.result.onerror = function (e) {
            console.log(e, e.target.error.message);
        };
        res(this.result);
    };
});
