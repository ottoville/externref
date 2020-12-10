export interface Trait {
    destroy(): void;
}
export interface Traitable {
    traits: Set<Trait>
    //initTraits(trait:Trait[]): Trait[];
    destroy(): void;
}

export class Trait {
    constructor(traitable: Traitable) {
        traitable.traits.add(this);
    }
}
/*
export function addTrait<TT>(trait: {
    new(...args: any[]): Trait
}) {
    return function <T extends {
        new(...args: any[]): Traitable,
        prototype: Traitable
    }>(constructor: T): T {
        Object.getOwnPropertyNames(trait.prototype).forEach(name => {
            if (!constructor.prototype.hasOwnProperty(name)) {
                //@ts-ignore
                constructor.prototype[name] = function (...args: any[]) {
                    for (let i = 0; i < this.traits.length; i++) {
                        if (this.traits[i] instanceof trait) {
                            //@ts-ignore
                            return this.traits[i][name](...args);
                        }
                    }
                    throw (new Error('Trait was not found'));
                }
            }
            if (!constructor.prototype.hasOwnProperty('initTraits')) {
                constructor.prototype.initTraits = function (traits: Trait[]) {
                    traits.forEach(trait =>
                        Object.keys(trait).forEach(key => {
                            if (this.hasOwnProperty(key))
                                throw new Error('Trait conflicts with key ' + key);
                            Object.defineProperty(this, key, {
                                //@ts-ignore
                                get: function () { return trait[key] },
                                //@ts-ignore
                                set: function (v) {  trait[key]=v }
                            })
                        })
                    );
                    return traits;
                }
            }
        });

        return class extends constructor {
            constructor(...args: any[]) {
                //const traitSymbol = Symbol();
               // constructor.traits[traitSymbol] = new trait();
                args.push(new trait());
                //try {
                    super(...args);
            }
        }
    }
}*/