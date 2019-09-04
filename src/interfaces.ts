//type Angle={rad:number, deg:number}
type Zone = {coord:BABYLON.Vector3,ang:Angle,size: {h:number, w:number}}
type subTexture = {
    x: number;
    z: number;
    imageData: ImageData;
}
type savedCamera = {id:number, camera: {alpha: number, beta:number, radius:number, target: BABYLON.Vector3, position: BABYLON.Vector3}}
type PTDresult =
    {
        coord: Vector3,
        ang: Angle,
        size: {
            w: number,
            h: number
        }
    }
type PTResultF= ( coords: PTDresult, plane?:BABYLON.Mesh) => void;

declare namespace DotNet  {
    function invokeMethodAsync(namespace: string, method: string, ...param: any): Promise<any>
    function invokeMethod(namespace: string, method: string, ...param: any): any;
    interface BlazorInstance {
        invokeMethod(method: string, ...param: any): any;
        invokeMethodAsync(method: string, ...param: any): Promise<any>
    }
}
interface loginProvider {
    provider: string,
    accessToken: string,
    userID?: string
}