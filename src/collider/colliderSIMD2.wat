(module
  (import "rust" "collision_found" (func $collision_found (param i32 f32 f32 i32 i32)))
  (import "rust" "get_lowest_root" (func $getLowestRoot (param f32 f32 f32 f32) (result f32)))
  (import "rust" "collision_point_pointer" (func $get_collision_point_pointer(param i32) (result i32)))
  (import "rust" "check_for_lowest_root0" (func $check_for_lowest_root0(param i32 v128 f32) (result f32)))
  (import "rust" "check_for_lowest_root" (func $check_for_lowest_root(param i32 v128 v128 v128 f32 v128) (result i32)))
  (import "rust" "check_point_in_triangle" (func $check_point_in_triangle(param v128 v128 v128 v128 v128) (result i32)))
  (import "rust" "v3_dot" (func $v3_dot (param v128 v128) (result f32)))
  (import "console" "log" (func $log (param f32)))
  (import "console" "error" (func $console.error (param i32)))
  (import "env" "memory" (memory 16))
  (export "memory" (memory 0))

  ;;(import "env" "memory" (memory $mem 31 32))

  (global $collision_point_ptr (mut i32) (i32.const 0))
  (global $nearestDistanceSquaredPointer (mut i32) (i32.const 0))

  (global $velocity (mut v128) (v128.const i32x4 0 0 0 0))
  (global $velocitySquared (mut f32) (f32.const 0))
  (global $lowest_root_ptr (mut i32) (i32.const 0))
  (global $normalizedVelocity (mut v128) (v128.const i32x4 0 0 0 0))
  
  (global $normalizedVelocityX (mut v128) (v128.const i32x4 0 0 0 0))
  (global $normalizedVelocityY (mut v128) (v128.const i32x4 0 0 0 0))
  (global $normalizedVelocityZ (mut v128) (v128.const i32x4 0 0 0 0))

  (global $basePointX (mut v128) (v128.const i32x4 0 0 0 0))
  (global $basePointY (mut v128) (v128.const i32x4 0 0 0 0))
  (global $basePointZ (mut v128) (v128.const i32x4 0 0 0 0))

  (global $velocityX (mut v128) (v128.const i32x4 0 0 0 0))
  (global $velocityY (mut v128) (v128.const i32x4 0 0 0 0))
  (global $velocityZ (mut v128) (v128.const i32x4 0 0 0 0))


  (global $collisionNotFoundPointer (mut i32) (i32.const 1))
  (global $collidedMeshPointer (mut i32) (i32.const 0))

  (global $found (mut i32) (i32.const 0))

  (global $basePoint (mut v128) (v128.const i32x4 0 0 0 0))

  (global $basePointPointer (mut i32) (i32.const 0))
  (global $velocityPointer (mut i32) (i32.const 0))

  (global $isConstructed (mut i32) (i32.const 0))

  (global $rust_collider_ptr (mut i32) (i32.const 0))

  (global $collidedPointInTrianglePointer (mut i32) (i32.const 0))
  (func $construct
      (param $collisionNotFoundPointer i32)
      (param $nearestDistanceSquared i32)
      (param $collidedMesh i32)
      (param $velocityPointer i32)
      (param $basePointPointer i32)
      (param $collidedPointInTrianglePointer i32)
      (param $rust_collider_ptr i32)
      (param $lowest_root_ptr i32)
      
      (global.set $collision_point_ptr
        (call $get_collision_point_pointer
          (local.get $rust_collider_ptr)
        )
      )
      (global.set $lowest_root_ptr
        (local.get $lowest_root_ptr)
      )
      (global.set $rust_collider_ptr
        (local.get $rust_collider_ptr)
      )

      (global.set $isConstructed
        (i32.const 1)  
      )

     (global.set $collisionNotFoundPointer
        (local.get $collisionNotFoundPointer)
      )
      (global.set $nearestDistanceSquaredPointer
        (local.get $nearestDistanceSquared)
      )
      (global.set $collidedMeshPointer
        (local.get $collidedMesh)
      )
      global.get $nearestDistanceSquaredPointer
      f32.const 9999999
      f32.store

      (global.set $velocityPointer
          (local.get $velocityPointer)
      )
      
      (global.set $basePointPointer
        (local.get $basePointPointer)
      )

      (global.set $collidedPointInTrianglePointer
        (local.get $collidedPointInTrianglePointer)
      )
  )

  (func $_initialize
    (local $temp v128)
    (local $len f32)

    global.get $isConstructed
    i32.eqz
    if
      (call $console.error
        (i32.const 96)
      )
    end

    (global.set $velocity
      (v128.load align=2
        (global.get $velocityPointer)
      )
    )
    (global.set $basePoint
      (v128.load
        (global.get $basePointPointer)
      )
    )      

    global.get $collisionNotFoundPointer
    i32.const 1
    i32.store

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

    global.get $normalizedVelocity
    f32x4.extract_lane 0
    f32x4.splat
    global.set $normalizedVelocityX

    global.get $normalizedVelocity
    f32x4.extract_lane 1
    f32x4.splat
    global.set $normalizedVelocityY

    global.get $normalizedVelocity
    f32x4.extract_lane 2
    f32x4.splat
    global.set $normalizedVelocityZ


    global.get $basePoint
    f32x4.extract_lane 0
    f32x4.splat
    global.set $basePointX

    global.get $basePoint
    f32x4.extract_lane 1
    f32x4.splat
    global.set $basePointY

    global.get $basePoint
    f32x4.extract_lane 2
    f32x4.splat
    global.set $basePointZ


    global.get $velocity
    f32x4.extract_lane 0
    f32x4.splat
    global.set $velocityX

    global.get $velocity
    f32x4.extract_lane 1
    f32x4.splat
    global.set $velocityY

    global.get $velocity
    f32x4.extract_lane 2
    f32x4.splat
    global.set $velocityZ


    global.get $collidedPointInTrianglePointer
    i32.const 0
    i32.store
  )

  ;;(func $v3_dot
  ;;  (param $a v128)
  ;;  (param $b v128)
  ;;  (result f32)
  ;;  (local $temp v128)
  ;;    (f32x4.mul
  ;;      (local.get $a)
  ;;      (local.get $b)
  ;;    )
  ;;    local.tee $temp
  ;;    f32x4.extract_lane 0
  ;;    local.get $temp
  ;;    f32x4.extract_lane 1
  ;;    local.get $temp
  ;;    f32x4.extract_lane 2
  ;;    f32.add
  ;;    f32.add
  ;;)
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
                  (local.tee $temp_v1
                    (f32x4.sub
                      (local.get $v2)
                      (local.get $point)
                    )
                  )
                  (local.get $temp_v1)
                )
              )
            )
            (f32x4.mul
              (local.get $temp_v1)
              (local.tee $temp_v2_shuffle
                (i8x16.shuffle 8 9 10 11 0 1 2 3 4 5 6 7 0 0 0 0
                  (local.get $temp_v2)
                  (local.get $temp_v2)
                )
              )
            )
          )
        )
        (local.get $shuffled_cross)
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
        (local.get $shuffled_cross)
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
    (param $embeddedInPlane i32)
    (param $planePosition i32)
    (param $triangle0 v128)
    (param $triangle1 v128)
    (param $triangle2 v128)
    (param $meshID i32)
    (param $t0 f32)

    (local $planeCollider v128)
    (local $temp_t f32)
    (local $curLowestRoot f32)
    
    (local $planeIntersectionPoint v128)
    (local $distToCollisionSquared f32)

    (local $collidedPointInTriangle i32)
    
    i32.const 0
    global.set $found

    global.get $lowest_root_ptr
    f32.const 1.0
    f32.store
    
    local.get $embeddedInPlane
    i32.eqz
    (if
      (then
        (local.tee $collidedPointInTriangle
          (call $check_point_in_triangle
            ;;planeIntersectionPoint = this.#basePoint - triangle.planeCollider + this.#velocity * t0
            (local.tee $planeIntersectionPoint
              (f32x4.add
                (f32x4.sub
                  (global.get $basePoint)
                  (local.tee $planeCollider
                    (v128.load
                      (local.get $planePosition)
                    )
                  )
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
        )
        (if
          (then
            global.get $lowest_root_ptr
            local.get $t0
            f32.store
            global.get $collision_point_ptr
            local.get $planeIntersectionPoint
            v128.store
            i32.const 1
            global.set $found
          )
        )
      )
    )
    
    global.get $found
    i32.eqz
    if
      (local.tee $curLowestRoot
        (call $check_for_lowest_root0
          (global.get $rust_collider_ptr)
          (local.get $triangle0)  
          (global.get $velocitySquared)
        )
      )
      f32.const 0
      f32.gt
      if
        global.get $lowest_root_ptr
        local.get $curLowestRoot
        f32.store
        i32.const 1
        global.set $found
        global.get $collision_point_ptr
        local.get $triangle0
        v128.store
      end
      (local.tee $curLowestRoot
        (call $check_for_lowest_root0
          (global.get $rust_collider_ptr)
          (local.get $triangle1)  
          (global.get $velocitySquared)
        )
      )
      f32.const 0
      f32.gt
      if
        global.get $lowest_root_ptr
        local.get $curLowestRoot
        f32.store
        i32.const 1
        global.set $found
        global.get $collision_point_ptr
        local.get $triangle1
        v128.store
      end
      (local.tee $curLowestRoot
        (call $check_for_lowest_root0
          (global.get $rust_collider_ptr)
          (local.get $triangle2)  
          (global.get $velocitySquared)

        )
      )
      f32.const 0
      f32.gt
      if
        global.get $lowest_root_ptr
        local.get $curLowestRoot
        f32.store
        i32.const 1
        global.set $found
        global.get $collision_point_ptr
        local.get $triangle2
        v128.store
      end
      (call $check_for_lowest_root
        (global.get $rust_collider_ptr)
        (local.get $triangle1)
        (local.get $triangle2)
        (global.get $velocity)
        (global.get $velocitySquared)
        (global.get $basePoint)
      )
      if
        i32.const 1
        global.set $found
      end
      (call $check_for_lowest_root
        (global.get $rust_collider_ptr)
        (local.get $triangle0)
        (local.get $triangle1)
        (global.get $velocity)
        (global.get $velocitySquared)
        (global.get $basePoint)
      )
      if
        i32.const 1
        global.set $found
      end
      (call $check_for_lowest_root
        (global.get $rust_collider_ptr)
        (local.get $triangle2)
        (local.get $triangle0)
        (global.get $velocity)
        (global.get $velocitySquared)
        (global.get $basePoint)
      )
      if
        i32.const 1
        global.set $found
      end
    end


    global.get $found
    if
      (call $collision_found
        (global.get $rust_collider_ptr)
        (
          f32.load
           (global.get $lowest_root_ptr)
        )
        (global.get $velocitySquared)
        (local.get $collidedPointInTriangle)
        (local.get $planePosition)
      )



    ;;  i32.const 1
    ;;  (f32.lt
    ;;    (local.tee $distToCollisionSquared
    ;;      (f32.mul 
    ;;        (global.get $lowestRoot)
    ;;        (f32.mul
    ;;          (global.get $lowestRoot)
    ;;          (global.get $velocitySquared)
    ;;        )
    ;;      )
    ;;    )
    ;;    (f32.load
    ;;      (global.get $nearestDistanceSquaredPointer)
    ;;    )
    ;;  )
    ;;  (i32.load
    ;;    (global.get $collisionNotFoundPointer)
    ;;  )
    ;;  select
    ;;  if
    ;;    global.get $intersectionPointer
    ;;    global.get $collisionPoint
    ;;    v128.store
    ;;    global.get $nearestDistanceSquaredPointer
    ;;    local.get $distToCollisionSquared
    ;;    f32.store
    ;;    global.get $collisionNotFoundPointer
    ;;    i32.const 0
    ;;    i32.store
    ;;    global.get $collidedMeshPointer
    ;;    local.get $meshID
    ;;    i32.store
;;
    ;;    global.get $collidedPointInTrianglePointer
    ;;    local.get $planePosition
    ;;    i32.const 0
    ;;    local.get $collidedPointInTriangle
    ;;    select
    ;;    i32.store
    ;;  end
    end
  )
  (func $test_checkForLowestRoot2
    (local $collision_point v128)

    (global.set $velocity
      (v128.const f32x4 -4.0660706 -3.409584 0.069244385 0.0)
    )
    (global.set $velocitySquared
      (f32.const 28.162988662719727)
    )
    (global.set $basePoint
      (v128.const f32x4 313.66742 66.45387 -343.3466 0.0)
    )
    (global.set $found
      (i32.const 0)
    )
    (call $checkForLowestRoot2
      (v128.const f32x4 312.5 59.043133 -390.625 0.000000000000000000000000000000000000000000022)
      (v128.const f32x4 312.5 69.87059 -312.5 0.000000000000000000000000000000000000000000022)
    )
    global.get $found
    i32.eqz
    if
      unreachable
    end
  )
  (func $checkForLowestRoot2
    (param $triangle1 v128)
    (param $triangle2 v128)

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
        (f32.load
          (global.get $lowest_root_ptr)
        )
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
        return
      end
      local.get $f
      f32.const 1
      f32.gt
      if
        return
      end
      global.get $lowest_root_ptr
      local.get $curLowestRoot
      f32.store
      
      (v128.store
        (global.get $collision_point_ptr)
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
      (
        f32.load
        (global.get $lowest_root_ptr)
      )
    )
  )
  (func $simd_dot
    (param $x1 v128)
    (param $x2 v128)
    (param $y1 v128)
    (param $y2 v128)
    (param $z1 v128)
    (param $z2 v128)

    (result v128)

    (f32x4.add
      (f32x4.add
        (f32x4.mul
          (local.get $x1)
          (local.get $x2)
        )
        (f32x4.mul
          (local.get $y1)
          (local.get $y2)
        )
      )
      (f32x4.mul
          (local.get $z1)
          (local.get $z2)
      )
    )
  )
  (func $testTriangles
    (param $planePosition i32)
    (param $planePositionHorizontal i32)
    (param $length i32)
    (param $meshID i32)

    (local $end i32)

    (local $planeX v128)
    (local $planeY v128)
    (local $planeZ v128)

    (local $signedDistToTrianglePlane v128)
    (local $normalDotVelocity v128)

    (local $t0 v128)
    (local $t1 v128)

    (local $embeddedInPlane v128)
    (local $dotOverZero v128)
    (local $return v128)

    local.get $length
    i32.eqz
    if
      return
    end

    local.get $planePosition
    local.get $length 
    i32.add   ;;112
    local.set $end

    local.get $planePositionHorizontal
    i32.const 64
    i32.sub
    local.set $planePositionHorizontal
    loop $for-loop|0
      
      (i32.eqz
        (i32x4.all_true
          (local.tee $dotOverZero
            (f32x4.gt
              (call $simd_dot
                (local.tee $planeX
                  (v128.load
                    (local.tee $planePositionHorizontal
                      (i32.add
                        (local.get $planePositionHorizontal)
                        (i32.const 64)
                      )
                    )
                  )
                )
                (global.get $normalizedVelocityX)
                (local.tee $planeY
                  (v128.load offset=16
                      (local.get $planePositionHorizontal)
                  )
                )
                (global.get $normalizedVelocityY)
                (local.tee $planeZ
                  (v128.load offset=32
                      (local.get $planePositionHorizontal)
                  )
                )
                (global.get $normalizedVelocityZ)
              )
              (v128.const f32x4 0 0 0 0)
            )
          )
        )
      )
      (if
        (then
          (local.set $signedDistToTrianglePlane
          (f32x4.add
            (v128.load offset=48
              (local.get $planePositionHorizontal)
            )
            (call $simd_dot
              (global.get $basePointX)
              (local.get $planeX)
              
              (global.get $basePointY)
              (local.get $planeY)
              
              (global.get $basePointZ)
              (local.get $planeZ)
            )
          )
        )

        ;; Calculate dot angle between velocity and normal
        (local.tee $embeddedInPlane
          (f32x4.lt
            (f32x4.abs
              (local.tee $normalDotVelocity
                (call $simd_dot
                  (local.get $planeX)
                  (global.get $velocityX)
                  (local.get $planeY)
                  (global.get $velocityY)
                  (local.get $planeZ)
                  (global.get $velocityZ)
                )
              )
            )
            (v128.const f32x4 0.0009 0.0009 0.0009 0.0009)
          )
        )
        i32x4.all_true
        i32.eqz
        ;; Some is not embedded in plane
        (if 
          (then
            ;;var t0 = (-1.0 - signedDistToTrianglePlane) / normalDotVelocity;
            (local.set $t0
              (f32x4.div
                (f32x4.sub
                  (v128.const f32x4 -1 -1 -1 -1)
                  (local.get $signedDistToTrianglePlane)
                )
                (local.get $normalDotVelocity)
              )
            )
            ;;var t1 = (1.0 - signedDistToTrianglePlane) / normalDotVelocity;
            (local.set $t1
              (f32x4.div
                (f32x4.sub
                  (v128.const f32x4 1 1 1 1)
                  (local.get $signedDistToTrianglePlane)
                )
                (local.get $normalDotVelocity)
              )
            )
            (f32x4.max
              (local.get $t0)
              (local.get $t1)
            )
            (f32x4.min
              (local.get $t0)
              (local.get $t1)
            )
            local.set $t0
            local.set $t1

            (local.set $return
              (v128.or
                (f32x4.gt
                    (local.get $t0)
                    (v128.const f32x4 1 1 1 1)
                )
                (f32x4.lt
                    (local.get $t1)
                    (v128.const f32x4 0 0 0 0)
                )
              )
            )
            (local.set $t0
              (f32x4.max
                (local.get $t0)
                (v128.const f32x4 0 0 0 0)
              )
            )
          )
        )

        local.get $embeddedInPlane
        ;; Check if movement is not at 90 degree angle with plane
        v128.any_true
        ;; Some is embedded in plane
        (if
          (then
            ;; Set t0 to zero when embedded in plane
            (local.set $t0
              (v128.bitselect
                (v128.const f32x4 0 0 0 0)
                (local.get $t0)
                (local.get $embeddedInPlane)
              )
            )
            (local.set $return
              (v128.bitselect
                (f32x4.ge
                  (f32x4.abs
                    (local.get $signedDistToTrianglePlane)
                  )
                  (v128.const f32x4 1 1 1 1)
                )
                (local.get $return)
                (local.get $embeddedInPlane)
              )
            )
          )
        )
        (i32x4.extract_lane 0
          (local.tee $return
            (v128.or
              (local.get $dotOverZero)
              (local.get $return)
            )
          )
        )
        i32.eqz
        if
          (call $testTriangle
            (i32x4.extract_lane 0
              (local.get $embeddedInPlane)
            )
            (local.get $planePosition)

            (v128.load
                (i32.load offset=16
                    (local.get $planePosition)
                )
            )

            (v128.load
                (i32.load offset=20
                    (local.get $planePosition)
                )
            )
          
            (v128.load 
                (i32.load offset=24
                    (local.get $planePosition)
                )
            )

            (local.get $meshID)
            (f32x4.extract_lane 0
              (local.get $t0)
            )
          )
        end
        (i32x4.extract_lane 1
          (local.get $return)
        )
        i32.eqz
        if
          (call $testTriangle
            (i32x4.extract_lane 1
              (local.get $embeddedInPlane)
            )
            (i32.add
              (local.get $planePosition)
              (i32.const 28)
            )

            (v128.load
              (i32.load offset=44
                (local.get $planePosition)
              )              
            )             

            (v128.load
                (i32.load offset=48
                  (local.get $planePosition)
                )
            )
          
            (v128.load 
                (i32.load offset=52
                    (local.get $planePosition)
                )
            )

            (local.get $meshID)
            (f32x4.extract_lane 1
            (local.get $t0)
            )
          )
        end
        (i32x4.extract_lane 2
          (local.get $return)
        )
        i32.eqz
        if
          (call $testTriangle
            (i32x4.extract_lane 2
              (local.get $embeddedInPlane)
            )
            (i32.add
              (local.get $planePosition)
              (i32.const 56)
            )
            (v128.load
                (i32.load offset=72
                  (local.get $planePosition)
                )
            )

            (v128.load
                (i32.load offset=76
                  (local.get $planePosition)
                )
            )
          
            (v128.load 
                (i32.load offset=80
                  (local.get $planePosition)
                )
            )
            (local.get $meshID)
            (f32x4.extract_lane 2
            (local.get $t0)
            )
          )
        end
        (i32x4.extract_lane 3
          (local.get $return)
        )
        i32.eqz
        if
          (call $testTriangle
            (i32x4.extract_lane 3
              (local.get $embeddedInPlane)
            )
            (i32.add
                (local.get $planePosition)
                (i32.const 84)
            )
            (v128.load
                (i32.load offset=100
                  (local.get $planePosition)
                )
            )

            (v128.load
                (i32.load offset=104
                  (local.get $planePosition)
                )
            )
          
            (v128.load 
                (i32.load offset=108
                    (local.get $planePosition)
                )
            )
            (local.get $meshID)
            (f32x4.extract_lane 3
            (local.get $t0)
            )
          )
        end
        )
      )

      
    
    (local.tee $planePosition
      (i32.add
          (local.get $planePosition)
          (i32.const 112)
      )
    )
    local.get $end
    i32.lt_u
    br_if $for-loop|0
    end
  )
  ;;(func $getLowestRoot (param $a f32) (param $b f32) (param $c f32) (param $maxR f32) (result f32)
  ;;  ;;var determinant = b * b - 4.0 * a * c;
  ;;  (local $determinant f32)
  ;;  (local $squared f32)
  ;;  (local $squaredA f32)
  ;;  (local $R1 f32)
  ;;  (local $R2 f32)
  ;;  (local.tee  $determinant
  ;;    (f32.sub
  ;;        (f32.mul
  ;;          (local.get $b)
  ;;          (local.get $b)
  ;;        )
  ;;        (f32.mul
  ;;            (f32.mul
  ;;              (local.get $a)
  ;;              (local.get $c)
  ;;            )
  ;;            (f32.const 4.0)
  ;;        )
  ;;    )
  ;;  )
  ;;  f32.const 0
  ;;  f32.lt
  ;;  if
  ;;    f32.const 0
  ;;    return
  ;;  end
  ;;  (local.tee $R1
  ;;    (f32.div
  ;;      (f32.sub
  ;;        (f32.neg 
  ;;          (local.get $b)
  ;;        )
  ;;        (local.tee $squared
  ;;          (f32.sqrt (local.get $determinant)
  ;;        ))
  ;;      )
  ;;      (local.tee $squaredA
  ;;        (f32.mul
  ;;          (f32.const 2.0)
  ;;          (local.get $a)
  ;;        )
  ;;      )
  ;;    )
  ;;  )
  ;;  (local.tee $R2
  ;;    (f32.div
  ;;      (f32.add
  ;;        (f32.neg 
  ;;          (local.get $b)
  ;;        )
  ;;        (local.get $squared)
  ;;      )
  ;;      (local.get $squaredA)
  ;;    )
  ;;  )
  ;; f32.gt
  ;;  if
  ;;      local.get $R2
  ;;      local.get $R1
  ;;      local.set $R2
  ;;      local.set $R1
  ;;  end
  ;;  local.get $R1
  ;;  f32.const 0.0
  ;;  f32.gt
  ;;  if
  ;;    local.get $R1
  ;;    local.get $maxR
  ;;    f32.lt
  ;;    if
  ;;      local.get $R1
  ;;      return
  ;;    end
  ;;  end
  ;;  local.get $R2
  ;;  f32.const 0.0
  ;;  f32.gt
  ;;  if
  ;;    local.get $R2
  ;;    local.get $maxR
  ;;    f32.lt
  ;;    if
  ;;      local.get $R2
  ;;      return
  ;;    end
  ;;  end
  ;;  f32.const 0.0
  ;;)
  ;;(export "getLowestRoot" (func $getLowestRoot))
  (export "testTriangles" (func $testTriangles))
  (export "_initialize" (func $_initialize))
  (export "construct" (func $construct))
  (export "test_checkForLowestRoot2" (func $test_checkForLowestRoot2))
)