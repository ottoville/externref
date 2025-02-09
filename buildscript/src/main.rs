fn main() {
    use externref::processor::Processor;
    let input = if cfg!(debug_assertions) {
        "../src/engine/target/wasm32-unknown-unknown/debug/engine.wasm"
    } else {
        "../src/engine/target/wasm32-unknown-unknown/release/engine.wasm"
    };
    let module: Result<Vec<u8>, std::io::Error> = std::fs::read(input);
    match module {
        Ok(v) => {
            let processed = Processor::default()
                .set_drop_fn("env", "drop_ref")
                .process_bytes(&v);
            match processed {
                Ok(v) => {
                    let writed = std::fs::write("../wwwroot/engine.wasm", v);
                    match writed {
                        Ok(_) => {
                            if !cfg!(debug_assertions) {
                                println!("running wasm-opt");
                                optimize("../wwwroot/engine.wasm");
                            }
                        }
                        Err(e) => panic!("Error when writing output: {e:?}"),
                    }
                }
                Err(e) => panic!("error processing externref: {e:?}"),
            }
        }
        Err(e) => panic!("error loading wasm module: {e:?}"),
    }
}
fn optimize(path: &str) {
    use wasm_opt::OptimizationOptions;
    if let Err(e) = OptimizationOptions::new_opt_level_4()
        .enable_feature(wasm_opt::Feature::ReferenceTypes)
        .enable_feature(wasm_opt::Feature::Simd)
        .fast_math(true)
        .run(path, path)
    {
        println!("Error when optimizing wasm: {e:?}")
    }
}
