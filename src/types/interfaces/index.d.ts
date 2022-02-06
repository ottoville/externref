//type Angle={rad:number, deg:number}
import type { TerraVector2} from "../../Math";


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

interface loginProvider {
    provider: string,
    accessToken: string,
    pointerEvent: PointerEvent,
    userID?: string
}