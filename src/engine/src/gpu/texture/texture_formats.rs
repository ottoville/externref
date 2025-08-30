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

impl TextureFormatSRGB<RGBA8UNORM_SRGB> for RGBA8UNORM {}
impl TextureFormatSRGB<BGRA8UNORM_SRGB> for BGRA8UNORM {}
impl TextureFormatSRGB<BC1_RGBA_UNORM_SRGB> for BC1_RGBA_UNORM {}
impl TextureFormatSRGB<BC2_RGBA_UNORM_SRGB> for BC2_RGBA_UNORM {}
impl TextureFormatSRGB<BC3_RGBA_UNORM_SRGB> for BC3_RGBA_UNORM {}
impl TextureFormatSRGB<BC7_RGBA_UNORM_SRGB> for BC7_RGBA_UNORM {}
impl TextureFormatSRGB<ETC2_RGB8UNORM_SRGB> for ETC2_RGB8UNORM {}
impl TextureFormatSRGB<ETC2_RGB8A1UNORM_SRGB> for ETC2_RGB8A1UNORM {}
impl TextureFormatSRGB<ASTC_4X4_UNORM_SRGB> for ASTC_4X4_UNORM {}
impl TextureFormatSRGB<ASTC_5X4_UNORM_SRGB> for ASTC_5X4_UNORM {}
impl TextureFormatSRGB<ASTC_5X5_UNORM_SRGB> for ASTC_5X5_UNORM {}
impl TextureFormatSRGB<ASTC_6X5_UNORM_SRGB> for ASTC_6X5_UNORM {}
impl TextureFormatSRGB<ASTC_6X6_UNORM_SRGB> for ASTC_6X6_UNORM {}
impl TextureFormatSRGB<ASTC_8X5_UNORM_SRGB> for ASTC_8X5_UNORM {}
impl TextureFormatSRGB<ASTC_8X6_UNORM_SRGB> for ASTC_8X6_UNORM {}
impl TextureFormatSRGB<ASTC_8X8_UNORM_SRGB> for ASTC_8X8_UNORM {}
impl TextureFormatSRGB<ASTC_10X5_UNORM_SRGB> for ASTC_10X5_UNORM {}
impl TextureFormatSRGB<ASTC_10X6_UNORM_SRGB> for ASTC_10X6_UNORM {}
impl TextureFormatSRGB<ASTC_10X8_UNORM_SRGB> for ASTC_10X8_UNORM {}
impl TextureFormatSRGB<ASTC_10X10_UNORM_SRGB> for ASTC_10X10_UNORM {}
impl TextureFormatSRGB<ASTC_12X10_UNORM_SRGB> for ASTC_12X10_UNORM {}
impl TextureFormatSRGB<ASTC_12X12_UNORM_SRGB> for ASTC_12X12_UNORM {}
pub struct TFORMAT<const U: u32, const RENDER_ATTACHMENT: bool = false, const DEPTH: bool = false>
();
impl<const U: u32, const RENDER_ATTACHMENT: bool, const DEPTH: bool> TextureFormat
    for TFORMAT<U, RENDER_ATTACHMENT, DEPTH>
{
    fn to_number() -> u32 {
        U
    }
}

pub type R8UNORM = TFORMAT<0, true>;
pub type R8SNORM = TFORMAT<1, true>;
pub type R8UINT = TFORMAT<2, true>;
pub type R8SINT = TFORMAT<3, true>;
pub type R16UNORM = TFORMAT<4, true>;
pub type R16SNORM = TFORMAT<5, true>;
pub type R16UINT = TFORMAT<6, true>;
pub type R16SINT = TFORMAT<7, true>;
pub type R16FLOAT = TFORMAT<8, true>;
pub type RG8UNORM = TFORMAT<9, true>;
pub type RG8SNORM = TFORMAT<10, true>;
pub type RG8UINT = TFORMAT<11, true>;
pub type RG8SINT = TFORMAT<12, true>;
pub type R32UINT = TFORMAT<13, true>;
pub type R32SINT = TFORMAT<14, true>;
pub type R32FLOAT = TFORMAT<15, true>;
pub type RG16UNORM = TFORMAT<16, true>;
pub type RG16SNORM = TFORMAT<17, true>;
pub type RG16UINT = TFORMAT<18, true>;
pub type RG16SINT = TFORMAT<19, true>;
pub type RG16FLOAT = TFORMAT<20, true>;
pub type RGBA8UNORM = TFORMAT<21, true>;
pub type RGBA8UNORM_SRGB = TFORMAT<22, true>;
pub type RGBA8SNORM = TFORMAT<23, true>;
pub type RGBA8UINT = TFORMAT<24, true>;
pub type RGBA8SINT = TFORMAT<25, true>;
pub type BGRA8UNORM = TFORMAT<26, true>;
pub type BGRA8UNORM_SRGB = TFORMAT<27, true>;
pub type RGB9E5UFLOAT = TFORMAT<28>;
pub type RGB10A2UINT = TFORMAT<29, true>;
pub type RGB10A2UNORM = TFORMAT<30, true>;
pub type RG11B10UFLOAT = TFORMAT<31, true>;
pub type RG32UINT = TFORMAT<32, true>;
pub type RG32SINT = TFORMAT<33, true>;
pub type RG32FLOAT = TFORMAT<34, true>;
pub type RGBA16UNORM = TFORMAT<35, true>;
pub type RGBA16SNORM = TFORMAT<36, true>;
pub type RGBA16UINT = TFORMAT<37, true>;
pub type RGBA16SINT = TFORMAT<38, true>;
pub type RGBA16FLOAT = TFORMAT<39, true>;
pub type RGBA32UINT = TFORMAT<40, true>;
pub type RGBA32SINT = TFORMAT<41, true>;
pub type RGBA32FLOAT = TFORMAT<42, true>;
pub type STENCIL8 = TFORMAT<42>;
pub type DEPTH16UNORM = TFORMAT<44, true, true>;
pub type DEPTH24PLUS = TFORMAT<45, true, true>;
pub type DEPTH24PLUS_STENCIL8 = TFORMAT<46, true, true>;
pub type DEPTH32FLOAT = TFORMAT<47, true, true>;
pub type DEPTH32FLOAT_STENCIL8 = TFORMAT<48, true, true>;
pub type BC1_RGBA_UNORM = TFORMAT<49>;
pub type BC1_RGBA_UNORM_SRGB = TFORMAT<50>;
pub type BC2_RGBA_UNORM = TFORMAT<51>;
pub type BC2_RGBA_UNORM_SRGB = TFORMAT<52>;
pub type BC3_RGBA_UNORM = TFORMAT<53>;
pub type BC3_RGBA_UNORM_SRGB = TFORMAT<54>;
pub type BC4_R_UNORM = TFORMAT<55>;
pub type BC4_R_SNORM = TFORMAT<56>;
pub type BC5_RG_UNORM = TFORMAT<57>;
pub type BC5_RG_SNORM = TFORMAT<58>;
pub type BC6H_RGB_UFLOAT = TFORMAT<59>;
pub type BC6H_RGB_FLOAT = TFORMAT<60>;
pub type BC7_RGBA_UNORM = TFORMAT<61>;
pub type BC7_RGBA_UNORM_SRGB = TFORMAT<62>;
pub type ETC2_RGB8UNORM = TFORMAT<63>;
pub type ETC2_RGB8UNORM_SRGB = TFORMAT<64>;
pub type ETC2_RGB8A1UNORM = TFORMAT<65>;
pub type ETC2_RGB8A1UNORM_SRGB = TFORMAT<66>;
pub type ETC2_RGBA8UNORM = TFORMAT<67>;
pub type ETC2_RGBA8UNORM_SRGB = TFORMAT<68>;
pub type EAC_R11UNORM = TFORMAT<69>;
pub type EAC_R11SNORM = TFORMAT<70>;
pub type EAC_RG11UNORM = TFORMAT<71>;
pub type EAC_RG11SNORM = TFORMAT<72>;
pub type ASTC_4X4_UNORM = TFORMAT<73>;
pub type ASTC_4X4_UNORM_SRGB = TFORMAT<74>;
pub type ASTC_5X4_UNORM = TFORMAT<75>;
pub type ASTC_5X4_UNORM_SRGB = TFORMAT<76>;
pub type ASTC_5X5_UNORM = TFORMAT<77>;
pub type ASTC_5X5_UNORM_SRGB = TFORMAT<78>;
pub type ASTC_6X5_UNORM = TFORMAT<79>;
pub type ASTC_6X5_UNORM_SRGB = TFORMAT<80>;
pub type ASTC_6X6_UNORM = TFORMAT<81>;
pub type ASTC_6X6_UNORM_SRGB = TFORMAT<82>;
pub type ASTC_8X5_UNORM = TFORMAT<83>;
pub type ASTC_8X5_UNORM_SRGB = TFORMAT<84>;
pub type ASTC_8X6_UNORM = TFORMAT<85>;
pub type ASTC_8X6_UNORM_SRGB = TFORMAT<86>;
pub type ASTC_8X8_UNORM = TFORMAT<87>;
pub type ASTC_8X8_UNORM_SRGB = TFORMAT<88>;
pub type ASTC_10X5_UNORM = TFORMAT<89>;
pub type ASTC_10X5_UNORM_SRGB = TFORMAT<90>;
pub type ASTC_10X6_UNORM = TFORMAT<91>;
pub type ASTC_10X6_UNORM_SRGB = TFORMAT<92>;
pub type ASTC_10X8_UNORM = TFORMAT<93>;
pub type ASTC_10X8_UNORM_SRGB = TFORMAT<94>;
pub type ASTC_10X10_UNORM = TFORMAT<95>;
pub type ASTC_10X10_UNORM_SRGB = TFORMAT<96>;
pub type ASTC_12X10_UNORM = TFORMAT<97>;
pub type ASTC_12X10_UNORM_SRGB = TFORMAT<98>;
pub type ASTC_12X12_UNORM = TFORMAT<99>;
pub type ASTC_12X12_UNORM_SRGB = TFORMAT<100>;
