/** Alias type for value that can be null */
declare type Nullable<T> = T | null;
/**
 * Alias type for number that are floats
 * @ignorenaming
 */
declare type float = number;
/**
 * Alias type for number that are doubles.
 * @ignorenaming
 */
declare type double = number;
/**
 * Alias type for number that are integer
 * @ignorenaming
 */
declare type int = number;
/** Alias type for number array or Float32Array */
declare type FloatArray = number[] | Float32Array;
/** Alias type for number array or Float32Array or Int32Array or Uint32Array or Uint16Array */
declare type IndicesArray = number[] | Int32Array | Uint32Array | Uint16Array;
/**
 * Alias for types that can be used by a Buffer or VertexBuffer.
 */
declare type DataArray = number[] | ArrayBuffer | ArrayBufferView;
/**
 * Alias type for primitive types
 * @ignorenaming
 */
declare type Primitive = undefined | null | boolean | string | number | Function;
/**
 * Type modifier to make all the properties of an object Readonly
 */
declare type Immutable<T> = T extends Primitive ? T : T extends Array<infer U> ? ReadonlyArray<U> : DeepImmutable<T>;
/**
 * Type modifier to make all the properties of an object Readonly recursively
 */
declare type DeepImmutable<T> = T extends Primitive ? T : T extends Array<infer U> ? DeepImmutableArray<U> : DeepImmutableObject<T>;
/** @hidden */
interface DeepImmutableArray<T> extends ReadonlyArray<DeepImmutable<T>> {
}
/** @hidden */
/** @hidden */
declare type DeepImmutableObject<T> = {
    readonly [K in keyof T]: DeepImmutable<T[K]>;
};

declare const ToGammaSpace: number;
/**
 * Constant used to convert a value to linear space
 * @ignorenaming
 */
declare const ToLinearSpace = 2.2;
/**
 * Constant used to define the minimal number value in Babylon.js
 * @ignorenaming
 */
declare let Epsilon: number;
/**
 * Class used to store quaternion data
 * @see https://en.wikipedia.org/wiki/Quaternion
 * @see http://doc.babylonjs.com/features/position,_rotation,_scaling
 */
declare class Quaternion {
    /** defines the first component (0 by default) */
    x: number;
    /** defines the second component (0 by default) */
    y: number;
    /** defines the third component (0 by default) */
    z: number;
    /** defines the fourth component (1.0 by default) */
    w: number;
    /**
     * Creates a new Quaternion from the given floats
     * @param x defines the first component (0 by default)
     * @param y defines the second component (0 by default)
     * @param z defines the third component (0 by default)
     * @param w defines the fourth component (1.0 by default)
     */
    constructor(
    /** defines the first component (0 by default) */
    x?: number, 
    /** defines the second component (0 by default) */
    y?: number, 
    /** defines the third component (0 by default) */
    z?: number, 
    /** defines the fourth component (1.0 by default) */
    w?: number);
    /**
     * Gets a string representation for the current quaternion
     * @returns a string with the Quaternion coordinates
     */
    toString(): string;
    /**
     * Gets the class name of the quaternion
     * @returns the string "Quaternion"
     */
    getClassName(): string;
    /**
     * Gets a hash code for this quaternion
     * @returns the quaternion hash code
     */
    getHashCode(): number;
    /**
     * Copy the quaternion to an array
     * @returns a new array populated with 4 elements from the quaternion coordinates
     */
    asArray(): number[];
    /**
     * Check if two quaternions are equals
     * @param otherQuaternion defines the second operand
     * @return true if the current quaternion and the given one coordinates are strictly equals
     */
    equals(otherQuaternion: DeepImmutable<Quaternion>): boolean;
    /**
     * Clone the current quaternion
     * @returns a new quaternion copied from the current one
     */
    clone(): Quaternion;
    /**
     * Copy a quaternion to the current one
     * @param other defines the other quaternion
     * @returns the updated current quaternion
     */
    copyFrom(other: DeepImmutable<Quaternion>): Quaternion;
    /**
     * Updates the current quaternion with the given float coordinates
     * @param x defines the x coordinate
     * @param y defines the y coordinate
     * @param z defines the z coordinate
     * @param w defines the w coordinate
     * @returns the updated current quaternion
     */
    copyFromFloats(x: number, y: number, z: number, w: number): Quaternion;
    /**
     * Updates the current quaternion from the given float coordinates
     * @param x defines the x coordinate
     * @param y defines the y coordinate
     * @param z defines the z coordinate
     * @param w defines the w coordinate
     * @returns the updated current quaternion
     */
    set(x: number, y: number, z: number, w: number): Quaternion;
    /**
     * Adds two quaternions
     * @param other defines the second operand
     * @returns a new quaternion as the addition result of the given one and the current quaternion
     */
    add(other: DeepImmutable<Quaternion>): Quaternion;
    /**
     * Add a quaternion to the current one
     * @param other defines the quaternion to add
     * @returns the current quaternion
     */
    addInPlace(other: DeepImmutable<Quaternion>): Quaternion;
    /**
     * Subtract two quaternions
     * @param other defines the second operand
     * @returns a new quaternion as the subtraction result of the given one from the current one
     */
    subtract(other: Quaternion): Quaternion;
    /**
     * Multiplies the current quaternion by a scale factor
     * @param value defines the scale factor
     * @returns a new quaternion set by multiplying the current quaternion coordinates by the float "scale"
     */
    scale(value: number): Quaternion;
    /**
     * Scale the current quaternion values by a factor and stores the result to a given quaternion
     * @param scale defines the scale factor
     * @param result defines the Quaternion object where to store the result
     * @returns the unmodified current quaternion
     */
    scaleToRef(scale: number, result: Quaternion): Quaternion;
    /**
     * Multiplies in place the current quaternion by a scale factor
     * @param value defines the scale factor
     * @returns the current modified quaternion
     */
    scaleInPlace(value: number): Quaternion;
    /**
     * Scale the current quaternion values by a factor and add the result to a given quaternion
     * @param scale defines the scale factor
     * @param result defines the Quaternion object where to store the result
     * @returns the unmodified current quaternion
     */
    scaleAndAddToRef(scale: number, result: Quaternion): Quaternion;
    /**
     * Multiplies two quaternions
     * @param q1 defines the second operand
     * @returns a new quaternion set as the multiplication result of the current one with the given one "q1"
     */
    multiply(q1: DeepImmutable<Quaternion>): Quaternion;
    /**
     * Sets the given "result" as the the multiplication result of the current one with the given one "q1"
     * @param q1 defines the second operand
     * @param result defines the target quaternion
     * @returns the current quaternion
     */
    multiplyToRef(q1: DeepImmutable<Quaternion>, result: Quaternion): Quaternion;
    /**
     * Updates the current quaternion with the multiplication of itself with the given one "q1"
     * @param q1 defines the second operand
     * @returns the currentupdated quaternion
     */
    multiplyInPlace(q1: DeepImmutable<Quaternion>): Quaternion;
    /**
     * Conjugates (1-q) the current quaternion and stores the result in the given quaternion
     * @param ref defines the target quaternion
     * @returns the current quaternion
     */
    conjugateToRef(ref: Quaternion): Quaternion;
    /**
     * Conjugates in place (1-q) the current quaternion
     * @returns the current updated quaternion
     */
    conjugateInPlace(): Quaternion;
    /**
     * Conjugates in place (1-q) the current quaternion
     * @returns a new quaternion
     */
    conjugate(): Quaternion;
    /**
     * Gets length of current quaternion
     * @returns the quaternion length (float)
     */
    length(): number;
    /**
     * Normalize in place the current quaternion
     * @returns the current updated quaternion
     */
    normalize(): Quaternion;    /**
     * Updates the given rotation matrix with the current quaternion values
     * @param result defines the target matrix
     * @returns the current unchanged quaternion
     */
    toRotationMatrix(result: Matrix): Quaternion;
    /**
     * Updates the current quaternion from the given rotation matrix values
     * @param matrix defines the source matrix
     * @returns the current updated quaternion
     */
    fromRotationMatrix(matrix: DeepImmutable<Matrix>): Quaternion;
    /**
     * Creates a new quaternion from a rotation matrix
     * @param matrix defines the source matrix
     * @returns a new quaternion created from the given rotation matrix values
     */
    static FromRotationMatrix(matrix: DeepImmutable<Matrix>): Quaternion;
    /**
     * Updates the given quaternion with the given rotation matrix values
     * @param matrix defines the source matrix
     * @param result defines the target quaternion
     */
    static FromRotationMatrixToRef(matrix: DeepImmutable<Matrix>, result: Quaternion): void;
    /**
     * Returns the dot product (float) between the quaternions "left" and "right"
     * @param left defines the left operand
     * @param right defines the right operand
     * @returns the dot product
     */
    static Dot(left: DeepImmutable<Quaternion>, right: DeepImmutable<Quaternion>): number;
    /**
     * Checks if the two quaternions are close to each other
     * @param quat0 defines the first quaternion to check
     * @param quat1 defines the second quaternion to check
     * @returns true if the two quaternions are close to each other
     */
    static AreClose(quat0: DeepImmutable<Quaternion>, quat1: DeepImmutable<Quaternion>): boolean;
    /**
     * Creates an empty quaternion
     * @returns a new quaternion set to (0.0, 0.0, 0.0)
     */
    static Zero(): Quaternion;
    /**
     * Inverse a given quaternion
     * @param q defines the source quaternion
     * @returns a new quaternion as the inverted current quaternion
     */
    static Inverse(q: DeepImmutable<Quaternion>): Quaternion;
    /**
     * Inverse a given quaternion
     * @param q defines the source quaternion
     * @param result the quaternion the result will be stored in
     * @returns the result quaternion
     */
    static InverseToRef(q: Quaternion, result: Quaternion): Quaternion;
    /**
     * Creates an identity quaternion
     * @returns the identity quaternion
     */
    static Identity(): Quaternion;
    /**
     * Gets a boolean indicating if the given quaternion is identity
     * @param quaternion defines the quaternion to check
     * @returns true if the quaternion is identity
     */
    static IsIdentity(quaternion: DeepImmutable<Quaternion>): boolean;
    /**
     * Creates a new quaternion from data stored into an array
     * @param array defines the data source
     * @param offset defines the offset in the source array where the data starts
     * @returns a new quaternion
     */
    static FromArray(array: DeepImmutable<ArrayLike<number>>, offset?: number): Quaternion;
    /**
     * Create a quaternion from Euler rotation angles
     * @param x Pitch
     * @param y Yaw
     * @param z Roll
     * @returns the new Quaternion
     */
    static FromEulerAngles(x: number, y: number, z: number): Quaternion;
    /**
     * Updates a quaternion from Euler rotation angles
     * @param x Pitch
     * @param y Yaw
     * @param z Roll
     * @param result the quaternion to store the result
     * @returns the updated quaternion
     */
    static FromEulerAnglesToRef(x: number, y: number, z: number, result: Quaternion): Quaternion;
    /**
     * Creates a new quaternion from the given Euler float angles (y, x, z)
     * @param yaw defines the rotation around Y axis
     * @param pitch defines the rotation around X axis
     * @param roll defines the rotation around Z axis
     * @returns the new quaternion
     */
    static RotationYawPitchRoll(yaw: number, pitch: number, roll: number): Quaternion;
    /**
     * Creates a new rotation from the given Euler float angles (y, x, z) and stores it in the target quaternion
     * @param yaw defines the rotation around Y axis
     * @param pitch defines the rotation around X axis
     * @param roll defines the rotation around Z axis
     * @param result defines the target quaternion
     */
    static RotationYawPitchRollToRef(yaw: number, pitch: number, roll: number, result: Quaternion): void;
    /**
     * Creates a new quaternion from the given Euler float angles expressed in z-x-z orientation
     * @param alpha defines the rotation around first axis
     * @param beta defines the rotation around second axis
     * @param gamma defines the rotation around third axis
     * @returns the new quaternion
     */
    static RotationAlphaBetaGamma(alpha: number, beta: number, gamma: number): Quaternion;
    /**
     * Creates a new quaternion from the given Euler float angles expressed in z-x-z orientation and stores it in the target quaternion
     * @param alpha defines the rotation around first axis
     * @param beta defines the rotation around second axis
     * @param gamma defines the rotation around third axis
     * @param result defines the target quaternion
     */
    static RotationAlphaBetaGammaToRef(alpha: number, beta: number, gamma: number, result: Quaternion): void;
      /**
     * Interpolates between two quaternions
     * @param left defines first quaternion
     * @param right defines second quaternion
     * @param amount defines the gradient to use
     * @returns the new interpolated quaternion
     */
    static Slerp(left: DeepImmutable<Quaternion>, right: DeepImmutable<Quaternion>, amount: number): Quaternion;
    /**
     * Interpolates between two quaternions and stores it into a target quaternion
     * @param left defines first quaternion
     * @param right defines second quaternion
     * @param amount defines the gradient to use
     * @param result defines the target quaternion
     */
    static SlerpToRef(left: DeepImmutable<Quaternion>, right: DeepImmutable<Quaternion>, amount: number, result: Quaternion): void;
    /**
     * Interpolate between two quaternions using Hermite interpolation
     * @param value1 defines first quaternion
     * @param tangent1 defines the incoming tangent
     * @param value2 defines second quaternion
     * @param tangent2 defines the outgoing tangent
     * @param amount defines the target quaternion
     * @returns the new interpolated quaternion
     */
    static Hermite(value1: DeepImmutable<Quaternion>, tangent1: DeepImmutable<Quaternion>, value2: DeepImmutable<Quaternion>, tangent2: DeepImmutable<Quaternion>, amount: number): Quaternion;
}
/**
 * Scalar computation library
 */
declare class Scalar {
    /**
     * Two pi constants convenient for computation.
     */
    static TwoPi: number;
    /**
     * Boolean : true if the absolute difference between a and b is lower than epsilon (default = 1.401298E-45)
     * @param a number
     * @param b number
     * @param epsilon (default = 1.401298E-45)
     * @returns true if the absolute difference between a and b is lower than epsilon (default = 1.401298E-45)
     */
    static WithinEpsilon(a: number, b: number, epsilon?: number): boolean;
    /**
     * Returns a string : the upper case translation of the number i to hexadecimal.
     * @param i number
     * @returns the upper case translation of the number i to hexadecimal.
     */
    static ToHex(i: number): string;
    /**
     * Returns -1 if value is negative and +1 is value is positive.
     * @param value the value
     * @returns the value itself if it's equal to zero.
     */
    static Sign(value: number): number;
    /**
     * Returns the value itself if it's between min and max.
     * Returns min if the value is lower than min.
     * Returns max if the value is greater than max.
     * @param value the value to clmap
     * @param min the min value to clamp to (default: 0)
     * @param max the max value to clamp to (default: 1)
     * @returns the clamped value
     */
    static Clamp(value: number, min?: number, max?: number): number;
    /**
     * the log2 of value.
     * @param value the value to compute log2 of
     * @returns the log2 of value.
     */
    static Log2(value: number): number;
    /**
    * Loops the value, so that it is never larger than length and never smaller than 0.
    *
    * This is similar to the modulo operator but it works with floating point numbers.
    * For example, using 3.0 for t and 2.5 for length, the result would be 0.5.
    * With t = 5 and length = 2.5, the result would be 0.0.
    * Note, however, that the behaviour is not defined for negative numbers as it is for the modulo operator
    * @param value the value
    * @param length the length
    * @returns the looped value
    */
    static Repeat(value: number, length: number): number;
    /**
     * Normalize the value between 0.0 and 1.0 using min and max values
     * @param value value to normalize
     * @param min max to normalize between
     * @param max min to normalize between
     * @returns the normalized value
     */
    static Normalize(value: number, min: number, max: number): number;
    /**
    * Denormalize the value from 0.0 and 1.0 using min and max values
    * @param normalized value to denormalize
    * @param min max to denormalize between
    * @param max min to denormalize between
    * @returns the denormalized value
    */
    static Denormalize(normalized: number, min: number, max: number): number;
    /**
    * Calculates the shortest difference between two given angles given in degrees.
    * @param current current angle in degrees
    * @param target target angle in degrees
    * @returns the delta
    */
    static DeltaAngle(current: number, target: number): number;
    /**
    * PingPongs the value t, so that it is never larger than length and never smaller than 0.
    * @param tx value
    * @param length length
    * @returns The returned value will move back and forth between 0 and length
    */
    static PingPong(tx: number, length: number): number;
    /**
    * Interpolates between min and max with smoothing at the limits.
    *
    * This function interpolates between min and max in a similar way to Lerp. However, the interpolation will gradually speed up
    * from the start and slow down toward the end. This is useful for creating natural-looking animation, fading and other transitions.
    * @param from from
    * @param to to
    * @param tx value
    * @returns the smooth stepped value
    */
    static SmoothStep(from: number, to: number, tx: number): number;
    /**
    * Moves a value current towards target.
    *
    * This is essentially the same as Mathf.Lerp but instead the function will ensure that the speed never exceeds maxDelta.
    * Negative values of maxDelta pushes the value away from target.
    * @param current current value
    * @param target target value
    * @param maxDelta max distance to move
    * @returns resulting value
    */
    static MoveTowards(current: number, target: number, maxDelta: number): number;
    /**
    * Same as MoveTowards but makes sure the values interpolate correctly when they wrap around 360 degrees.
    *
    * Variables current and target are assumed to be in degrees. For optimization reasons, negative values of maxDelta
    *  are not supported and may cause oscillation. To push current away from a target angle, add 180 to that angle instead.
    * @param current current value
    * @param target target value
    * @param maxDelta max distance to move
    * @returns resulting angle
    */
    static MoveTowardsAngle(current: number, target: number, maxDelta: number): number;
    /**
     * Creates a new scalar with values linearly interpolated of "amount" between the start scalar and the end scalar.
     * @param start start value
     * @param end target value
     * @param amount amount to lerp between
     * @returns the lerped value
     */
    static Lerp(start: number, end: number, amount: number): number;
    /**
    * Same as Lerp but makes sure the values interpolate correctly when they wrap around 360 degrees.
    * The parameter t is clamped to the range [0, 1]. Variables a and b are assumed to be in degrees.
    * @param start start value
    * @param end target value
    * @param amount amount to lerp between
    * @returns the lerped value
    */
    static LerpAngle(start: number, end: number, amount: number): number;
    /**
    * Calculates the linear parameter t that produces the interpolant value within the range [a, b].
    * @param a start value
    * @param b target value
    * @param value value between a and b
    * @returns the inverseLerp value
    */
    static InverseLerp(a: number, b: number, value: number): number;
    /**
     * Returns a new scalar located for "amount" (float) on the Hermite spline defined by the scalars "value1", "value3", "tangent1", "tangent2".
     * @see http://mathworld.wolfram.com/HermitePolynomial.html
     * @param value1 spline value
     * @param tangent1 spline value
     * @param value2 spline value
     * @param tangent2 spline value
     * @param amount input value
     * @returns hermite result
     */
    static Hermite(value1: number, tangent1: number, value2: number, tangent2: number, amount: number): number;
    /**
    * Returns a random float number between and min and max values
    * @param min min value of random
    * @param max max value of random
    * @returns random value
    */
    static RandomRange(min: number, max: number): number;
    /**
    * This function returns percentage of a number in a given range.
    *
    * RangeToPercent(40,20,60) will return 0.5 (50%)
    * RangeToPercent(34,0,100) will return 0.34 (34%)
    * @param number to convert to percentage
    * @param min min range
    * @param max max range
    * @returns the percentage
    */
    static RangeToPercent(number: number, min: number, max: number): number;
    /**
    * This function returns number that corresponds to the percentage in a given range.
    *
    * PercentToRange(0.34,0,100) will return 34.
    * @param percent to convert to number
    * @param min min range
    * @param max max range
    * @returns the number
    */
    static PercentToRange(percent: number, min: number, max: number): number;
    /**
     * Returns the angle converted to equivalent value between -Math.PI and Math.PI radians.
     * @param angle The angle to normalize in radian.
     * @return The converted angle.
     */
    static NormalizeRadians(angle: number): number;
}
/**
 * Class representing a vector containing 2 coordinates
 */
declare class Vector2 {
    /** defines the first coordinate */
    x: number;
    /** defines the second coordinate */
    y: number;
    /**
     * Creates a new Vector2 from the given x and y coordinates
     * @param x defines the first coordinate
     * @param y defines the second coordinate
     */
    constructor(
    /** defines the first coordinate */
    x?: number, 
    /** defines the second coordinate */
    y?: number);
    /**
     * Gets a string with the Vector2 coordinates
     * @returns a string with the Vector2 coordinates
     */
    toString(): string;
    /**
     * Gets class name
     * @returns the string "Vector2"
     */
    getClassName(): string;
    /**
     * Gets current vector hash code
     * @returns the Vector2 hash code as a number
     */
    getHashCode(): number;
    /**
     * Sets the Vector2 coordinates in the given array or Float32Array from the given index.
     * @param array defines the source array
     * @param index defines the offset in source array
     * @returns the current Vector2
     */
    toArray(array: FloatArray, index?: number): Vector2;
    /**
     * Copy the current vector to an array
     * @returns a new array with 2 elements: the Vector2 coordinates.
     */
    asArray(): number[];
    /**
     * Sets the Vector2 coordinates with the given Vector2 coordinates
     * @param source defines the source Vector2
     * @returns the current updated Vector2
     */
    copyFrom(source: DeepImmutable<Vector2>): Vector2;
    /**
     * Sets the Vector2 coordinates with the given floats
     * @param x defines the first coordinate
     * @param y defines the second coordinate
     * @returns the current updated Vector2
     */
    copyFromFloats(x: number, y: number): Vector2;
    /**
     * Sets the Vector2 coordinates with the given floats
     * @param x defines the first coordinate
     * @param y defines the second coordinate
     * @returns the current updated Vector2
     */
    set(x: number, y: number): Vector2;
    /**
     * Add another vector with the current one
     * @param otherVector defines the other vector
     * @returns a new Vector2 set with the addition of the current Vector2 and the given one coordinates
     */
    add(otherVector: DeepImmutable<Vector2>): Vector2;
    /**
     * Sets the "result" coordinates with the addition of the current Vector2 and the given one coordinates
     * @param otherVector defines the other vector
     * @param result defines the target vector
     * @returns the unmodified current Vector2
     */
    addToRef(otherVector: DeepImmutable<Vector2>, result: Vector2): Vector2;
    /**
     * Set the Vector2 coordinates by adding the given Vector2 coordinates
     * @param otherVector defines the other vector
     * @returns the current updated Vector2
     */
    addInPlace(otherVector: DeepImmutable<Vector2>): Vector2;
    /**
     * Gets a new Vector2 set with the subtracted coordinates of the given one from the current Vector2
     * @param otherVector defines the other vector
     * @returns a new Vector2
     */
    subtract(otherVector: Vector2): Vector2;
    /**
     * Sets the "result" coordinates with the subtraction of the given one from the current Vector2 coordinates.
     * @param otherVector defines the other vector
     * @param result defines the target vector
     * @returns the unmodified current Vector2
     */
    subtractToRef(otherVector: DeepImmutable<Vector2>, result: Vector2): Vector2;
    /**
     * Sets the current Vector2 coordinates by subtracting from it the given one coordinates
     * @param otherVector defines the other vector
     * @returns the current updated Vector2
     */
    subtractInPlace(otherVector: DeepImmutable<Vector2>): Vector2;
    /**
     * Multiplies in place the current Vector2 coordinates by the given ones
     * @param otherVector defines the other vector
     * @returns the current updated Vector2
     */
    multiplyInPlace(otherVector: DeepImmutable<Vector2>): Vector2;
    /**
     * Returns a new Vector2 set with the multiplication of the current Vector2 and the given one coordinates
     * @param otherVector defines the other vector
     * @returns a new Vector2
     */
    multiply(otherVector: DeepImmutable<Vector2>): Vector2;
    /**
     * Sets "result" coordinates with the multiplication of the current Vector2 and the given one coordinates
     * @param otherVector defines the other vector
     * @param result defines the target vector
     * @returns the unmodified current Vector2
     */
    multiplyToRef(otherVector: DeepImmutable<Vector2>, result: Vector2): Vector2;
    /**
     * Gets a new Vector2 set with the Vector2 coordinates multiplied by the given floats
     * @param x defines the first coordinate
     * @param y defines the second coordinate
     * @returns a new Vector2
     */
    multiplyByFloats(x: number, y: number): Vector2;
    /**
     * Returns a new Vector2 set with the Vector2 coordinates divided by the given one coordinates
     * @param otherVector defines the other vector
     * @returns a new Vector2
     */
    divide(otherVector: Vector2): Vector2;
    /**
     * Sets the "result" coordinates with the Vector2 divided by the given one coordinates
     * @param otherVector defines the other vector
     * @param result defines the target vector
     * @returns the unmodified current Vector2
     */
    divideToRef(otherVector: DeepImmutable<Vector2>, result: Vector2): Vector2;
    /**
     * Divides the current Vector2 coordinates by the given ones
     * @param otherVector defines the other vector
     * @returns the current updated Vector2
     */
    divideInPlace(otherVector: DeepImmutable<Vector2>): Vector2;
    /**
     * Gets a new Vector2 with current Vector2 negated coordinates
     * @returns a new Vector2
     */
    negate(): Vector2;
    /**
     * Multiply the Vector2 coordinates by scale
     * @param scale defines the scaling factor
     * @returns the current updated Vector2
     */
    scaleInPlace(scale: number): Vector2;
    /**
     * Returns a new Vector2 scaled by "scale" from the current Vector2
     * @param scale defines the scaling factor
     * @returns a new Vector2
     */
    scale(scale: number): Vector2;
    /**
     * Scale the current Vector2 values by a factor to a given Vector2
     * @param scale defines the scale factor
     * @param result defines the Vector2 object where to store the result
     * @returns the unmodified current Vector2
     */
    scaleToRef(scale: number, result: Vector2): Vector2;
    /**
     * Scale the current Vector2 values by a factor and add the result to a given Vector2
     * @param scale defines the scale factor
     * @param result defines the Vector2 object where to store the result
     * @returns the unmodified current Vector2
     */
    scaleAndAddToRef(scale: number, result: Vector2): Vector2;
    /**
     * Gets a boolean if two vectors are equals
     * @param otherVector defines the other vector
     * @returns true if the given vector coordinates strictly equal the current Vector2 ones
     */
    equals(otherVector: DeepImmutable<Vector2>): boolean;
    /**
     * Gets a boolean if two vectors are equals (using an epsilon value)
     * @param otherVector defines the other vector
     * @param epsilon defines the minimal distance to consider equality
     * @returns true if the given vector coordinates are close to the current ones by a distance of epsilon.
     */
    equalsWithEpsilon(otherVector: DeepImmutable<Vector2>, epsilon?: number): boolean;
    /**
     * Gets a new Vector2 from current Vector2 floored values
     * @returns a new Vector2
     */
    floor(): Vector2;
    /**
     * Gets a new Vector2 from current Vector2 floored values
     * @returns a new Vector2
     */
    fract(): Vector2;
    /**
     * Gets the length of the vector
     * @returns the vector length (float)
     */
    length(): number;
    /**
     * Gets the vector squared length
     * @returns the vector squared length (float)
     */
    lengthSquared(): number;
    /**
     * Normalize the vector
     * @returns the current updated Vector2
     */
    normalize(): Vector2;
    /**
     * Gets a new Vector2 copied from the Vector2
     * @returns a new Vector2
     */
    clone(): Vector2;
    /**
     * Gets a new Vector2(0, 0)
     * @returns a new Vector2
     */
    static Zero(): Vector2;
    /**
     * Gets a new Vector2(1, 1)
     * @returns a new Vector2
     */
    static One(): Vector2;
    /**
     * Gets a new Vector2 set from the given index element of the given array
     * @param array defines the data source
     * @param offset defines the offset in the data source
     * @returns a new Vector2
     */
    static FromArray(array: DeepImmutable<ArrayLike<number>>, offset?: number): Vector2;
    /**
     * Sets "result" from the given index element of the given array
     * @param array defines the data source
     * @param offset defines the offset in the data source
     * @param result defines the target vector
     */
    static FromArrayToRef(array: DeepImmutable<ArrayLike<number>>, offset: number, result: Vector2): void;
    /**
     * Gets a new Vector2 located for "amount" (float) on the CatmullRom spline defined by the given four Vector2
     * @param value1 defines 1st point of control
     * @param value2 defines 2nd point of control
     * @param value3 defines 3rd point of control
     * @param value4 defines 4th point of control
     * @param amount defines the interpolation factor
     * @returns a new Vector2
     */
    static CatmullRom(value1: DeepImmutable<Vector2>, value2: DeepImmutable<Vector2>, value3: DeepImmutable<Vector2>, value4: DeepImmutable<Vector2>, amount: number): Vector2;
    /**
     * Returns a new Vector2 set with same the coordinates than "value" ones if the vector "value" is in the square defined by "min" and "max".
     * If a coordinate of "value" is lower than "min" coordinates, the returned Vector2 is given this "min" coordinate.
     * If a coordinate of "value" is greater than "max" coordinates, the returned Vector2 is given this "max" coordinate
     * @param value defines the value to clamp
     * @param min defines the lower limit
     * @param max defines the upper limit
     * @returns a new Vector2
     */
    static Clamp(value: DeepImmutable<Vector2>, min: DeepImmutable<Vector2>, max: DeepImmutable<Vector2>): Vector2;
    /**
     * Returns a new Vector2 located for "amount" (float) on the Hermite spline defined by the vectors "value1", "value3", "tangent1", "tangent2"
     * @param value1 defines the 1st control point
     * @param tangent1 defines the outgoing tangent
     * @param value2 defines the 2nd control point
     * @param tangent2 defines the incoming tangent
     * @param amount defines the interpolation factor
     * @returns a new Vector2
     */
    static Hermite(value1: DeepImmutable<Vector2>, tangent1: DeepImmutable<Vector2>, value2: DeepImmutable<Vector2>, tangent2: DeepImmutable<Vector2>, amount: number): Vector2;
    /**
     * Returns a new Vector2 located for "amount" (float) on the linear interpolation between the vector "start" adn the vector "end".
     * @param start defines the start vector
     * @param end defines the end vector
     * @param amount defines the interpolation factor
     * @returns a new Vector2
     */
    static Lerp(start: DeepImmutable<Vector2>, end: DeepImmutable<Vector2>, amount: number): Vector2;
    /**
     * Gets the dot product of the vector "left" and the vector "right"
     * @param left defines first vector
     * @param right defines second vector
     * @returns the dot product (float)
     */
    static Dot(left: DeepImmutable<Vector2>, right: DeepImmutable<Vector2>): number;
    /**
     * Returns a new Vector2 equal to the normalized given vector
     * @param vector defines the vector to normalize
     * @returns a new Vector2
     */
    static Normalize(vector: DeepImmutable<Vector2>): Vector2;
    /**
     * Gets a new Vector2 set with the minimal coordinate values from the "left" and "right" vectors
     * @param left defines 1st vector
     * @param right defines 2nd vector
     * @returns a new Vector2
     */
    static Minimize(left: DeepImmutable<Vector2>, right: DeepImmutable<Vector2>): Vector2;
    /**
     * Gets a new Vecto2 set with the maximal coordinate values from the "left" and "right" vectors
     * @param left defines 1st vector
     * @param right defines 2nd vector
     * @returns a new Vector2
     */
    static Maximize(left: DeepImmutable<Vector2>, right: DeepImmutable<Vector2>): Vector2;
    /**
     * Gets a new Vector2 set with the transformed coordinates of the given vector by the given transformation matrix
     * @param vector defines the vector to transform
     * @param transformation defines the matrix to apply
     * @returns a new Vector2
     */
    static Transform(vector: DeepImmutable<Vector2>, transformation: DeepImmutable<Matrix>): Vector2;
    /**
     * Transforms the given vector coordinates by the given transformation matrix and stores the result in the vector "result" coordinates
     * @param vector defines the vector to transform
     * @param transformation defines the matrix to apply
     * @param result defines the target vector
     */
    static TransformToRef(vector: DeepImmutable<Vector2>, transformation: DeepImmutable<Matrix>, result: Vector2): void;
    /**
     * Determines if a given vector is included in a triangle
     * @param p defines the vector to test
     * @param p0 defines 1st triangle point
     * @param p1 defines 2nd triangle point
     * @param p2 defines 3rd triangle point
     * @returns true if the point "p" is in the triangle defined by the vertors "p0", "p1", "p2"
     */
    static PointInTriangle(p: DeepImmutable<Vector2>, p0: DeepImmutable<Vector2>, p1: DeepImmutable<Vector2>, p2: DeepImmutable<Vector2>): boolean;
    /**
     * Gets the distance between the vectors "value1" and "value2"
     * @param value1 defines first vector
     * @param value2 defines second vector
     * @returns the distance between vectors
     */
    static Distance(value1: DeepImmutable<Vector2>, value2: DeepImmutable<Vector2>): number;
    /**
     * Returns the squared distance between the vectors "value1" and "value2"
     * @param value1 defines first vector
     * @param value2 defines second vector
     * @returns the squared distance between vectors
     */
    static DistanceSquared(value1: DeepImmutable<Vector2>, value2: DeepImmutable<Vector2>): number;
    /**
     * Gets a new Vector2 located at the center of the vectors "value1" and "value2"
     * @param value1 defines first vector
     * @param value2 defines second vector
     * @returns a new Vector2
     */
    static Center(value1: DeepImmutable<Vector2>, value2: DeepImmutable<Vector2>): Vector2;
    /**
     * Gets the shortest distance (float) between the point "p" and the segment defined by the two points "segA" and "segB".
     * @param p defines the middle point
     * @param segA defines one point of the segment
     * @param segB defines the other point of the segment
     * @returns the shortest distance
     */
    static DistanceOfPointFromSegment(p: DeepImmutable<Vector2>, segA: DeepImmutable<Vector2>, segB: DeepImmutable<Vector2>): number;
}
/**
 * Vector4 class created for EulerAngle class conversion to Quaternion
 */
declare class Vector4 {
    /** x value of the vector */
    x: number;
    /** y value of the vector */
    y: number;
    /** z value of the vector */
    z: number;
    /** w value of the vector */
    w: number;
    /**
     * Creates a Vector4 object from the given floats.
     * @param x x value of the vector
     * @param y y value of the vector
     * @param z z value of the vector
     * @param w w value of the vector
     */
    constructor(
    /** x value of the vector */
    x: number, 
    /** y value of the vector */
    y: number, 
    /** z value of the vector */
    z: number, 
    /** w value of the vector */
    w: number);
    /**
     * Returns the string with the Vector4 coordinates.
     * @returns a string containing all the vector values
     */
    toString(): string;
    /**
     * Returns the string "Vector4".
     * @returns "Vector4"
     */
    getClassName(): string;
    /**
     * Returns the Vector4 hash code.
     * @returns a unique hash code
     */
    getHashCode(): number;
    /**
     * Returns a new array populated with 4 elements : the Vector4 coordinates.
     * @returns the resulting array
     */
    asArray(): number[];
    /**
     * Populates the given array from the given index with the Vector4 coordinates.
     * @param array array to populate
     * @param index index of the array to start at (default: 0)
     * @returns the Vector4.
     */
    toArray(array: FloatArray, index?: number): Vector4;
    /**
     * Adds the given vector to the current Vector4.
     * @param otherVector the vector to add
     * @returns the updated Vector4.
     */
    addInPlace(otherVector: DeepImmutable<Vector4>): Vector4;
    /**
     * Returns a new Vector4 as the result of the addition of the current Vector4 and the given one.
     * @param otherVector the vector to add
     * @returns the resulting vector
     */
    add(otherVector: DeepImmutable<Vector4>): Vector4;
    /**
     * Updates the given vector "result" with the result of the addition of the current Vector4 and the given one.
     * @param otherVector the vector to add
     * @param result the vector to store the result
     * @returns the current Vector4.
     */
    addToRef(otherVector: DeepImmutable<Vector4>, result: Vector4): Vector4;
    /**
     * Subtract in place the given vector from the current Vector4.
     * @param otherVector the vector to subtract
     * @returns the updated Vector4.
     */
    subtractInPlace(otherVector: DeepImmutable<Vector4>): Vector4;
    /**
     * Returns a new Vector4 with the result of the subtraction of the given vector from the current Vector4.
     * @param otherVector the vector to add
     * @returns the new vector with the result
     */
    subtract(otherVector: DeepImmutable<Vector4>): Vector4;
    /**
     * Sets the given vector "result" with the result of the subtraction of the given vector from the current Vector4.
     * @param otherVector the vector to subtract
     * @param result the vector to store the result
     * @returns the current Vector4.
     */
    subtractToRef(otherVector: DeepImmutable<Vector4>, result: Vector4): Vector4;
    /**
     * Returns a new Vector4 set with the result of the subtraction of the given floats from the current Vector4 coordinates.
     */
    /**
     * Returns a new Vector4 set with the result of the subtraction of the given floats from the current Vector4 coordinates.
     * @param x value to subtract
     * @param y value to subtract
     * @param z value to subtract
     * @param w value to subtract
     * @returns new vector containing the result
     */
    subtractFromFloats(x: number, y: number, z: number, w: number): Vector4;
    /**
     * Sets the given vector "result" set with the result of the subtraction of the given floats from the current Vector4 coordinates.
     * @param x value to subtract
     * @param y value to subtract
     * @param z value to subtract
     * @param w value to subtract
     * @param result the vector to store the result in
     * @returns the current Vector4.
     */
    subtractFromFloatsToRef(x: number, y: number, z: number, w: number, result: Vector4): Vector4;
    /**
     * Returns a new Vector4 set with the current Vector4 negated coordinates.
     * @returns a new vector with the negated values
     */
    negate(): Vector4;
    /**
     * Multiplies the current Vector4 coordinates by scale (float).
     * @param scale the number to scale with
     * @returns the updated Vector4.
     */
    scaleInPlace(scale: number): Vector4;
    /**
     * Returns a new Vector4 set with the current Vector4 coordinates multiplied by scale (float).
     * @param scale the number to scale with
     * @returns a new vector with the result
     */
    scale(scale: number): Vector4;
    /**
     * Sets the given vector "result" with the current Vector4 coordinates multiplied by scale (float).
     * @param scale the number to scale with
     * @param result a vector to store the result in
     * @returns the current Vector4.
     */
    scaleToRef(scale: number, result: Vector4): Vector4;
    /**
     * Scale the current Vector4 values by a factor and add the result to a given Vector4
     * @param scale defines the scale factor
     * @param result defines the Vector4 object where to store the result
     * @returns the unmodified current Vector4
     */
    scaleAndAddToRef(scale: number, result: Vector4): Vector4;
    /**
     * Boolean : True if the current Vector4 coordinates are stricly equal to the given ones.
     * @param otherVector the vector to compare against
     * @returns true if they are equal
     */
    equals(otherVector: DeepImmutable<Vector4>): boolean;
    /**
     * Boolean : True if the current Vector4 coordinates are each beneath the distance "epsilon" from the given vector ones.
     * @param otherVector vector to compare against
     * @param epsilon (Default: very small number)
     * @returns true if they are equal
     */
    equalsWithEpsilon(otherVector: DeepImmutable<Vector4>, epsilon?: number): boolean;
    /**
     * Boolean : True if the given floats are strictly equal to the current Vector4 coordinates.
     * @param x x value to compare against
     * @param y y value to compare against
     * @param z z value to compare against
     * @param w w value to compare against
     * @returns true if equal
     */
    equalsToFloats(x: number, y: number, z: number, w: number): boolean;
    /**
     * Multiplies in place the current Vector4 by the given one.
     * @param otherVector vector to multiple with
     * @returns the updated Vector4.
     */
    multiplyInPlace(otherVector: Vector4): Vector4;
    /**
     * Returns a new Vector4 set with the multiplication result of the current Vector4 and the given one.
     * @param otherVector vector to multiple with
     * @returns resulting new vector
     */
    multiply(otherVector: DeepImmutable<Vector4>): Vector4;
    /**
     * Updates the given vector "result" with the multiplication result of the current Vector4 and the given one.
     * @param otherVector vector to multiple with
     * @param result vector to store the result
     * @returns the current Vector4.
     */
    multiplyToRef(otherVector: DeepImmutable<Vector4>, result: Vector4): Vector4;
    /**
     * Returns a new Vector4 set with the multiplication result of the given floats and the current Vector4 coordinates.
     * @param x x value multiply with
     * @param y y value multiply with
     * @param z z value multiply with
     * @param w w value multiply with
     * @returns resulting new vector
     */
    multiplyByFloats(x: number, y: number, z: number, w: number): Vector4;
    /**
     * Returns a new Vector4 set with the division result of the current Vector4 by the given one.
     * @param otherVector vector to devide with
     * @returns resulting new vector
     */
    divide(otherVector: DeepImmutable<Vector4>): Vector4;
    /**
     * Updates the given vector "result" with the division result of the current Vector4 by the given one.
     * @param otherVector vector to devide with
     * @param result vector to store the result
     * @returns the current Vector4.
     */
    divideToRef(otherVector: DeepImmutable<Vector4>, result: Vector4): Vector4;
    /**
     * Divides the current Vector3 coordinates by the given ones.
     * @param otherVector vector to devide with
     * @returns the updated Vector3.
     */
    divideInPlace(otherVector: DeepImmutable<Vector4>): Vector4;
    /**
     * Updates the Vector4 coordinates with the minimum values between its own and the given vector ones
     * @param other defines the second operand
     * @returns the current updated Vector4
     */
    minimizeInPlace(other: DeepImmutable<Vector4>): Vector4;
    /**
     * Updates the Vector4 coordinates with the maximum values between its own and the given vector ones
     * @param other defines the second operand
     * @returns the current updated Vector4
     */
    maximizeInPlace(other: DeepImmutable<Vector4>): Vector4;
    /**
     * Gets a new Vector4 from current Vector4 floored values
     * @returns a new Vector4
     */
    floor(): Vector4;
    /**
     * Gets a new Vector4 from current Vector3 floored values
     * @returns a new Vector4
     */
    fract(): Vector4;
    /**
     * Returns the Vector4 length (float).
     * @returns the length
     */
    length(): number;
    /**
     * Returns the Vector4 squared length (float).
     * @returns the length squared
     */
    lengthSquared(): number;
    /**
     * Normalizes in place the Vector4.
     * @returns the updated Vector4.
     */
    normalize(): Vector4;

    /**
     * Returns a new Vector4 copied from the current one.
     * @returns the new cloned vector
     */
    clone(): Vector4;
    /**
     * Updates the current Vector4 with the given one coordinates.
     * @param source the source vector to copy from
     * @returns the updated Vector4.
     */
    copyFrom(source: DeepImmutable<Vector4>): Vector4;
    /**
     * Updates the current Vector4 coordinates with the given floats.
     * @param x float to copy from
     * @param y float to copy from
     * @param z float to copy from
     * @param w float to copy from
     * @returns the updated Vector4.
     */
    copyFromFloats(x: number, y: number, z: number, w: number): Vector4;
    /**
     * Updates the current Vector4 coordinates with the given floats.
     * @param x float to set from
     * @param y float to set from
     * @param z float to set from
     * @param w float to set from
     * @returns the updated Vector4.
     */
    set(x: number, y: number, z: number, w: number): Vector4;
    /**
     * Copies the given float to the current Vector3 coordinates
     * @param v defines the x, y, z and w coordinates of the operand
     * @returns the current updated Vector3
     */
    setAll(v: number): Vector4;
    /**
     * Returns a new Vector4 set from the starting index of the given array.
     * @param array the array to pull values from
     * @param offset the offset into the array to start at
     * @returns the new vector
     */
    static FromArray(array: DeepImmutable<ArrayLike<number>>, offset?: number): Vector4;
    /**
     * Updates the given vector "result" from the starting index of the given array.
     * @param array the array to pull values from
     * @param offset the offset into the array to start at
     * @param result the vector to store the result in
     */
    static FromArrayToRef(array: DeepImmutable<ArrayLike<number>>, offset: number, result: Vector4): void;
    /**
     * Updates the given vector "result" from the starting index of the given Float32Array.
     * @param array the array to pull values from
     * @param offset the offset into the array to start at
     * @param result the vector to store the result in
     */
    static FromFloatArrayToRef(array: DeepImmutable<Float32Array>, offset: number, result: Vector4): void;
    /**
     * Updates the given vector "result" coordinates from the given floats.
     * @param x float to set from
     * @param y float to set from
     * @param z float to set from
     * @param w float to set from
     * @param result the vector to the floats in
     */
    static FromFloatsToRef(x: number, y: number, z: number, w: number, result: Vector4): void;
    /**
     * Returns a new Vector4 set to (0.0, 0.0, 0.0, 0.0)
     * @returns the new vector
     */
    static Zero(): Vector4;
    /**
     * Returns a new Vector4 set to (1.0, 1.0, 1.0, 1.0)
     * @returns the new vector
     */
    static One(): Vector4;
    /**
     * Returns a new normalized Vector4 from the given one.
     * @param vector the vector to normalize
     * @returns the vector
     */
    static Normalize(vector: DeepImmutable<Vector4>): Vector4;
    /**
     * Updates the given vector "result" from the normalization of the given one.
     * @param vector the vector to normalize
     * @param result the vector to store the result in
     */
    static NormalizeToRef(vector: DeepImmutable<Vector4>, result: Vector4): void;
    /**
     * Returns a vector with the minimum values from the left and right vectors
     * @param left left vector to minimize
     * @param right right vector to minimize
     * @returns a new vector with the minimum of the left and right vector values
     */
    static Minimize(left: DeepImmutable<Vector4>, right: DeepImmutable<Vector4>): Vector4;
    /**
     * Returns a vector with the maximum values from the left and right vectors
     * @param left left vector to maximize
     * @param right right vector to maximize
     * @returns a new vector with the maximum of the left and right vector values
     */
    static Maximize(left: DeepImmutable<Vector4>, right: DeepImmutable<Vector4>): Vector4;
    /**
     * Returns the distance (float) between the vectors "value1" and "value2".
     * @param value1 value to calulate the distance between
     * @param value2 value to calulate the distance between
     * @return the distance between the two vectors
     */
    static Distance(value1: DeepImmutable<Vector4>, value2: DeepImmutable<Vector4>): number;
    /**
     * Returns the squared distance (float) between the vectors "value1" and "value2".
     * @param value1 value to calulate the distance between
     * @param value2 value to calulate the distance between
     * @return the distance between the two vectors squared
     */
    static DistanceSquared(value1: DeepImmutable<Vector4>, value2: DeepImmutable<Vector4>): number;
    /**
     * Returns a new Vector4 located at the center between the vectors "value1" and "value2".
     * @param value1 value to calulate the center between
     * @param value2 value to calulate the center between
     * @return the center between the two vectors
     */
    static Center(value1: DeepImmutable<Vector4>, value2: DeepImmutable<Vector4>): Vector4;
    /**
     * Returns a new Vector4 set with the result of the normal transformation by the given matrix of the given vector.
     * This methods computes transformed normalized direction vectors only.
     * @param vector the vector to transform
     * @param transformation the transformation matrix to apply
     * @returns the new vector
     */
    static TransformNormal(vector: DeepImmutable<Vector4>, transformation: DeepImmutable<Matrix>): Vector4;
    /**
     * Sets the given vector "result" with the result of the normal transformation by the given matrix of the given vector.
     * This methods computes transformed normalized direction vectors only.
     * @param vector the vector to transform
     * @param transformation the transformation matrix to apply
     * @param result the vector to store the result in
     */
    static TransformNormalToRef(vector: DeepImmutable<Vector4>, transformation: DeepImmutable<Matrix>, result: Vector4): void;
    /**
     * Sets the given vector "result" with the result of the normal transformation by the given matrix of the given floats (x, y, z, w).
     * This methods computes transformed normalized direction vectors only.
     * @param x value to transform
     * @param y value to transform
     * @param z value to transform
     * @param w value to transform
     * @param transformation the transformation matrix to apply
     * @param result the vector to store the results in
     */
    static TransformNormalFromFloatsToRef(x: number, y: number, z: number, w: number, transformation: DeepImmutable<Matrix>, result: Vector4): void;
}
/**
 * Class used to store matrix data (4x4)
 */
declare class Matrix {
    private static _updateFlagSeed;
    private static _identityReadOnly;
    private _isIdentity;
    private _isIdentityDirty;
    private _isIdentity3x2;
    private _isIdentity3x2Dirty;
    /**
     * Gets the update flag of the matrix which is an unique number for the matrix.
     * It will be incremented every time the matrix data change.
     * You can use it to speed the comparison between two versions of the same matrix.
     */
    updateFlag: number;
    private readonly _m;
    /**
     * Gets the internal data of the matrix
     */
    get m(): DeepImmutable<Float32Array>;
    /** @hidden */
    _markAsUpdated(): void;
    /** @hidden */
    private _updateIdentityStatus;
    /**
     * Creates an empty matrix (filled with zeros)
     */
    constructor();
    /**
     * Check if the current matrix is identity
     * @returns true is the matrix is the identity matrix
     */
    isIdentity(): boolean;
    /**
     * Check if the current matrix is identity as a texture matrix (3x2 store in 4x4)
     * @returns true is the matrix is the identity matrix
     */
    isIdentityAs3x2(): boolean;
    /**
     * Gets the determinant of the matrix
     * @returns the matrix determinant
     */
    determinant(): number;
    /**
     * Returns the matrix as a Float32Array
     * @returns the matrix underlying array
     */
    toArray(): DeepImmutable<Float32Array>;
    /**
     * Returns the matrix as a Float32Array
    * @returns the matrix underlying array.
    */
    asArray(): DeepImmutable<Float32Array>;
    /**
     * Inverts the current matrix in place
     * @returns the current inverted matrix
     */
    invert(): Matrix;
    /**
     * Sets all the matrix elements to zero
     * @returns the current matrix
     */
    reset(): Matrix;
    /**
     * Adds the current matrix with a second one
     * @param other defines the matrix to add
     * @returns a new matrix as the addition of the current matrix and the given one
     */
    add(other: DeepImmutable<Matrix>): Matrix;
    /**
     * Sets the given matrix "result" to the addition of the current matrix and the given one
     * @param other defines the matrix to add
     * @param result defines the target matrix
     * @returns the current matrix
     */
    addToRef(other: DeepImmutable<Matrix>, result: Matrix): Matrix;
    /**
     * Adds in place the given matrix to the current matrix
     * @param other defines the second operand
     * @returns the current updated matrix
     */
    addToSelf(other: DeepImmutable<Matrix>): Matrix;
    /**
     * Sets the given matrix to the current inverted Matrix
     * @param other defines the target matrix
     * @returns the unmodified current matrix
     */
    invertToRef(other: Matrix): Matrix;
    /**
     * add a value at the specified position in the current Matrix
     * @param index the index of the value within the matrix. between 0 and 15.
     * @param value the value to be added
     * @returns the current updated matrix
     */
    addAtIndex(index: number, value: number): Matrix;
    /**
     * mutiply the specified position in the current Matrix by a value
     * @param index the index of the value within the matrix. between 0 and 15.
     * @param value the value to be added
     * @returns the current updated matrix
     */
    multiplyAtIndex(index: number, value: number): Matrix;
    /**
     * Inserts the translation vector (using 3 floats) in the current matrix
     * @param x defines the 1st component of the translation
     * @param y defines the 2nd component of the translation
     * @param z defines the 3rd component of the translation
     * @returns the current updated matrix
     */
    setTranslationFromFloats(x: number, y: number, z: number): Matrix;
    /**
     * Adds the translation vector (using 3 floats) in the current matrix
     * @param x defines the 1st component of the translation
     * @param y defines the 2nd component of the translation
     * @param z defines the 3rd component of the translation
     * @returns the current updated matrix
     */
    addTranslationFromFloats(x: number, y: number, z: number): Matrix;

    /**
     * Remove rotation and scaling part from the matrix
     * @returns the updated matrix
     */
    removeRotationAndScaling(): Matrix;
    /**
     * Multiply two matrices
     * @param other defines the second operand
     * @returns a new matrix set with the multiplication result of the current Matrix and the given one
     */
    multiply(other: DeepImmutable<Matrix>): Matrix;
    /**
     * Copy the current matrix from the given one
     * @param other defines the source matrix
     * @returns the current updated matrix
     */
    copyFrom(other: DeepImmutable<Matrix>): Matrix;
    /**
     * Populates the given array from the starting index with the current matrix values
     * @param array defines the target array
     * @param offset defines the offset in the target array where to start storing values
     * @returns the current matrix
     */
    copyToArray(array: Float32Array, offset?: number): Matrix;
    /**
     * Sets the given matrix "result" with the multiplication result of the current Matrix and the given one
     * @param other defines the second operand
     * @param result defines the matrix where to store the multiplication
     * @returns the current matrix
     */
    multiplyToRef(other: DeepImmutable<Matrix>, result: Matrix): Matrix;
    /**
     * Sets the Float32Array "result" from the given index "offset" with the multiplication of the current matrix and the given one
     * @param other defines the second operand
     * @param result defines the array where to store the multiplication
     * @param offset defines the offset in the target array where to start storing values
     * @returns the current matrix
     */
    multiplyToArray(other: DeepImmutable<Matrix>, result: Float32Array, offset: number): Matrix;
    /**
     * Check equality between this matrix and a second one
     * @param value defines the second matrix to compare
     * @returns true is the current matrix and the given one values are strictly equal
     */
    equals(value: DeepImmutable<Matrix>): boolean;
    /**
     * Clone the current matrix
     * @returns a new matrix from the current matrix
     */
    clone(): Matrix;
    /**
     * Returns the name of the current matrix class
     * @returns the string "Matrix"
     */
    getClassName(): string;
    /**
     * Gets the hash code of the current matrix
     * @returns the hash code
     */
    getHashCode(): number;
  
    /**
     * Gets specific row of the matrix
     * @param index defines the number of the row to get
     * @returns the index-th row of the current matrix as a new Vector4
     */
    getRow(index: number): Nullable<Vector4>;
    /**
     * Sets the index-th row of the current matrix to the vector4 values
     * @param index defines the number of the row to set
     * @param row defines the target vector4
     * @returns the updated current matrix
     */
    setRow(index: number, row: Vector4): Matrix;
    /**
     * Compute the transpose of the matrix
     * @returns the new transposed matrix
     */
    transpose(): Matrix;
    /**
     * Compute the transpose of the matrix and store it in a given matrix
     * @param result defines the target matrix
     * @returns the current matrix
     */
    transposeToRef(result: Matrix): Matrix;
    /**
     * Sets the index-th row of the current matrix with the given 4 x float values
     * @param index defines the row index
     * @param x defines the x component to set
     * @param y defines the y component to set
     * @param z defines the z component to set
     * @param w defines the w component to set
     * @returns the updated current matrix
     */
    setRowFromFloats(index: number, x: number, y: number, z: number, w: number): Matrix;
    /**
     * Compute a new matrix set with the current matrix values multiplied by scale (float)
     * @param scale defines the scale factor
     * @returns a new matrix
     */
    scale(scale: number): Matrix;
    /**
     * Scale the current matrix values by a factor to a given result matrix
     * @param scale defines the scale factor
     * @param result defines the matrix to store the result
     * @returns the current matrix
     */
    scaleToRef(scale: number, result: Matrix): Matrix;
    /**
     * Scale the current matrix values by a factor and add the result to a given matrix
     * @param scale defines the scale factor
     * @param result defines the Matrix to store the result
     * @returns the current matrix
     */
    scaleAndAddToRef(scale: number, result: Matrix): Matrix;
    /**
     * Writes to the given matrix a normal matrix, computed from this one (using values from identity matrix for fourth row and column).
     * @param ref matrix to store the result
     */
    toNormalMatrix(ref: Matrix): void;
    /**
     * Gets only rotation part of the current matrix
     * @returns a new matrix sets to the extracted rotation matrix from the current one
     */
    getRotationMatrix(): Matrix;
    /**
     * Extracts the rotation matrix from the current one and sets it as the given "result"
     * @param result defines the target matrix to store data to
     * @returns the current matrix
     */
    getRotationMatrixToRef(result: Matrix): Matrix;
    /**
     * Toggles model matrix from being right handed to left handed in place and vice versa
     */
    toggleModelMatrixHandInPlace(): void;
    /**
     * Toggles projection matrix from being right handed to left handed in place and vice versa
     */
    toggleProjectionMatrixHandInPlace(): void;
    /**
     * Creates a matrix from an array
     * @param array defines the source array
     * @param offset defines an offset in the source array
     * @returns a new Matrix set from the starting index of the given array
     */
    static FromArray(array: DeepImmutable<ArrayLike<number>>, offset?: number): Matrix;
    /**
     * Copy the content of an array into a given matrix
     * @param array defines the source array
     * @param offset defines an offset in the source array
     * @param result defines the target matrix
     */
    static FromArrayToRef(array: DeepImmutable<ArrayLike<number>>, offset: number, result: Matrix): void;
    /**
     * Stores an array into a matrix after having multiplied each component by a given factor
     * @param array defines the source array
     * @param offset defines the offset in the source array
     * @param scale defines the scaling factor
     * @param result defines the target matrix
     */
    static FromFloat32ArrayToRefScaled(array: DeepImmutable<Float32Array>, offset: number, scale: number, result: Matrix): void;
    /**
     * Gets an identity matrix that must not be updated
     */
    static get IdentityReadOnly(): DeepImmutable<Matrix>;
    /**
     * Stores a list of values (16) inside a given matrix
     * @param initialM11 defines 1st value of 1st row
     * @param initialM12 defines 2nd value of 1st row
     * @param initialM13 defines 3rd value of 1st row
     * @param initialM14 defines 4th value of 1st row
     * @param initialM21 defines 1st value of 2nd row
     * @param initialM22 defines 2nd value of 2nd row
     * @param initialM23 defines 3rd value of 2nd row
     * @param initialM24 defines 4th value of 2nd row
     * @param initialM31 defines 1st value of 3rd row
     * @param initialM32 defines 2nd value of 3rd row
     * @param initialM33 defines 3rd value of 3rd row
     * @param initialM34 defines 4th value of 3rd row
     * @param initialM41 defines 1st value of 4th row
     * @param initialM42 defines 2nd value of 4th row
     * @param initialM43 defines 3rd value of 4th row
     * @param initialM44 defines 4th value of 4th row
     * @param result defines the target matrix
     */
    static FromValuesToRef(initialM11: number, initialM12: number, initialM13: number, initialM14: number, initialM21: number, initialM22: number, initialM23: number, initialM24: number, initialM31: number, initialM32: number, initialM33: number, initialM34: number, initialM41: number, initialM42: number, initialM43: number, initialM44: number, result: Matrix): void;
    /**
     * Creates new matrix from a list of values (16)
     * @param initialM11 defines 1st value of 1st row
     * @param initialM12 defines 2nd value of 1st row
     * @param initialM13 defines 3rd value of 1st row
     * @param initialM14 defines 4th value of 1st row
     * @param initialM21 defines 1st value of 2nd row
     * @param initialM22 defines 2nd value of 2nd row
     * @param initialM23 defines 3rd value of 2nd row
     * @param initialM24 defines 4th value of 2nd row
     * @param initialM31 defines 1st value of 3rd row
     * @param initialM32 defines 2nd value of 3rd row
     * @param initialM33 defines 3rd value of 3rd row
     * @param initialM34 defines 4th value of 3rd row
     * @param initialM41 defines 1st value of 4th row
     * @param initialM42 defines 2nd value of 4th row
     * @param initialM43 defines 3rd value of 4th row
     * @param initialM44 defines 4th value of 4th row
     * @returns the new matrix
     */
    static FromValues(initialM11: number, initialM12: number, initialM13: number, initialM14: number, initialM21: number, initialM22: number, initialM23: number, initialM24: number, initialM31: number, initialM32: number, initialM33: number, initialM34: number, initialM41: number, initialM42: number, initialM43: number, initialM44: number): Matrix;
  
    /**
     * Creates a new identity matrix
     * @returns a new identity matrix
     */
    static Identity(): Matrix;
    /**
     * Creates a new identity matrix and stores the result in a given matrix
     * @param result defines the target matrix
     */
    static IdentityToRef(result: Matrix): void;
    /**
     * Creates a new zero matrix
     * @returns a new zero matrix
     */
    static Zero(): Matrix;
    /**
     * Creates a new rotation matrix for "angle" radians around the X axis
     * @param angle defines the angle (in radians) to use
     * @return the new matrix
     */
    static RotationX(angle: number): Matrix;
    /**
     * Creates a new matrix as the invert of a given matrix
     * @param source defines the source matrix
     * @returns the new matrix
     */
    static Invert(source: DeepImmutable<Matrix>): Matrix;
    /**
     * Creates a new rotation matrix for "angle" radians around the X axis and stores it in a given matrix
     * @param angle defines the angle (in radians) to use
     * @param result defines the target matrix
     */
    static RotationXToRef(angle: number, result: Matrix): void;
    /**
     * Creates a new rotation matrix for "angle" radians around the Y axis
     * @param angle defines the angle (in radians) to use
     * @return the new matrix
     */
    static RotationY(angle: number): Matrix;
    /**
     * Creates a new rotation matrix for "angle" radians around the Y axis and stores it in a given matrix
     * @param angle defines the angle (in radians) to use
     * @param result defines the target matrix
     */
    static RotationYToRef(angle: number, result: Matrix): void;
    /**
     * Creates a new rotation matrix for "angle" radians around the Z axis
     * @param angle defines the angle (in radians) to use
     * @return the new matrix
     */
    static RotationZ(angle: number): Matrix;
    /**
     * Creates a new rotation matrix for "angle" radians around the Z axis and stores it in a given matrix
     * @param angle defines the angle (in radians) to use
     * @param result defines the target matrix
     */
    static RotationZToRef(angle: number, result: Matrix): void;
   
    /**
     * Creates a rotation matrix
     * @param yaw defines the yaw angle in radians (Y axis)
     * @param pitch defines the pitch angle in radians (X axis)
     * @param roll defines the roll angle in radians (X axis)
     * @returns the new rotation matrix
     */
    static RotationYawPitchRoll(yaw: number, pitch: number, roll: number): Matrix;
    /**
     * Creates a rotation matrix and stores it in a given matrix
     * @param yaw defines the yaw angle in radians (Y axis)
     * @param pitch defines the pitch angle in radians (X axis)
     * @param roll defines the roll angle in radians (X axis)
     * @param result defines the target matrix
     */
    static RotationYawPitchRollToRef(yaw: number, pitch: number, roll: number, result: Matrix): void;
    /**
     * Creates a scaling matrix
     * @param x defines the scale factor on X axis
     * @param y defines the scale factor on Y axis
     * @param z defines the scale factor on Z axis
     * @returns the new matrix
     */
    static Scaling(x: number, y: number, z: number): Matrix;
    /**
     * Creates a scaling matrix and stores it in a given matrix
     * @param x defines the scale factor on X axis
     * @param y defines the scale factor on Y axis
     * @param z defines the scale factor on Z axis
     * @param result defines the target matrix
     */
    static ScalingToRef(x: number, y: number, z: number, result: Matrix): void;
    /**
     * Creates a translation matrix
     * @param x defines the translation on X axis
     * @param y defines the translation on Y axis
     * @param z defines the translationon Z axis
     * @returns the new matrix
     */
    static Translation(x: number, y: number, z: number): Matrix;
    /**
     * Creates a translation matrix and stores it in a given matrix
     * @param x defines the translation on X axis
     * @param y defines the translation on Y axis
     * @param z defines the translationon Z axis
     * @param result defines the target matrix
     */
    static TranslationToRef(x: number, y: number, z: number, result: Matrix): void;
    /**
     * Returns a new Matrix whose values are the interpolated values for "gradient" (float) between the ones of the matrices "startValue" and "endValue".
     * @param startValue defines the start value
     * @param endValue defines the end value
     * @param gradient defines the gradient factor
     * @returns the new matrix
     */
    static Lerp(startValue: DeepImmutable<Matrix>, endValue: DeepImmutable<Matrix>, gradient: number): Matrix;
    /**
     * Set the given matrix "result" as the interpolated values for "gradient" (float) between the ones of the matrices "startValue" and "endValue".
     * @param startValue defines the start value
     * @param endValue defines the end value
     * @param gradient defines the gradient factor
     * @param result defines the Matrix object where to store data
     */
    static LerpToRef(startValue: DeepImmutable<Matrix>, endValue: DeepImmutable<Matrix>, gradient: number, result: Matrix): void;
    /**
     * Builds a new matrix whose values are computed by:
     * * decomposing the the "startValue" and "endValue" matrices into their respective scale, rotation and translation matrices
     * * interpolating for "gradient" (float) the values between each of these decomposed matrices between the start and the end
     * * recomposing a new matrix from these 3 interpolated scale, rotation and translation matrices
     * @param startValue defines the first matrix
     * @param endValue defines the second matrix
     * @param gradient defines the gradient between the two matrices
     * @returns the new matrix
     */
    static DecomposeLerp(startValue: DeepImmutable<Matrix>, endValue: DeepImmutable<Matrix>, gradient: number): Matrix;
    /**
     * Update a matrix to values which are computed by:
     * * decomposing the the "startValue" and "endValue" matrices into their respective scale, rotation and translation matrices
     * * interpolating for "gradient" (float) the values between each of these decomposed matrices between the start and the end
     * * recomposing a new matrix from these 3 interpolated scale, rotation and translation matrices
     * @param startValue defines the first matrix
     * @param endValue defines the second matrix
     * @param gradient defines the gradient between the two matrices
     * @param result defines the target matrix
     */
    static DecomposeLerpToRef(startValue: DeepImmutable<Matrix>, endValue: DeepImmutable<Matrix>, gradient: number, result: Matrix): void;
 
    /**
     * Create a left-handed orthographic projection matrix
     * @param width defines the viewport width
     * @param height defines the viewport height
     * @param znear defines the near clip plane
     * @param zfar defines the far clip plane
     * @returns a new matrix as a left-handed orthographic projection matrix
     */
    static OrthoLH(width: number, height: number, znear: number, zfar: number): Matrix;
    /**
     * Store a left-handed orthographic projection to a given matrix
     * @param width defines the viewport width
     * @param height defines the viewport height
     * @param znear defines the near clip plane
     * @param zfar defines the far clip plane
     * @param result defines the target matrix
     */
    static OrthoLHToRef(width: number, height: number, znear: number, zfar: number, result: Matrix): void;
    /**
     * Create a left-handed orthographic projection matrix
     * @param left defines the viewport left coordinate
     * @param right defines the viewport right coordinate
     * @param bottom defines the viewport bottom coordinate
     * @param top defines the viewport top coordinate
     * @param znear defines the near clip plane
     * @param zfar defines the far clip plane
     * @returns a new matrix as a left-handed orthographic projection matrix
     */
    static OrthoOffCenterLH(left: number, right: number, bottom: number, top: number, znear: number, zfar: number): Matrix;
    /**
     * Stores a left-handed orthographic projection into a given matrix
     * @param left defines the viewport left coordinate
     * @param right defines the viewport right coordinate
     * @param bottom defines the viewport bottom coordinate
     * @param top defines the viewport top coordinate
     * @param znear defines the near clip plane
     * @param zfar defines the far clip plane
     * @param result defines the target matrix
     */
    static OrthoOffCenterLHToRef(left: number, right: number, bottom: number, top: number, znear: number, zfar: number, result: Matrix): void;
    /**
     * Creates a right-handed orthographic projection matrix
     * @param left defines the viewport left coordinate
     * @param right defines the viewport right coordinate
     * @param bottom defines the viewport bottom coordinate
     * @param top defines the viewport top coordinate
     * @param znear defines the near clip plane
     * @param zfar defines the far clip plane
     * @returns a new matrix as a right-handed orthographic projection matrix
     */
    static OrthoOffCenterRH(left: number, right: number, bottom: number, top: number, znear: number, zfar: number): Matrix;
    /**
     * Stores a right-handed orthographic projection into a given matrix
     * @param left defines the viewport left coordinate
     * @param right defines the viewport right coordinate
     * @param bottom defines the viewport bottom coordinate
     * @param top defines the viewport top coordinate
     * @param znear defines the near clip plane
     * @param zfar defines the far clip plane
     * @param result defines the target matrix
     */
    static OrthoOffCenterRHToRef(left: number, right: number, bottom: number, top: number, znear: number, zfar: number, result: Matrix): void;
    /**
     * Creates a left-handed perspective projection matrix
     * @param width defines the viewport width
     * @param height defines the viewport height
     * @param znear defines the near clip plane
     * @param zfar defines the far clip plane
     * @returns a new matrix as a left-handed perspective projection matrix
     */
    static PerspectiveLH(width: number, height: number, znear: number, zfar: number): Matrix;
    /**
     * Creates a left-handed perspective projection matrix
     * @param fov defines the horizontal field of view
     * @param aspect defines the aspect ratio
     * @param znear defines the near clip plane
     * @param zfar defines the far clip plane
     * @returns a new matrix as a left-handed perspective projection matrix
     */
    static PerspectiveFovLH(fov: number, aspect: number, znear: number, zfar: number): Matrix;
    /**
     * Stores a left-handed perspective projection into a given matrix
     * @param fov defines the horizontal field of view
     * @param aspect defines the aspect ratio
     * @param znear defines the near clip plane
     * @param zfar defines the far clip plane
     * @param result defines the target matrix
     * @param isVerticalFovFixed defines it the fov is vertically fixed (default) or horizontally
     */
    static PerspectiveFovLHToRef(fov: number, aspect: number, znear: number, zfar: number, result: Matrix, isVerticalFovFixed?: boolean): void;
    /**
     * Creates a right-handed perspective projection matrix
     * @param fov defines the horizontal field of view
     * @param aspect defines the aspect ratio
     * @param znear defines the near clip plane
     * @param zfar defines the far clip plane
     * @returns a new matrix as a right-handed perspective projection matrix
     */
    static PerspectiveFovRH(fov: number, aspect: number, znear: number, zfar: number): Matrix;
    /**
     * Stores a right-handed perspective projection into a given matrix
     * @param fov defines the horizontal field of view
     * @param aspect defines the aspect ratio
     * @param znear defines the near clip plane
     * @param zfar defines the far clip plane
     * @param result defines the target matrix
     * @param isVerticalFovFixed defines it the fov is vertically fixed (default) or horizontally
     */
    static PerspectiveFovRHToRef(fov: number, aspect: number, znear: number, zfar: number, result: Matrix, isVerticalFovFixed?: boolean): void;
    /**
     * Stores a perspective projection for WebVR info a given matrix
     * @param fov defines the field of view
     * @param znear defines the near clip plane
     * @param zfar defines the far clip plane
     * @param result defines the target matrix
     * @param rightHanded defines if the matrix must be in right-handed mode (false by default)
     */
    static PerspectiveFovWebVRToRef(fov: {
        upDegrees: number;
        downDegrees: number;
        leftDegrees: number;
        rightDegrees: number;
    }, znear: number, zfar: number, result: Matrix, rightHanded?: boolean): void;
    /**
     * Computes a complete transformation matrix
     * @param viewport defines the viewport to use
     * @param world defines the world matrix
     * @param view defines the view matrix
     * @param projection defines the projection matrix
     * @param zmin defines the near clip plane
     * @param zmax defines the far clip plane
     * @returns the transformation matrix
     */
    static GetFinalMatrix(viewport: DeepImmutable<Viewport>, world: DeepImmutable<Matrix>, view: DeepImmutable<Matrix>, projection: DeepImmutable<Matrix>, zmin: number, zmax: number): Matrix;
    /**
     * Extracts a 2x2 matrix from a given matrix and store the result in a Float32Array
     * @param matrix defines the matrix to use
     * @returns a new Float32Array array with 4 elements : the 2x2 matrix extracted from the given matrix
     */
    static GetAsMatrix2x2(matrix: DeepImmutable<Matrix>): Float32Array;
    /**
     * Extracts a 3x3 matrix from a given matrix and store the result in a Float32Array
     * @param matrix defines the matrix to use
     * @returns a new Float32Array array with 9 elements : the 3x3 matrix extracted from the given matrix
     */
    static GetAsMatrix3x3(matrix: DeepImmutable<Matrix>): Float32Array;
    /**
     * Compute the transpose of a given matrix
     * @param matrix defines the matrix to transpose
     * @returns the new matrix
     */
    static Transpose(matrix: DeepImmutable<Matrix>): Matrix;
    /**
     * Compute the transpose of a matrix and store it in a target matrix
     * @param matrix defines the matrix to transpose
     * @param result defines the target matrix
     */
    static TransposeToRef(matrix: DeepImmutable<Matrix>, result: Matrix): void;
  
    static FromQuaternionToRef(quat: DeepImmutable<Quaternion>, result: Matrix): void;
}
/**
 * Class used to represent a viewport on screen
 */
declare class Viewport {
    /** viewport left coordinate */
    x: number;
    /** viewport top coordinate */
    y: number;
    /**viewport width */
    width: number;
    /** viewport height */
    height: number;
    /**
     * Creates a Viewport object located at (x, y) and sized (width, height)
     * @param x defines viewport left coordinate
     * @param y defines viewport top coordinate
     * @param width defines the viewport width
     * @param height defines the viewport height
     */
    constructor(
    /** viewport left coordinate */
    x: number, 
    /** viewport top coordinate */
    y: number, 
    /**viewport width */
    width: number, 
    /** viewport height */
    height: number);
    /**
     * Creates a new viewport using absolute sizing (from 0-> width, 0-> height instead of 0->1)
     * @param renderWidth defines the rendering width
     * @param renderHeight defines the rendering height
     * @returns a new Viewport
     */
    toGlobal(renderWidth: number, renderHeight: number): Viewport;
    /**
     * Stores absolute viewport value into a target viewport (from 0-> width, 0-> height instead of 0->1)
     * @param renderWidth defines the rendering width
     * @param renderHeight defines the rendering height
     * @param ref defines the target viewport
     * @returns the current viewport
     */
    toGlobalToRef(renderWidth: number, renderHeight: number, ref: Viewport): Viewport;
    /**
     * Returns a new Viewport copied from the current one
     * @returns a new Viewport
     */
    clone(): Viewport;
}
declare class ArrayTools {
    /**
     * Returns an array of the given size filled with element built from the given constructor and the paramters
     * @param size the number of element to construct and put in the array
     * @param itemBuilder a callback responsible for creating new instance of item. Called once per array entry.
     * @returns a new array filled with new objects
     */
    static BuildArray<T>(size: number, itemBuilder: () => T): Array<T>;
}
declare class MathTmp {
    static Matrix: Matrix[];
    static Quaternion: Quaternion[];
}
