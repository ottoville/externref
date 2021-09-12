//type Angle={rad:number, deg:number}
import type { TerraVector2, TerraVector3} from "../../Math";

type Zone = {
    coord: any, ang: any, //Angle,
    size: { h: number, w: number }
}
type subTexture = {
    x: number;
    z: number;
    width: number;
    height: number;
    imageData: GPUTexture | null;
}
type PTDresult =
    {
        coord: TerraVector2,
        rad: number, // Angle,
        size: {
            w: number,
            h: number
        }
    }
type PTResultF= ( coords: PTDresult, plane?:any) => void;

interface loginProvider {
    provider: string,
    accessToken: string,
    pointerEvent: PointerEvent,
    userID?: string
}