(module
  (memory $mem 200 201)
  (export "memory" (memory 0))

  ;;(import "env" "memory" (memory $mem 31 32))
  (global $gv0 (mut v128) (v128.const i32x4 0 0 0 0))
  (global $planeIntersectionPoint (mut v128) (v128.const i32x4 0 0 0 0))

  (global $velocity (mut v128) (v128.const i32x4 0 0 0 0))
  (global $normalizedVelocity (mut v128) (v128.const i32x4 0 0 0 0))

    (func $main (export "_start")
        ;; Creating a new io vector within linear memory
        (i32.store (i32.const 0) (i32.const 8))  ;; iov.iov_base - This is a pointer to the start of the 'hello world\n' string
        (i32.store (i32.const 4) (i32.const 12))  ;; iov.iov_len - The length of the 'hello world\n' string
    )
  (func $v3_normalize 
    (param $v3 v128)
    (result v128)
    (local $len f32)
    (local $temp v128)

    local.get $v3
    local.get $v3
    f32x4.mul
    local.tee $temp
    f32x4.extract_lane 0
    local.get $temp
    f32x4.extract_lane 1
    f32.add
    local.get $temp
    f32x4.extract_lane 2
    f32.add
    f32.sqrt
    local.tee $len
    f32.const 0
    f32.eq
      if
        local.get $v3
      return
      end
    local.get $len
    f32.const 1
    f32.eq
      if
        local.get $v3
      return
      end
    f32.const 1
    local.get $len
    f32.div
    f32x4.splat
    local.get $v3
    f32x4.mul
  )
  (func $_initialize
    (param $velocity i32)
    local.get $velocity
    v128.load
    global.set $velocity
    global.get $velocity
    call $v3_normalize
    global.set $normalizedVelocity
  )

  (func $v3_dot
    (param $a v128)
    (param $b v128)
    (result f32)
    (local $temp v128)
      (f32x4.mul
        (local.get $a)
        (local.get $b)
      )
      local.tee $temp
      f32x4.extract_lane 0
      local.get $temp
      f32x4.extract_lane 1
      local.get $temp
      f32x4.extract_lane 2
      f32.add
      f32.add
  )

  (func $unitTest (param $planePosition i32)
    (param $basePointPointer i32)
    (param $velocityPointer i32)
    (result f32)

    ;;return (left[0] * right[0] + left[1] * right[1] + left[2] * right[2]);

    (local $basePoint v128)
    (local $velocity v128)
    (local $gv1 v128)
    (local $signedDistToTrianglePlane f32)
    (local $normalDotVelocity f32)
    
    (local.set $basePoint
      (v128.load(local.get $basePointPointer))
    )
    (local.set $velocity
      (v128.load(local.get $velocityPointer))
    )
    (call $testTriangle
      (local.get $planePosition)
      (local.get $velocity)
      (local.get $basePoint)
      (local.get $normalDotVelocity)
      (local.get $signedDistToTrianglePlane)
    )
  )
  (func $checkPointInTriangle
    (param $planeCollider v128)
    (param $offset i32)
    (result i32)
    (local $triangle0 v128)
    (local $triangle1 v128)
    (local $triangle2 v128)

    (
      local.set $triangle0 (v128.load (local.get $offset))
    )

    local.get $offset
    i32.const 16
    i32.add
    v128.load
    local.set $triangle1
    local.get $offset
    i32.const 32
    i32.add
    v128.load
    local.set $triangle2
    

    i32.const 0
  )
  (func $testTriangle
    (param $planePosition i32)
    (param $velocity v128)
    (param $basePoint v128)
    (param $normalDotVelocity f32)
    (param $signedDistToTrianglePlane f32)
    (result f32)

    (local $planeCollider v128)
    (local $t0 f32)
    (local $t1 f32)

    (call $v3_dot
      (local.tee $planeCollider
        (v128.load
         (local.get $planePosition)
       )
      )
      (global.get $normalizedVelocity)
    )
    f32.const 0
    f32.gt
    if
      f32.const 0
      return
    else
      (local.set $signedDistToTrianglePlane  ;;var signedDistToTrianglePlane = Dot(this.#basePoint, triangle.planeCollider) + triangle.planeCollider[3];
        (f32.add
          (f32x4.extract_lane 3 (local.get $planeCollider))
          (call $v3_dot
            (local.get $basePoint)
            (local.get $planeCollider)
          )
        )
      )
      (local.tee $normalDotVelocity
          (call $v3_dot
            (local.get $planeCollider)
            (local.get $velocity)
          )
      )
      f32.const 0
      f32.eq
      if
          local.get $signedDistToTrianglePlane
          f32.abs
          f32.const 1
          f32.ge  ;;if (Math.abs(signedDistToTrianglePlane) >= 1.0)
          if
            f32.const 0
            return
          else
 
          end

      else
            (local.tee $t0  ;;let t0 = (-1.0 - signedDistToTrianglePlane) / normalDotVelocity;
              (f32.div
                (f32.sub
                  (f32.const -1)
                  (local.get $signedDistToTrianglePlane)
                )
                (local.get $normalDotVelocity)
              )
            )
            (local.tee $t1   ;;var t1 = (1.0 - signedDistToTrianglePlane) / normalDotVelocity;
              (f32.div
                (f32.sub
                  (f32.const 1)
                  (local.get $signedDistToTrianglePlane)
                )
                (local.get $normalDotVelocity)
              )
            )
          f32.gt
          if
              local.get $t0
              local.get $t1
              local.set $t0
              local.set $t1
          end
          local.get $t0
          f32.const 1
          f32.gt
          if
            f32.const 0
            return
          end
          local.get $t1
          f32.const 0
          f32.lt
          if
            f32.const 0
            return
          end

          (global.set $planeIntersectionPoint
            (f32x4.add
              (f32x4.sub
                (local.get $basePoint)
                (local.get $planeCollider)
              )
              (f32x4.mul
                (local.get $velocity)
                (f32x4.splat
                  (f32.max
                    (f32.const 0)
                    (local.get $t0)
                  )
                )
              )
          )
        )
        (call $checkPointInTriangle
          (local.get $planeCollider)
          (i32.add
            (local.get $planePosition)
            (i32.const 16)
          )
        )
        drop
      end

      
        ;;        var normalDotVelocity = Dot(triangle.planeCollider, this.#velocity);
      end
      global.get $planeIntersectionPoint
      f32x4.extract_lane 1
  )
  (func $testTriangles
    (param $planePosition i32)
    (param $length i32)
    (param $basePointPointer i32)
    ;;return (left[0] * right[0] + left[1] * right[1] + left[2] * right[2]);

    (local $position i32)

    (local $basePoint v128)
    (local $velocity v128)
    (local $gv1 v128)
    (local $signedDistToTrianglePlane f32)
    (local $normalDotVelocity f32)
    (local $nextPosition i32)


    (local.set $basePoint
      (v128.load(local.get $basePointPointer))
    )

    loop $for-loop|0
      (call $testTriangle
        (local.get $planePosition)
        (local.get $velocity)
        (local.get $basePoint)
        (local.get $normalDotVelocity)
        (local.get $signedDistToTrianglePlane)
      )
      drop

      local.get $planePosition
      i32.const 28 ;;i32.const 12
      i32.add
      local.tee $planePosition
      local.get $length
      i32.lt_u
      br_if $for-loop|0
    end
  )
  (func $getLowestRoot (param $a f32) (param $b f32) (param $c f32) (param $maxR f32) (result f32)
    ;;var determinant = b * b - 4.0 * a * c;
    (local $determinant f32)
    (local $squared f32)
    (local $squaredA f32)
    (local $R1 f32)
    (local $R2 f32)
    (local.tee  $determinant
      (f32.sub
          (f32.mul
            (local.get $b)
            (local.get $b)
          )
          (f32.mul
              (f32.mul
                (local.get $a)
                (local.get $c)
              )
              (f32.const 4.0)
          )
      )
    )
    f32.const 0
    f32.lt
    if
      f32.const 0
      return
    end
    (local.tee $R1
      (f32.div
        (f32.sub
          (f32.neg 
            (local.get $b)
          )
          (local.tee $squared
            (f32.sqrt (local.get $determinant)
          ))
        )
        (local.tee $squaredA
          (f32.mul
            (f32.const 2.0)
            (local.get $a)
          )
        )
      )
    )
    (local.tee $R2
      (f32.div
        (f32.add
          (f32.neg 
            (local.get $b)
          )
          (local.get $squared)
        )
        (local.get $squaredA)
      )
    )
   f32.gt
    if
        local.get $R2
        local.get $R1
        local.set $R2
        local.set $R1
    end
    local.get $R1
    f32.const 0.0
    f32.gt
    if
      local.get $R1
      local.get $maxR
      f32.lt
      if
        local.get $R1
        return
      end
    end
    local.get $R2
    f32.const 0.0
    f32.gt
    if
      local.get $R2
      local.get $maxR
      f32.lt
      if
        local.get $R2
        return
      end
    end
    f32.const 0.0
  )
  (export "getLowestRoot" (func $getLowestRoot))
  (export "testTriangles" (func $testTriangles))
  (export "unitTest" (func $unitTest))
  (export "_initialize" (func $_initialize))
)