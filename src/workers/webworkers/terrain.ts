let methods2 = {
    createHeights: () => {
        //native: 95
        //212
        let v1arr = [];
        let v2arr = [];
        let v1v2 = {x:0,y:0,z:0};
        let v1v3 = { x: 0, y: 0, z: 0 };
        let v1v4 = { x: 0, y: 0, z: 0 };
        let norm1 = { x: 0, y: 0, z: 0 };
        let norm2 = { x: 0, y: 0, z: 0 };
        let i = 0;
        let j = 0;
        let k = 0;
        let cd = 0;     // 2D slope coefficient : z = cd * x + h
        let h = 0;
        let d1 = 0;     // facet plane equation : ax + by + cz + d = 0
        let d2 = 0;
        let positionsView = this.positionsView;
        for (var row = 0; row < this._subdivisionsY; row++) {
            for (var col = 0; col < this._subdivisionsX; col++) {
                i = col * 3;
                j = row * (this._subdivisionsX + 1) * 3;
                k = (row + 1) * (this._subdivisionsX + 1) * 3;

                v1arr = [
                    positionsView.getFloat32((j + i) << 2, true),
                    positionsView.getFloat32((j + i + 1) << 2, true),
                    positionsView.getFloat32((j + i + 2) << 2, true),
                ]
                v2arr = [
                    positionsView.getFloat32((j + i + 3) << 2, true),
                    positionsView.getFloat32((j + i + 4) << 2, true),
                    positionsView.getFloat32((j + i + 5) << 2, true),
                ]
                v1v3.x = positionsView.getFloat32((k + i + 0) << 2, true) - v1arr[0];
                v1v3.y = positionsView.getFloat32((k + i + 1) << 2, true) - v1arr[1];
                v1v3.z = positionsView.getFloat32((k + i + 2) << 2, true) - v1arr[2];
                v1v4.x = positionsView.getFloat32((k + i + 3) << 2, true) - v1arr[0];
                v1v4.y = positionsView.getFloat32((k + i + 4) << 2, true) - v1arr[1];
                v1v4.z = positionsView.getFloat32((k + i + 5) << 2, true) - v1arr[2];

                cd = (positionsView.getFloat32((k + i + 2) << 2, true) - v1arr[2]) / (positionsView.getFloat32((k + i + 3) << 2, true) - v1arr[0]);
                h = v1arr[2] - cd * v1arr[0];             // v1 belongs to the slope

                // facet equations :
                // we compute each facet normal vector
                // the equation of the facet plane is : norm.x * x + norm.y * y + norm.z * z + d = 0
                // we compute the value d by applying the equation to v1 which belongs to the plane
                // then we store the facet equation in a Vector4

                v1v2.x = v2arr[0] - v1arr[0];
                v1v2.y = v2arr[1] - v1arr[1];
                v1v2.z = v2arr[2] - v1arr[2];
                // v2.subtractToRef(v1, v1v2);
                //v3.subtractToRef(v1, v1v3);

                //v4.subtractToRef(v1, v1v4);


                norm1.x = v1v4.y * v1v3.z - v1v4.z * v1v3.y;
                norm1.y = v1v4.z * v1v3.x - v1v4.x * v1v3.z;
                norm1.z = v1v4.x * v1v3.y - v1v4.y * v1v3.x;

                //BABYLON.Vector3.CrossToRef(v1v4, v1v3, norm1);  // caution : CrossToRef uses the Tmp class

                norm2.x = v1v2.y * v1v4.z - v1v2.z * v1v4.y;
                norm2.y = v1v2.z * v1v4.x - v1v2.x * v1v4.z;
                norm2.z = v1v2.x * v1v4.y - v1v2.y * v1v4.x;
                // BABYLON.Vector3.CrossToRef(v1v2, v1v4, norm2);

                let norm1length = 1/Math.sqrt(norm1.x * norm1.x + norm1.y * norm1.y + norm1.z * norm1.z);
                let norm2length = 1/Math.sqrt(norm1.x * norm1.x + norm1.y * norm1.y + norm1.z * norm1.z);
                norm1.x *= norm1length;
                norm1.y *= norm1length;
                norm1.z *= norm1length;
                norm2.x *= norm2length;
                norm2.y *= norm2length;
                norm2.z *= norm2length;
                //norm1.normalize();
                //norm2.normalize();

                d1 = -(norm1.x * v1arr[0] + norm1.y * v1arr[1] + norm1.z * v1arr[2]);
                d2 = -(norm2.x * v2arr[0] + norm2.y * v2arr[1] + norm2.z * v2arr[2]);
                this.slopeArr.set([cd, h], (row * this._subdivisionsX + col) * 2);
                this.facet1Arr.set([norm1.x, norm1.y, norm1.z, d1], (row * this._subdivisionsX + col) * 4)
                this.facet2Arr.set([norm2.x, norm2.y, norm2.z, d2], (row * this._subdivisionsX + col) * 4)
            }
        }
    }
}
onmessage = async (e: WorkerMessage) => {
    methods2[e.data.action](e.data);
}