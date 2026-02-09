use crate::{buffer::buffer::GPUBuffer, command_encoder::GPUCommandEncoder, device::GPUDevice};

impl<
        const MAP_WRITE: bool,
        const COPY_DST: bool,
        const INDEX: bool,
        const VERTEX: bool,
        const UNIFORM: bool,
        const STORAGE: bool,
        const INDIRECT: bool,
        const QUERY_RESOLVE: bool,
    >
    From<(
        &GPUDevice,
        &GPUBuffer<
            false,
            MAP_WRITE,
            true,
            COPY_DST,
            INDEX,
            VERTEX,
            UNIFORM,
            STORAGE,
            INDIRECT,
            QUERY_RESOLVE,
        >,
    )> for GPUBuffer<true, false, false, true>
{
    fn from(
        value: (
            &GPUDevice,
            &GPUBuffer<
                false,
                MAP_WRITE,
                true,
                COPY_DST,
                INDEX,
                VERTEX,
                UNIFORM,
                STORAGE,
                INDIRECT,
                QUERY_RESOLVE,
            >,
        ),
    ) -> Self {
        let buffer = GPUBuffer::new(
            &value.0.externref,
            value.1.size,
            String::from("read_buffer"),
        );
        let mut command_encoder =
            GPUCommandEncoder::new(&value.0.externref, String::from("read_buffer_encoder"));
        command_encoder.copy_buffer_to_buffer(value.1, &buffer, 0, 0, value.1.size);
        value
            .0
            .queue
            .submit([command_encoder.finish(String::from("read_buffer_encoder_finish"))]);
        return buffer;
    }
}
