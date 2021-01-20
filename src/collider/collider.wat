(module
  (memory $mem 31 32)
  (export "memory" (memory 0))

  ;;(import "env" "memory" (memory $mem 31 32))
  (global $gv0 (mut v128) (v128.const i32x4 0 0 0 0))

    (func $main (export "_start")
        ;; Creating a new io vector within linear memory
        (i32.store (i32.const 0) (i32.const 8))  ;; iov.iov_base - This is a pointer to the start of the 'hello world\n' string
        (i32.store (i32.const 4) (i32.const 12))  ;; iov.iov_len - The length of the 'hello world\n' string
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
  (func $unitTest (param $position i32)
    (param $velocityNormalizedPointer i32) 
    (param $basePointPointer i32)
    (param $velocityPointer i32)
    (result f32)

    ;;return (left[0] * right[0] + left[1] * right[1] + left[2] * right[2]);

    (local $normalizedVelocity v128)
    (local $basePoint v128)
    (local $velocity v128)
    (local $gv1 v128)
    (local $signedDistToTrianglePlane f32)
    (local $normalDotVelocity f32)
    
    (local.set $normalizedVelocity
      (v128.load(local.get $velocityNormalizedPointer))
    )
    (local.set $basePoint
      (v128.load(local.get $basePointPointer))
    )
    (local.set $velocity
      (v128.load(local.get $velocityPointer))
    )
    (call $testTriangle
      (v128.load(local.get $position))
      (local.get $normalizedVelocity)
      (local.get $velocity)
      (local.get $basePoint)
      (local.get $normalDotVelocity)
      (local.get $signedDistToTrianglePlane)
    )
  )
  (func $testTriangle
    (param $planeCollider v128)
    (param $normalizedVelocity v128)
    (param $velocity v128)
    (param $basePoint v128)
    (param $normalDotVelocity f32)
    (param $signedDistToTrianglePlane f32)
    (result f32)
    (local $t0 f32)
    (call $v3_dot
      (local.get $planeCollider)
      (local.get $normalizedVelocity)
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
          f32.const 1
          f32.lt  ;;if (Math.abs(signedDistToTrianglePlane) >= 1.0)
          if
            ;; embeddedInPlane = true;
            ;; t0 = 0;
            
          else
            f32.const 0
            return
          end

      else


      end

      
        ;;        var normalDotVelocity = Dot(triangle.planeCollider, this.#velocity);
      end
      local.get $normalDotVelocity
  )
  (func $testTriangles (param $position i32) (param $length i32)
    (param $velocityNormalizedPointer i32) 
    (param $basePointPointer i32)
    (param $velocityPointer i32)
    ;;return (left[0] * right[0] + left[1] * right[1] + left[2] * right[2]);

    (local $normalizedVelocity v128)
    (local $basePoint v128)
    (local $velocity v128)
    (local $gv1 v128)
    (local $signedDistToTrianglePlane f32)
    (local $normalDotVelocity f32)
    (local $nextPosition i32)


    (local.set $normalizedVelocity
      (v128.load(local.get $velocityNormalizedPointer))
    )
    (local.set $basePoint
      (v128.load(local.get $basePointPointer))
    )
    (local.set $velocity
      (v128.load(local.get $velocityPointer))
    )
    loop $for-loop|0
      (call $testTriangle
        (v128.load(local.get $position))
        (local.get $normalizedVelocity)
        (local.get $velocity)
        (local.get $basePoint)
        (local.get $normalDotVelocity)
        (local.get $signedDistToTrianglePlane)
      )
      drop
      local.get $position
      i32.const 12
      i32.add
      local.tee $position
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
)