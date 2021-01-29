(module
  (import "console" "log" (func $log (param f32)))
  (memory $mem 300 301)
  (export "memory" (memory 0))

  ;;(import "env" "memory" (memory $mem 31 32))

  (global $collisionPoint (mut v128) (v128.const i32x4 0 0 0 0))
  (global $intersectionPointer (mut i32) (i32.const 0))
  (global $nearestDistanceSquared (mut f32) (f32.const 9999999))

  (global $velocity (mut v128) (v128.const i32x4 0 0 0 0))
  (global $velocitySquared (mut f32) (f32.const 0))
  (global $lowestRoot (mut f32) (f32.const 0))
  (global $normalizedVelocity (mut v128) (v128.const i32x4 0 0 0 0))
  (global $collisionNotFound (mut i32) (i32.const 1))

  (global $found (mut i32) (i32.const 0))

  (global $basePoint (mut v128) (v128.const i32x4 0 0 0 0))
    (func $main (export "_start")
        ;; Creating a new io vector within linear memory
        (i32.store (i32.const 0) (i32.const 8))  ;; iov.iov_base - This is a pointer to the start of the 'hello world\n' string
        (i32.store (i32.const 4) (i32.const 12))  ;; iov.iov_len - The length of the 'hello world\n' string
    )
  (func $_initialize
    (param $velocity i32)
    (param $basePointPointer i32)
    (param $interSectionPoint i32)

    (local $temp v128)
    (local $len f32)

    i32.const 1
    global.set $collisionNotFound

    (global.set $intersectionPointer
      (local.get $interSectionPoint)
    )

    (global.set $velocity
      (v128.load
        (local.get $velocity)
      )
    )
    (local.tee $temp
      (f32x4.mul
        (global.get $velocity)
        (global.get $velocity)
      )
    )
    f32x4.extract_lane 0
    local.get $temp
    f32x4.extract_lane 1
    f32.add
    local.get $temp
    f32x4.extract_lane 2
    
    (global.set $velocitySquared
      (f32.add)
    )
    (f32.eq
      (local.tee $len
        (f32.sqrt
          (global.get $velocitySquared)
        )
      )
      (f32.const 0)
    )
      if
        global.get $velocity
        global.set $normalizedVelocity
      else
        local.get $len
        f32.const 1
        f32.eq
          if
            global.get $velocity
            global.set $normalizedVelocity
          else
            f32.const 1
            local.get $len
            f32.div
            f32x4.splat
            global.get $velocity
            f32x4.mul
            global.set $normalizedVelocity
          end
      end

    local.get $basePointPointer
    v128.load
    global.set $basePoint

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
  (func $unitTest
    (param $planePosition i32)
    (result f32)
    (call $testTriangle
      (local.get $planePosition)
    )
  )
  (func $testTriangles_unitTest
    (param $planePosition i32)
    (param $length i32)
    (result f32)
    (local $end i32)
    (local $i i32)

    local.get $planePosition
    local.get $length 
    i32.add   ;;112
    i32.const 28  ;;84
    i32.sub       ;; Subtract one length from end because $i variable is always position-28
    local.set $end

    local.get $planePosition
    i32.const 112
    i32.sub
    local.set $planePosition

    loop $for-loop|0
      (call $testTriangle
        (local.tee $planePosition
          (i32.add
              (local.get $planePosition)
              (i32.const 112) ;; 7*4 = 28; 28*4=112
          )
        )
      )
      drop
      (call $testTriangle
        (i32.add
            (local.get $planePosition)
            (i32.const 28)
        )
      )
      drop
      (call $testTriangle
        (i32.add
            (local.get $planePosition)
            (i32.const 56)
        )
      )
      drop
      (call $testTriangle
        (local.tee $i
           (i32.add
              (local.get $planePosition)
              (i32.const 84)
           )
        )
      )
      return
      drop
      local.get $i
      local.get $end
      i32.lt_u
      br_if $for-loop|0
    end
    f32.const 404
  )
  (func $checkPointInTriangle
    (param $point v128)
    (param $planeCollider v128)
    (param $v0 v128)
    (param $v1 v128)
    (param $v2 v128)
    (result i32)



    (local $shuffled_cross v128)

    (local $temp_v1 v128)
    (local $temp_v1_shuffle v128)
    (local $temp_v2 v128)
    (local $temp_v2_shuffle v128)
    (local $temp_v3 v128)
    (local $temp_v3_shuffle v128)
    (call $v3_dot
      (i8x16.shuffle 8 9 10 11 0 1 2 3 4 5 6 7 0 0 0 0
        (local.get $shuffled_cross
          (local.tee $shuffled_cross
            (f32x4.sub
              (f32x4.mul
                (local.tee $temp_v2
                  (f32x4.sub
                    (local.get $v1)
                    (local.get $point)
                  )
                )
                (local.tee $temp_v1_shuffle
                  (i8x16.shuffle 8 9 10 11 0 1 2 3 4 5 6 7 0 0 0 0
                    (local.get $temp_v1
                      (local.tee $temp_v1
                        (f32x4.sub
                          (local.get $v2)
                          (local.get $point)
                        )
                      )
                    )
                  )
                )
              )
              (f32x4.mul
                (local.get $temp_v1)
                (local.tee $temp_v2_shuffle
                  (i8x16.shuffle 8 9 10 11 0 1 2 3 4 5 6 7 0 0 0 0
                    (local.get $temp_v2
                      (local.get $temp_v2)
                    )
                  )
                )
              )
            )
          )
        )
      )
      (local.get $planeCollider)
    )
    f32.const 0
    f32.lt
    if
      i32.const 0
      return
    end
    (call $v3_dot
      (i8x16.shuffle 8 9 10 11 0 1 2 3 4 5 6 7 0 0 0 0
        (local.get $shuffled_cross
          (local.tee $shuffled_cross
            (f32x4.sub
              (f32x4.mul
                (local.tee $temp_v3
                  (f32x4.sub
                    (local.get $v0)
                    (local.get $point)
                  )
                )
                (local.get $temp_v2_shuffle)
              )
              (f32x4.mul
                (local.get $temp_v2)
                (local.tee $temp_v3_shuffle
                  (i8x16.shuffle 8 9 10 11 0 1 2 3 4 5 6 7 0 0 0 0
                    (local.get $temp_v3)
                    (local.get $temp_v3)
                  )
                )
              )
            )
          )
        )
      )
      (local.get $planeCollider)
    )
    f32.const 0
    f32.lt
    if
      i32.const 0
      return
    end
    (call $v3_dot
      (i8x16.shuffle 8 9 10 11 0 1 2 3 4 5 6 7 0 0 0 0
        (local.get $shuffled_cross
          (local.tee $shuffled_cross
            (f32x4.sub
              (f32x4.mul
                (local.get $temp_v1)
                (local.get $temp_v3_shuffle)
              )
              (f32x4.mul
                (local.get $temp_v3)
                (local.get $temp_v1_shuffle)
              )
            )
          )
        )
      )
      (local.get $planeCollider)
    )
    f32.const 0
    f32.gt
  )
  (func $testTriangle
    (param $planePosition i32)
    
    (result f32)

    (local $planeCollider v128)
    (local $signedDistToTrianglePlane f32)
    (local $normalDotVelocity f32)
    (local $temp_t f32)
    (local $curLowestRoot f32)
    (local $t0 f32)
    (local $t1 f32)
    
    (local $planeIntersectionPoint v128)
    (local $distToCollisionSquared f32)


    (local $triangle0 v128)
    (local $triangle1 v128)
    (local $triangle2 v128)
    
    i32.const 0
    global.set $found

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
    end
    ;;Dot(this.#basePoint, triangle.planeCollider) + triangle.planeCollider[3];
    (local.set $signedDistToTrianglePlane  
      (f32.add
        (f32x4.extract_lane 3 (local.get $planeCollider))
        (call $v3_dot
          (global.get $basePoint)
          (local.get $planeCollider)
        )
      )
    )
    (local.tee $normalDotVelocity
        (call $v3_dot
          (local.get $planeCollider)
          (global.get $velocity)
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
        end
    end

    f32.const 1.0
    global.set $lowestRoot

    (local.set $triangle0
      (v128.load
        (i32.load
          (i32.add
            (i32.const 16)
            (local.get $planePosition)
          )
        )
      )
    )

    (local.set $triangle1
      (v128.load
        (i32.load
          (i32.add
            (i32.const 20)
            (local.get $planePosition)
          )
        )
      )
    )
    (local.set $triangle2
      (v128.load 
        (i32.load
          (i32.add
            (i32.const 24)
            (local.get $planePosition)
          )
        )
      )
    )
    local.get $normalDotVelocity
    f32.const 0
    f32.ne
    if
      (local.tee $t0  ;;t0 = (-1.0 - signedDistToTrianglePlane) / normalDotVelocity;
        (f32.div
          (f32.sub
            (f32.const -1)
            (local.get $signedDistToTrianglePlane)
          )
          (local.get $normalDotVelocity)
        )
      )
      (local.tee $t1   ;; t1 = (1.0 - signedDistToTrianglePlane) / normalDotVelocity;
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
      (call $checkPointInTriangle
        ;;planeIntersectionPoint = this.#basePoint - triangle.planeCollider + this.#velocity * t0
        (local.tee $planeIntersectionPoint
          (f32x4.add
            (f32x4.sub
              (global.get $basePoint)
              (local.get $planeCollider)
            )
            (f32x4.mul
              (global.get $velocity)
              (f32x4.splat
                (f32.max
                  (f32.const 0)
                  (local.get $t0)
                )
              )
            )
          )
        )
        (local.get $planeCollider)
        (local.get $triangle0)
        (local.get $triangle1)
        (local.get $triangle2)
      )
      if
        local.get $t0
        global.set $lowestRoot
        local.get $planeIntersectionPoint
        global.set $collisionPoint
        i32.const 1
        global.set $found
      end
    end
    global.get $found
    i32.eqz
    if
      (local.tee $curLowestRoot
        (call $checkForLowestRoot
          (local.get $triangle0)  
        )
      )
      f32.const 0
      f32.gt
      if
        local.get $curLowestRoot
        global.set $lowestRoot
        i32.const 1
        global.set $found
        local.get $triangle0
        global.set $collisionPoint
      end
      (local.tee $curLowestRoot
        (call $checkForLowestRoot
          (local.get $triangle1)
        )
      )
      f32.const 0
      f32.gt
      if
        local.get $curLowestRoot
        global.set $lowestRoot
        i32.const 1
        global.set $found
        local.get $triangle1
        global.set $collisionPoint

      end
      (local.tee $curLowestRoot
        (call $checkForLowestRoot
          (local.get $triangle2)
        )
      )
      f32.const 0
      f32.gt
      if
        local.get $curLowestRoot
        global.set $lowestRoot
        i32.const 1
        global.set $found
        local.get $triangle2
        global.set $collisionPoint

      end



      (call $checkForLowestRoot2
        (local.get $triangle1)
        (local.get $triangle2)
      )
      drop

      (call $checkForLowestRoot2
        (local.get $triangle0)
        (local.get $triangle1)
      )
      drop

      (call $checkForLowestRoot2
        (local.get $triangle2)
        (local.get $triangle0)
      )
      drop

      ;;var velocitySquaredLength = this.#velocity[0] * this.#velocity[0] + this.#velocity[1] * this.#velocity[1] + this.#velocity[2] * this.#velocity[2];
    end


    global.get $found
    if

           ;;;;;;;;;;;;;;;;;;;;;;;;;;;
      ;; global.get $collisionPoint
      ;; f32x4.extract_lane 0
  ;;    global.get $collisionNotFound
  ;;    i32.eqz
  ;;    f32.convert_i32_u
  ;;      call $log
;;;;;;;;;;;;;;;;;;;;;;;;;;;
      i32.const 1
      global.get $collisionNotFound
      (f32.lt
        (local.tee $distToCollisionSquared
          (f32.mul
            (global.get $lowestRoot)
            (global.get $velocitySquared)
          )
        )
        (global.get $nearestDistanceSquared)
      )
      select
      if

        global.get $intersectionPointer
        global.get $collisionPoint
        v128.store

        local.get $distToCollisionSquared
        global.set $nearestDistanceSquared

        i32.const 0
        global.set $collisionNotFound
      end
    end

    global.get $intersectionPointer
    v128.load
    f32x4.extract_lane 0

   ;; global.get $lowestRoot
    ;;local.get $distToCollisionSquared



  )
  (func $checkForLowestRoot2
    (param $triangle1 v128)
    (param $triangle2 v128)
    (result f32)
    (local $edge v128)
    (local $baseToVertex v128)
    (local $edgeDotBaseToVertex f32)
    (local $edgeDotVelocity f32)
    (local $edgeSquaredLength f32)
    (local $f f32)
    (local $curLowestRoot f32)
    (local.tee $curLowestRoot
     (call $getLowestRoot
      ;;edgeDotVelocity * edgeDotVelocity - edgeSquaredLength * this.#velocitySquaredLength;
        (f32.sub
          (f32.mul
            (local.tee $edgeDotVelocity
              (call $v3_dot
                (local.tee $edge
                  (f32x4.sub
                    (local.get $triangle1)
                    (local.get $triangle2)
                  )
                )
                (global.get $velocity)
              )
            )
            (local.get $edgeDotVelocity)
          )

          (f32.mul
            (local.tee $edgeSquaredLength
              (call $v3_dot
                (local.get $edge)
                (local.get $edge)
              )
            )
            (global.get $velocitySquared)
          )
        )
        ;;2*(edgeSquaredLength * Dot(this.#velocity, this._baseToVertex) - edgeDotVelocity * edgeDotBaseToVertex)
        (f32.mul
          (f32.const 2)
          (f32.sub
            (f32.mul
              (local.get $edgeSquaredLength)
              (call $v3_dot
                (global.get $velocity)
                (local.tee $baseToVertex
                  (f32x4.sub
                    (local.get $triangle2)
                    (global.get $basePoint)
                  )
                )
              )
            )
            (f32.mul
              (local.get $edgeDotVelocity)
              (local.tee $edgeDotBaseToVertex
                (call $v3_dot
                  (local.get $edge)
                  (local.get $baseToVertex)
                )
              )
            )
          )
        )
        ;;edgeSquaredLength * (1.0 - (this._baseToVertex[0] * this._baseToVertex[0] + this._baseToVertex[1] * this._baseToVertex[1] + this._baseToVertex[2] * this._baseToVertex[2]))
          ;;+ edgeDotBaseToVertex * edgeDotBaseToVertex;
        (f32.add
          (f32.mul
            (local.get $edgeSquaredLength)
            (f32.sub
              (f32.const 1)
              (call $v3_dot
                (local.get $baseToVertex)
                (local.get $baseToVertex)
              )
            )
          )
          (f32.mul
            (local.get $edgeDotBaseToVertex)
            (local.get $edgeDotBaseToVertex)
          )
        )
        (global.get $lowestRoot)
      )
    )
    f32.const 0
    f32.gt
    if
      ;;f = (edgeDotVelocity * lowestRoot - edgeDotBaseToVertex) / edgeSquaredLength;
      (local.tee $f
        (f32.div
          (f32.sub
            (f32.mul
              (local.get $edgeDotVelocity)
              (local.get $curLowestRoot)
            )
            (local.get $edgeDotBaseToVertex)
          )
          (local.get $edgeSquaredLength)
        )
      )
      f32.const 0
      f32.lt
      if
        f32.const 0
        return
      end
      local.get $f
      f32.const 1
      f32.gt
      if
        f32.const 0
        return
      end
      local.get $curLowestRoot
      global.set $lowestRoot

      (global.set $collisionPoint
        (f32x4.add
          (local.get $triangle2)
          (f32x4.mul
            (local.get $edge)
            (f32x4.splat
              (local.get $f)
            )
          )
        )
      )
      i32.const 1
      global.set $found
    end
    (local.get $curLowestRoot)
  )
  (func $checkForLowestRoot
    (param $triangle v128)
    (result f32)
    (local $temp_v v128)
    (call $getLowestRoot
      (global.get $velocitySquared)
      (f32.mul
        (call $v3_dot
          (global.get $velocity)
          (local.tee $temp_v
            (f32x4.sub
              (global.get $basePoint)
              (local.get $triangle)
            )
          )
        )
        (f32.const 2)
      )
      (f32.sub
        (call $v3_dot
          (local.get $temp_v)
          (local.get $temp_v)
        )
        (f32.const 1)
      )
      (global.get $lowestRoot)
    )
  )
  
  (func $testTriangles
    (param $planePosition i32)
    (param $length i32)
    (local $end i32)
    (local $i i32)

    local.get $planePosition
    local.get $length 
    i32.add   ;;112
    i32.const 28  ;;84
    i32.sub       ;; Subtract one length from end because $i variable is always position-28
    local.set $end

    local.get $planePosition
    i32.const 112
    i32.sub
    local.set $planePosition

    loop $for-loop|0
      (call $testTriangle
        (local.tee $planePosition
          (i32.add
            (local.get $planePosition)
            (i32.const 112) ;; 7*4 = 28; 28*4=112
          )
        )
      )
      drop
      (call $testTriangle
        (i32.add
          (local.get $planePosition)
          (i32.const 28)
        )
      )
      drop
      (call $testTriangle
        (i32.add
          (local.get $planePosition)
          (i32.const 56)
        )
      )
      drop
      (call $testTriangle
        (local.tee $i
           (i32.add
              (local.get $planePosition)
              (i32.const 84)
          )
        )
      )
      drop
      local.get $i
      local.get $end
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
  (export "testTriangles_unitTest" (func $testTriangles_unitTest))
  (export "_initialize" (func $_initialize))
)