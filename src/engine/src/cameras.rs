use crate::camera::Camera;

pub struct Cameras {
    pub cameras: Vec<Camera>,
}
pub fn search_camera_by_id_mut(
    iterator: std::slice::IterMut<'_, Camera>,
    camera_id: u32,
) -> Option<&'_ mut Camera> {
    for camera in iterator {
        if camera.id == camera_id {
            return Some(camera);
        }
        let from_children = search_camera_by_id_mut(camera.children.iter_mut(), camera_id);
        if from_children.is_some() {
            return from_children;
        }
    }
    return None;
}
impl Cameras {
    pub fn iter(&self) -> CamerasIterator {
        CamerasIterator {
            camerasiters: vec![self.cameras.iter()],
        }
    }
}
pub struct CamerasIterator<'a> {
    camerasiters: Vec<std::slice::Iter<'a, Camera>>,
}

impl<'a> Iterator for CamerasIterator<'a> {
    type Item = &'a Camera;
    fn next(&mut self) -> Option<Self::Item> {
        let cameraiterator = self.camerasiters.last_mut()?;
        let next = cameraiterator.next();
        if let Some(camera) = next {
            if camera.children.len() > 0 {
                self.camerasiters.push(camera.children.iter());
            }
        } else {
            let _ = self.camerasiters.pop();
            return self.next();
        }
        return next;
    }
}
#[cfg(test)]
#[test]
fn test_cameras_iterator() {
    use externref::{ExternRef, Resource};

    unsafe {
        let mut cameras = Cameras {
            cameras: vec![
                Camera::new(
                    &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
                    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
                    String::from("camera0"),
                ),
                Camera::new(
                    &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
                    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
                    String::from("camera1"),
                ),
                Camera::new(
                    &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
                    Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
                    String::from("camera2"),
                ),
            ],
        };
        let mut child_1 = Camera::new(
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            String::from("camera1.0"),
        );
        let child1_1 = Camera::new(
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            String::from("camera1.0.0"),
        );
        let child1_2 = Camera::new(
            &Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            Resource::new_non_null(std::mem::transmute::<usize, ExternRef>(0)),
            String::from("camera1.0.1"),
        );
        child_1.children.push(child1_1);
        child_1.children.push(child1_2);
        cameras.cameras[1].children.push(child_1);
        let mut iterator = cameras.iter();
        assert_eq!(&iterator.next().unwrap().label, "camera0");
        assert_eq!(&iterator.next().unwrap().label, "camera1");
        assert_eq!(&iterator.next().unwrap().label, "camera1.0");
        assert_eq!(&iterator.next().unwrap().label, "camera1.0.0");
        assert_eq!(&iterator.next().unwrap().label, "camera1.0.1");
        assert_eq!(&iterator.next().unwrap().label, "camera2");
        assert_eq!(&iterator.next().is_none(), &true);
    }
}
