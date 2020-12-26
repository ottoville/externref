/*class ArcRotateCamera {
    calculateViewMatrix() {
        var cosa = Math.cos(this.alpha);
        var sina = Math.sin(this.alpha);
        var cosb = Math.cos(this.beta);
        var sinb = Math.sin(this.beta);
        if (sinb === 0) {
            sinb = 0.0001;
        }
        //@ts-ignore
        var target = this._target
        //@ts-ignore
        this._computationVector.copyFromFloats(this.radius * cosa * sinb, this.radius * cosb, this.radius * sina * sinb);

        //@ts-ignore
        target.addToRef(this._computationVector, this._newPosition);
        //@ts-ignore
        terraEngine.collider._radius = this.collisionRadius.asArray();
        //@ts-ignore
        this._newPosition.subtractToRef(this._position, this._collisionVelocity);
        //@ts-ignore
        this._collisionTriggered = true;

        // coordinator.getNewPosition(this._position, this._collisionVelocity, this._collider, 3, null, this._onCollisionPositionChange, this.uniqueId);
        //@ts-ignore
        this._position.divideToRef(Vector3.FromArray(terraEngine.collider._radius), coordinator._scaledPosition);
        //@ts-ignore
        this._collisionVelocity.divideToRef(Vector3.FromArray(terraEngine.collider._radius), coordinator._scaledVelocity);
        terraEngine.collider.collidedMesh = null;
        terraEngine.collider._retry = 0;

        // terraEngine.collider._initialVelocity = coordinator._scaledVelocity;

        //  terraEngine.collider._initialPosition = coordinator._scaledPosition;
        //@ts-ignore
        coordinator._collideWithWorld(coordinator._scaledPosition.asArray(), coordinator._scaledVelocity.asArray(), terraEngine.collider, 3, coordinator._finalPosition, null);
        //@ts-ignore
        coordinator._finalPosition.multiplyInPlace(Vector3.FromArray(terraEngine.collider._radius));
        //run the callback

        if (!terraEngine.collider.collidedMesh) {
            //@ts-ignore
            this._previousPosition.copyFrom(this._position);
        } else {
            //@ts-ignore
            this.setPosition(coordinator._finalPosition);

            if (this.onCollide) {
                this.onCollide(terraEngine.collider.collidedMesh);
            }
        }

        // Recompute because of constraints
        var cosa = Math.cos(this.alpha);
        var sina = Math.sin(this.alpha);
        var cosb = Math.cos(this.beta);
        var sinb = Math.sin(this.beta);

        if (sinb === 0) {
            sinb = 0.0001;
        }
        //@ts-ignore
        var target = this._getTargetPosition();
        //@ts-ignore
        this._computationVector.copyFromFloats(this.radius * cosa * sinb, this.radius * cosb, this.radius * sina * sinb);
        //@ts-ignore
        target.addToRef(this._computationVector, this._newPosition);
        //@ts-ignore
        this._position.copyFrom(this._newPosition);

        var up = this.upVector;
        if (this.allowUpsideDown && this.beta < 0) {
            up = up.clone();
            up = up.negate();
        }

        //this._computeViewMatrix(this._position, target, up);
        //@ts-ignore
        this._globalPosition.copyFrom(this._position);
        //@ts-ignore
        this._globalCurrentTarget.copyFrom(target);
        //@ts-ignore
        this._collisionTriggered = false;
        // }



        this._currentTarget = target;
        return this._viewMatrix;
    }
}*/