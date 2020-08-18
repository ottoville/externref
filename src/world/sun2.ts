import { worldPosition } from "../traits/worldPosition";
import { GPUScene } from "../GPUScene";
import { hasPhysics } from "../physics";
import { TerraScene } from "../TerraScene";
const sundistance = 149600000000;
function rotateMatrix(rad: number, axis: "x" | "y" | "z"): Float32Array {
    // https://www.3dgep.com/3d-math-primer-for-game-programmers-matrices/#Rotation

    // let m = new Matrix();
    //  if (axis == "x") {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    return new Float32Array([
        1, 0, 0, 0,
        0, c, s * -1, 0,
        0, s, c, 0,
        0, 0, 0, 1
    ]);
    /*     m.setRow(0, new Vector4(1, 0, 0, 0));
         m.setRow(1, new Vector4(0, Math.cos(rad), Math.sin(rad) * -1, 0));
         m.setRow(2, new Vector4(0, Math.sin(rad), Math.cos(rad), 0));
         m.setRow(3, new Vector4(0, 0, 0, 1));*/
    //  } else if (axis == "y") {
    /* m.setRow(0, new Vector4(Math.cos(rad), 0, Math.sin(rad), 0));
     m.setRow(1, new Vector4(0, 1, 0, 0));
     m.setRow(2, new Vector4(Math.sin(rad) * -1, 0, Math.cos(rad), 0));
     m.setRow(3, new Vector4(0, 0, 0, 1));*/
    // } else {
    /*  m.setRow(0, new Vector4(Math.cos(rad), Math.sin(rad * -1), 0, 0));
      m.setRow(1, new Vector4(Math.sin(rad), Math.cos(rad), 0, 0));
      m.setRow(2, new Vector4(0, 0, 1, 0));
      m.setRow(3, new Vector4(0, 0, 0, 1))*/
    //  }
    //return m;
}
function matrixTranslate(x: number, y: number, z: number, m: Float32Array) {
    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z))
        throw ('Non numeric input passed to translate()');
    var rx = x * m[0] + y * m[1] + z * m[2] + m[3];
    var ry = x * m[4] + y * m[5] + z * m[6] + m[7];
    var rz = x * m[8] + y * m[9] + z * m[10] + m[11];
    var rw = x * m[12] + y * m[13] + z * m[14] + m[15];
    return {
        x: rx,
        y: ry,
        z: rz,
        w: rw
    }
}
export class Sun2 implements hasPhysics {
    worldPosition = new worldPosition(GPUScene.instance);
    mesh = GPUScene.instance.positionBindGroupNoTime.addDrawable({
        sampleCount: GPUScene.instance.sampleCount,
        rasterizationState: {
            cullMode: 'none',
        },
        primitiveTopology: 'triangle-strip',
        colorStates: [{
            format: "bgra8unorm",
        }],
        vertexStage: {
            module: GPUScene.instance.shaderModules.get("sun.vert")!,
            entryPoint: "main",
        },
        fragmentStage: {
            module: GPUScene.instance.shaderModules.get("sun.frag")!,
            entryPoint: "main"
        }
    }, [this.worldPosition.bufferOffset], 14);

    onPhysicTick(delta: number) {

        let anglePerMinute = (Math.PI * 2) / 1439;
        let meridian: number = Math.PI * 0.1;
      //  let sundistance = 1496000; //divided by 100000
        let sundistance = 149600; //divided by 100000
        let secondsOfDay = ~~((Number(this.scene.gameTime) / 1000) % 86400);
        let minutesOfDay = secondsOfDay / 60;
        
        let sunAngle = new Angle(minutesOfDay * anglePerMinute).sub(meridian);
        let sunPositionX = sundistance * Math.sin(sunAngle);
        let sunPositionY = sundistance * Math.cos(sunAngle);
        let sunm = rotateMatrix(Math.PI * 0.2, 'x');
        let newpos = matrixTranslate(sunPositionX, sunPositionY, 0, sunm);
        this.worldPosition.translation = [newpos.x, newpos.y, newpos.z];
    }
    constructor(public scene: TerraScene) {
        scene.physics.tickables.add(this);
    }
}