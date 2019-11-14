type ObjStoreDetails = { version: number, parameters?: IDBObjectStoreParameters, indices?:ObjStoreIndex[] };
type ObjStoreIndex= {version:number,name: string, keyPath: string | string[],options?: IDBIndexParameters}
type ObjStores = { [id: string]: ObjStoreDetails }
const ObjectStores = {
    zones: <ObjStoreDetails>{
        version: 1,
        parameters: { keyPath: "id", autoIncrement: true },
    },
    plantae: <ObjStoreDetails>{
        version: 2,
        parameters: { keyPath: "id", autoIncrement: true },
        indices: [
            { version: 3, name: 'family', keyPath: 'family', options: { unique: false } },
            { version: 6, name: 'x', keyPath: 'x', options: { unique: false } },
            { version: 6, name: 'grid', keyPath: 'grid', options: { unique: false } },
        ]
    },
    save: <ObjStoreDetails>{
        version: 3,
        parameters: { keyPath: "id", autoIncrement: true }
    },
    maps: <ObjStoreDetails>{
        version:4,
        parameters: { keyPath: "id", autoIncrement: true }
    }
};

type ObjectStore = keyof typeof ObjectStores;
type ObjectStore2=ObjectStore | ObjectStore[];
interface EarthTransaction extends IDBTransaction {
    objectStore(name: ObjectStore): IDBObjectStore;
}

interface EarthDatabase extends IDBDatabase {
    transaction<T extends ObjectStore>(storeNames: T, mode?: IDBTransactionMode): EarthTransaction
    transaction<T extends ObjectStore[]>(storeNames: T, mode?: IDBTransactionMode): EarthTransaction
    createObjectStore(name: ObjectStore, optionalParameters?: IDBObjectStoreParameters): IDBObjectStore;
}

declare var DB: Promise<EarthDatabase>;
globalThis.DB = new Promise<EarthDatabase>(function (res, rej) {
    var IDB = indexedDB.open("City", 6);
    IDB.onupgradeneeded = function (e) {
        console.log('IDBVersionChangeEvent',e);
        // Save the IDBDatabase interface 
        var db: EarthDatabase = this.result;
        console.log(db);
        Object.keys(ObjectStores).forEach((objstore: ObjectStore) => {
            let createdStore :IDBObjectStore 
            if(ObjectStores[objstore].version>e.oldVersion) {
                createdStore = db.createObjectStore(objstore, ObjectStores[objstore].parameters);
            } else {
                createdStore=this.transaction.objectStore(objstore);
            }
            if(ObjectStores[objstore].indices) {
                ObjectStores[objstore].indices.forEach((index) => {
                    if(e.oldVersion<index.version) {
                        createdStore.createIndex(index.name,index.keyPath, index.options);
                    }
                })
            }
        })
    };
    IDB.onsuccess = function (event) {
        this.result.onerror = function (e) {
             console.log(e,(<IDBRequest>e.target).error.message);
        }
        res(this.result);
    }
})