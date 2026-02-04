use externref::Resource;

pub struct FileExtern();
pub struct File {
    externref: Resource<FileExtern>,
}
impl File {
    pub fn new(externref: Resource<FileExtern>) -> Self {
        File { externref }
    }
}
