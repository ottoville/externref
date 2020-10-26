import { InternalTexture } from "../Materials/Textures/internalTexture";
import { Texture } from "../Materials/Textures/texture";
import { PassPostProcess } from "../PostProcesses/passPostProcess";
import { Constants } from "../Engines/constants";
import { Scene } from "../scene";

/**
 * Class used to host texture specific utilities
 */
export class TextureTools {
    /**
     * Uses the GPU to create a copy texture rescaled at a given size
     * @param texture Texture to copy from
     * @param width defines the desired width
     * @param height defines the desired height
     * @param useBilinearMode defines if bilinear mode has to be used
     * @return the generated texture
     */
    public static CreateResizedCopy(texture: Texture, width: number, height: number, useBilinearMode: boolean = true) {

    }
}
