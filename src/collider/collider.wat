(module
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
)