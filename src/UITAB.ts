export abstract class UITAB {
    abstract activated:boolean;
    abstract name:string;
    abstract activate:() => void;
    abstract deactivate:() => void;
}