pub trait TextureFormat {
    fn to_number() -> u32
    where
        Self: Sized;
}
pub trait TextureFormatSRGB<F: TextureFormat>: TextureFormat {
    fn to_srgb() -> u32 {
        F::to_number()
    }
}
impl TextureFormatSRGB<Rgba8unormSrgb> for RGBA8UNORM {}
impl TextureFormatSRGB<Bgra8unormSrgb> for BGRA8UNORM {}
impl TextureFormatSRGB<Bc1RgbaUnormSrgb> for Bc1RgbaUnorm {}
impl TextureFormatSRGB<Bc2RgbaUnormSrgb> for Bc2RgbaUnorm {}
impl TextureFormatSRGB<Bc3RgbaUnormSrgb> for Bc3RgbaUnorm {}
impl TextureFormatSRGB<Bc7RgbaUnormSrgb> for Bc7RgbaUnorm {}
impl TextureFormatSRGB<Etc2Rgb8unormSrgb> for Etc2Rgb8unorm {}
impl TextureFormatSRGB<Etc2Rgb8a1unormSrgb> for Etc2Rgb8a1unorm {}
impl TextureFormatSRGB<Astc4x4UnormSrgb> for Astc4x4Unorm {}
impl TextureFormatSRGB<Astc5x4UnormSrgb> for Astc5x4Unorm {}
impl TextureFormatSRGB<Astc5x5UnormSrgb> for Astc5x5Unorm {}
impl TextureFormatSRGB<Astc6x5UnormSrgb> for Astc6x5Unorm {}
impl TextureFormatSRGB<Astc6x6UnormSrgb> for Astc6x6Unorm {}
impl TextureFormatSRGB<Astc8x5UnormSrgb> for Astc8x5Unorm {}
impl TextureFormatSRGB<Astc8x6UnormSrgb> for Astc8x6Unorm {}
impl TextureFormatSRGB<Astc8x8UnormSrgb> for Astc8x8Unorm {}
impl TextureFormatSRGB<Astc10x5UnormSrgb> for Astc10x5Unorm {}
impl TextureFormatSRGB<Astc10x6UnormSrgb> for Astc10x6Unorm {}
impl TextureFormatSRGB<Astc10x8UnormSrgb> for Astc10x8Unorm {}
impl TextureFormatSRGB<Astc10x10UnormSrgb> for Astc10x10Unorm {}
impl TextureFormatSRGB<Astc12x10UnormSrgb> for Astc12x10Unorm {}
impl TextureFormatSRGB<Astc12x12UnormSrgb> for Astc12x12Unorm {}
pub struct TFORMAT<
    const U: u32,
    const RENDER_ATTACHMENT: bool = false,
    const DEPTH: bool = false,
    const MULTISAMPLING: bool = false,
>();
impl<const U: u32, const RENDER_ATTACHMENT: bool, const DEPTH: bool, const MULTISAMPLING: bool>
    TextureFormat for TFORMAT<U, RENDER_ATTACHMENT, DEPTH, MULTISAMPLING>
{
    fn to_number() -> u32 {
        U
    }
}

pub type R8UNORM = TFORMAT<0, true, false, true>;
pub type R8SNORM = TFORMAT<1, true, false, true>;
pub type R8UINT = TFORMAT<2, true, false, true>;
pub type R8SINT = TFORMAT<3, true, false, true>;
pub type R16UNORM = TFORMAT<4, true, false, true>;
pub type R16SNORM = TFORMAT<5, true, false, true>;
pub type R16UINT = TFORMAT<6, true, false, true>;
pub type R16SINT = TFORMAT<7, true, false, true>;
pub type R16FLOAT = TFORMAT<8, true, false, true>;
pub type RG8UNORM = TFORMAT<9, true, false, true>;
pub type RG8SNORM = TFORMAT<10, true, false, true>;
pub type RG8UINT = TFORMAT<11, true, false, true>;
pub type RG8SINT = TFORMAT<12, true, false, true>;
pub type R32UINT = TFORMAT<13, true>;
pub type R32SINT = TFORMAT<14, true>;
pub type R32FLOAT = TFORMAT<15, true, false, true>;
pub type RG16UNORM = TFORMAT<16, true, false, true>;
pub type RG16SNORM = TFORMAT<17, true, false, true>;
pub type RG16UINT = TFORMAT<18, true, false, true>;
pub type RG16SINT = TFORMAT<19, true, false, true>;
pub type RG16FLOAT = TFORMAT<20, true, false, true>;
pub type RGBA8UNORM = TFORMAT<21, true, false, true>;
pub type Rgba8unormSrgb = TFORMAT<22, true, true>;
pub type RGBA8SNORM = TFORMAT<23, true, false, true>;
pub type RGBA8UINT = TFORMAT<24, true, false, true>;
pub type RGBA8SINT = TFORMAT<25, true, false, true>;
pub type BGRA8UNORM = TFORMAT<26, true, false, true>;
pub type Bgra8unormSrgb = TFORMAT<27, true, false, true>;
pub type RGB9E5UFLOAT = TFORMAT<28>;
pub type RGB10A2UINT = TFORMAT<29, true, false, true>;
pub type RGB10A2UNORM = TFORMAT<30, true, false, true>;
pub type RG11B10UFLOAT = TFORMAT<31, true, false, true>;
pub type RG32UINT = TFORMAT<32, true>;
pub type RG32SINT = TFORMAT<33, true>;
pub type RG32FLOAT = TFORMAT<34, true>;
pub type RGBA16UNORM = TFORMAT<35, true, false, true>;
pub type RGBA16SNORM = TFORMAT<36, true, false, true>;
pub type RGBA16UINT = TFORMAT<37, true, false, true>;
pub type RGBA16SINT = TFORMAT<38, true, false, true>;
pub type RGBA16FLOAT = TFORMAT<39, true, false, true>;
pub type RGBA32UINT = TFORMAT<40, true>;
pub type RGBA32SINT = TFORMAT<41, true>;
pub type RGBA32FLOAT = TFORMAT<42, true>;
pub type STENCIL8 = TFORMAT<42>;
pub type DEPTH16UNORM = TFORMAT<44, true, true>;
pub type DEPTH24PLUS = TFORMAT<45, true, true>;
pub type Depth24plusStencil8 = TFORMAT<46, true, true>;
pub type DEPTH32FLOAT = TFORMAT<47, true, true>;
pub type Depth32floatStencil8 = TFORMAT<48, true, true>;
pub type Bc1RgbaUnorm = TFORMAT<49>;
pub type Bc1RgbaUnormSrgb = TFORMAT<50>;
pub type Bc2RgbaUnorm = TFORMAT<51>;
pub type Bc2RgbaUnormSrgb = TFORMAT<52>;
pub type Bc3RgbaUnorm = TFORMAT<53>;
pub type Bc3RgbaUnormSrgb = TFORMAT<54>;
pub type Bc4RUnorm = TFORMAT<55>;
pub type Bc4RSnorm = TFORMAT<56>;
pub type Bc5RgUnorm = TFORMAT<57>;
pub type Bc5RgSnorm = TFORMAT<58>;
pub type Bc6hRgbUfloat = TFORMAT<59>;
pub type Bc6hRgbFloat = TFORMAT<60>;
pub type Bc7RgbaUnorm = TFORMAT<61>;
pub type Bc7RgbaUnormSrgb = TFORMAT<62>;
pub type Etc2Rgb8unorm = TFORMAT<63>;
pub type Etc2Rgb8unormSrgb = TFORMAT<64>;
pub type Etc2Rgb8a1unorm = TFORMAT<65>;
pub type Etc2Rgb8a1unormSrgb = TFORMAT<66>;
pub type Etc2Rgba8unorm = TFORMAT<67>;
pub type Etc2Rgba8unormSrgb = TFORMAT<68>;
pub type EacR11unorm = TFORMAT<69>;
pub type EacR11snorm = TFORMAT<70>;
pub type EacRg11unorm = TFORMAT<71>;
pub type EacRg11snorm = TFORMAT<72>;
pub type Astc4x4Unorm = TFORMAT<73>;
pub type Astc4x4UnormSrgb = TFORMAT<74>;
pub type Astc5x4Unorm = TFORMAT<75>;
pub type Astc5x4UnormSrgb = TFORMAT<76>;
pub type Astc5x5Unorm = TFORMAT<77>;
pub type Astc5x5UnormSrgb = TFORMAT<78>;
pub type Astc6x5Unorm = TFORMAT<79>;
pub type Astc6x5UnormSrgb = TFORMAT<80>;
pub type Astc6x6Unorm = TFORMAT<81>;
pub type Astc6x6UnormSrgb = TFORMAT<82>;
pub type Astc8x5Unorm = TFORMAT<83>;
pub type Astc8x5UnormSrgb = TFORMAT<84>;
pub type Astc8x6Unorm = TFORMAT<85>;
pub type Astc8x6UnormSrgb = TFORMAT<86>;
pub type Astc8x8Unorm = TFORMAT<87>;
pub type Astc8x8UnormSrgb = TFORMAT<88>;
pub type Astc10x5Unorm = TFORMAT<89>;
pub type Astc10x5UnormSrgb = TFORMAT<90>;
pub type Astc10x6Unorm = TFORMAT<91>;
pub type Astc10x6UnormSrgb = TFORMAT<92>;
pub type Astc10x8Unorm = TFORMAT<93>;
pub type Astc10x8UnormSrgb = TFORMAT<94>;
pub type Astc10x10Unorm = TFORMAT<95>;
pub type Astc10x10UnormSrgb = TFORMAT<96>;
pub type Astc12x10Unorm = TFORMAT<97>;
pub type Astc12x10UnormSrgb = TFORMAT<98>;
pub type Astc12x12Unorm = TFORMAT<99>;
pub type Astc12x12UnormSrgb = TFORMAT<100>;
