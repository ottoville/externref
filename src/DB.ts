type ObjStoreDetails = { version: number, parameters?: IDBObjectStoreParameters, indices?:ObjStoreIndex[] };
type ObjStoreIndex= {version:number,name: string, keyPath: string | string[],options?: IDBIndexParameters}
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
            { version: 6, name: 'gridxz', keyPath: ['gridx', 'gridz'], options: { unique: false } },
        ]
    },
    save: <ObjStoreDetails>{
        version: 3,
        parameters: { keyPath: ["type", "name"], autoIncrement: false }
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
globalThis.DB = new Promise<EarthDatabase>(function (res) {
    var IDB = indexedDB.open("City", 6);
    IDB.onupgradeneeded = function (e) {
        console.log('IDBVersionChangeEvent',e);
        // Save the IDBDatabase interface 
        var db: EarthDatabase = this.result;
        

        (<(keyof typeof ObjectStores)[]>Object.keys(ObjectStores)).forEach((objstore) => {
            let createdStore :IDBObjectStore 
            if(ObjectStores[objstore].version>e.oldVersion) {
                createdStore = db.createObjectStore(objstore, ObjectStores[objstore].parameters);
            } else {
                if (!this.transaction)
                    throw (new Error('No transaction'));
                createdStore=this.transaction.objectStore(objstore);
            }
            let indices: ObjStoreIndex[] | undefined;
            if (indices = ObjectStores[objstore].indices) {
                indices.forEach((index) => {
                    if (e.oldVersion < index.version) {
                        createdStore.createIndex(index.name, index.keyPath, index.options);
                    }
                })
            }
        })
    };
    IDB.onsuccess = function () {
        this.result.onerror = function (e) {
             console.log(e,((<IDBRequest>e.target)!).error!.message);
        }
        res(this.result);
    }
})

declare namespace JSX {
    interface ElementClass {
        render: (props: any) => HTMLElement;
    }
    type IntrinsicElements = {
        [elemName in keyof HTMLElementTagNameMap]: {[index:string]:any};
    };
}

abstract class TerraCompoment {
    abstract render(props: { [index: string]: any }): HTMLElement
}


declare var TerraUI: { createElement: (name: string | ((props: any) => HTMLElement), props: { [index: string]: any }, ...content: (HTMLElement | string)[]) => HTMLElement };

globalThis.TerraUI = {
    createElement: (name: string | HTMLElement | ((props: any) => HTMLElement) | (new () => TerraCompoment), props?: { [index: string]: any }, ...content: (HTMLElement | HTMLElement[] | string | string[])[]) => {
        props = props || {};
        const nametype = typeof (name);
        if (nametype === 'function') {
            props.children = content
            if (name.toString().substr(0, 5) === 'class') {
                var instance = new (name as new () => TerraCompoment)()
                return instance.render(props);
            }
            return (name as (props: any) => HTMLElement)(props);
        }
        else if (nametype == 'string')
            var elem = document.createElement(name as string);
        else
            var elem = name as HTMLElement;
            
        for (var key in props) {
            if (key == 'onClick') {
                if(typeof(name)==='string')
                    elem.addEventListener('click', props[key])
            } else if (key == 'onChange') {
                if (typeof (name) === 'string')
                    elem.addEventListener('change', props[key])
            }
            else if (key == 'checked') {
                if (props[key])
                    (elem as HTMLInputElement).checked=true
            
            } else
                elem.setAttribute(key, props[key]);
        }
        content.forEach(function appendContent(content) {
            if (Array.isArray(content)) {
                content.forEach(appendContent)
            } else {
                if (content instanceof HTMLElement)
                    elem.appendChild(content);
                else {
                    elem.appendChild(document.createTextNode(content));
                }
            }
        });
        return elem;
    }
}