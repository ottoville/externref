type ObjStoreDetails = { version: number, parameters?: IDBObjectStoreParameters, indices?:ObjStoreIndex[] };
type ObjStoreIndex= {version:number,name: string, keyPath: string | string[],options?: IDBIndexParameters}


// eslint-disable-next-line @typescript-eslint/no-namespace
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
        content.forEach(function appendContent(content2) {
            if (Array.isArray(content2)) {
                content2.forEach(appendContent)
            } else {
                if (content2 instanceof HTMLElement)
                    elem.appendChild(content2);
                else {
                    elem.appendChild(document.createTextNode(content2));
                }
            }
        });
        return elem;
    }
}