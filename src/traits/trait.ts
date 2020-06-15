export interface Traitable2 {
   // traitConstructors: Set<TraitClass>;
    //classDecorator: () => any;
    new(...args:any[]): {

    }
}
export class Trait {
    constructor(...args: [any, any, any, any, any, any, Set<Trait>]) {

    }
    //abstract init(): void;
  /*  static createTrait<T extends Traitable2, T2 extends typeof Trait>(traitClass: T2, constructor: Traitable2): T & T2 {
        Object.getOwnPropertyNames(traitClass.prototype).forEach(name => {
            if (name != 'destroy')
                return Object.defineProperty(constructor.prototype, name, Object.getOwnPropertyDescriptor(traitClass.prototype, name)!);
        });
        const newConstructor = constructor as (T & typeof traitClass);
        return class extends newConstructor {
            constructor(...args: any[]) {
                super(...args);
                const obj = new traitClass(...args);
                //@ts-ignore
                Object.keys(obj).forEach(k => this[k] = obj[k]);
            }
        }

    }*/
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
        childClass.traitConstructors?.forEach(baseCtor => {
            //@ts-ignore
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
        derivedCtor.traitConstructors?.add(baseCtor)
    });
    return derivedCtor as T;
}