export abstract class UITAB {
    abstract activated:boolean;
    abstract name:string;
    abstract label:string;
    abstract activate:() => void;
    abstract deactivate:() => void;
    abstract createMenu:(form:HTMLFormElement) => void;
}