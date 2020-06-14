export class Trait {
    constructor(...args: any[]) {

    }
}
export type TraitClass = typeof Trait;

type TraitableClass = typeof Traitable;
export interface TraitableClassLike extends TraitableClass{
    traitConstructors: Set<TraitClass>;
};
export abstract class Traitable {
   // abstract traitConstructors: Set<TraitClass>;
    constructor(...args: any[]) {
        //childClass: TraitableClassLike
        const childClass: TraitableClassLike = args.shift();
        childClass.traitConstructors.forEach(baseCtor => {
            const obj = new baseCtor(...args);
            //@ts-ignore
            Object.keys(obj).forEach(k => this[k] = obj[k]);
        })
    }
}
export function applyMixins<T extends TraitableClassLike>(derivedCtor: TraitableClassLike, baseCtors: TraitClass[]): TraitableClassLike {
    baseCtors.forEach(baseCtor => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
            if (name != 'destroy')
                return Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name)!);
        });
        derivedCtor.traitConstructors.add(baseCtor)
    });
    return derivedCtor as T;
}