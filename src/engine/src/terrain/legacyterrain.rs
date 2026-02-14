use std::{num::NonZeroUsize, rc::Rc};

use allocators::explicit_generational_freelist::ExplicitGenerationalFreeListIndex;
use externref::externref;
use logger::Logger;
use web::console::console::Console;

use crate::{
    engine::STORAGE,
    mesh::{Mesh, ENGINE},
};
#[no_mangle]
#[externref]
pub unsafe extern "C" fn serialize_terrain(
    mesh_id: *const ExplicitGenerationalFreeListIndex<fn() -> Mesh>,
) {
    serialize_terrain2(*mesh_id);
}
pub fn serialize_terrain2(mesh_id: ExplicitGenerationalFreeListIndex<fn() -> Mesh>) {
    STORAGE.with(move |storage| {
        storage.get_directory(move |directory_res| match directory_res {
            Ok(directory) => {
                directory.get_file_handle::<true>(
                    &String::from("terrainvertices"),
                    move |file_res| match file_res {
                        Ok(file) => {
                            file.create_writable_exclusive::<false>(
                                move |writable| match writable {
                                    Ok(stream) => {
                                        let mesh = &mut ENGINE.meshes.lock().unwrap()[&mesh_id];
                                        let geometry = mesh.geometry.as_mut().unwrap();
                                        let vertices = geometry.vertices.as_ref().unwrap();
                                        let stream_rc = Rc::new(stream);
                                        (*stream_rc.clone()).write_raw(
                                            vertices.as_ptr() as usize,
                                            NonZeroUsize::new(
                                                vertices.length() * vertices.stride(),
                                            )
                                            .unwrap(),
                                            0,
                                            |error_opt| {
                                                if let Some(error) = error_opt {
                                                    Console::error(error);
                                                    return;
                                                }
                                                match Rc::try_unwrap(stream_rc) {
                                                    Ok(stream) => {
                                                        stream.close();
                                                    }
                                                    Err(_) => {
                                                        todo!()
                                                    }
                                                }
                                            },
                                        );
                                    }
                                    Err(_) => todo!(),
                                },
                            );
                        }
                        Err(_) => todo!(),
                    },
                );
                directory.get_file_handle::<true>(
                    &String::from("terrainindices"),
                    move |file_res| match file_res {
                        Ok(file) => {
                            file.create_writable_exclusive::<false>(
                                move |writable| match writable {
                                    Ok(stream) => {
                                        let mesh = &mut ENGINE.meshes.lock().unwrap()[&mesh_id];
                                        let geometry = mesh.geometry.as_mut().unwrap();
                                        let indices = &geometry.indices.as_ref().unwrap().indices;
                                        let stream_rc = Rc::new(stream);
                                        (*stream_rc.clone()).write_raw(
                                            indices.as_ptr() as usize,
                                            NonZeroUsize::new(indices.len()).unwrap(),
                                            0,
                                            |error_opt| {
                                                if let Some(error) = error_opt {
                                                    Console::error(error);
                                                    return;
                                                }
                                                match Rc::try_unwrap(stream_rc) {
                                                    Ok(stream) => {
                                                        stream.close();
                                                    }
                                                    Err(_) => todo!(),
                                                }
                                            },
                                        );
                                    }
                                    Err(_) => todo!(),
                                },
                            );
                        }
                        Err(_) => todo!(),
                    },
                );
            }
            Err(_) => todo!(),
        })
    });
}
