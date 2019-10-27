var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
describe("Ray Test", function () {
    var _this = this;
    this.timeout(100000);
    it("Test A", function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (testresolver, testreject) {
                    var canvas = document.body.appendChild(document.createElement('canvas'));
                    var engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
                    var sceneReadyPromise = new Promise(function (res, rej) {
                        //@ts-ignore
                        window.sceneReady = function (WorldScene) {
                            var scene = new WorldScene(engine, { provider: 'anomyous', accessToken: '123' }, {}, 0);
                            scene.terrainReady.then(function (ground) {
                                console.log('terrain is Ready');
                                res([ground, scene]);
                            }).catch(rej);
                        };
                    });
                    var code = document.body.appendChild(document.createElement('script'));
                    code.setAttribute('type', 'module');
                    code.src = './initscene.js';
                    //<base href="https://www.w3schools.com/" target = "_blank" >
                    code.onerror = function (e) {
                        throw new Error("Failed to load initscene.js " + e.toString());
                    };
                    code.onload = function () {
                        sceneReadyPromise.then(function (arr) {
                            var ray = BABYLON.Ray.Zero();
                            var ground = arr[0];
                            var scene = arr[1];
                            var world = ground.getWorldMatrix();
                            console.log('get cameraViewport');
                            var cameraViewport = scene.tools['CameraTAB'].camera.viewport;
                            console.log('get cameraViewport.toGlobal');
                            var viewport = cameraViewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
                            var x = 200 / engine.getHardwareScalingLevel() - viewport.x;
                            var y = 200 / engine.getHardwareScalingLevel() - (engine.getRenderHeight() - viewport.y - viewport.height);
                            console.log(ray.unprojectRayToRef(x, y, viewport.width, viewport.height, world, scene.tools['CameraTAB'].camera.getViewMatrix(), scene.tools['CameraTAB'].camera.getProjectionMatrix()));
                            console.log(ray.direction);
                            //if (Number.isNaN(ray.direction.x) || Number.isNaN(ray.direction.y) || Number.isNaN(ray.direction.z)) {
                            throw new Error("Creating picking ray failed");
                            testresolver();
                            //}
                        }).catch(testreject);
                    };
                })];
        });
    }); });
});
