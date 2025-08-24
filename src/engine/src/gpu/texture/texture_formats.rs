pub trait TextureFormat {
    fn to_number() -> u32
    where
        Self: Sized;
}
pub trait TextureFormatSRGB: TextureFormat {
    fn to_srgb() -> u32;
}

impl TextureFormatSRGB for RGBA8UNORM {
    fn to_srgb() -> u32 {
        RGBA8UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for BGRA8UNORM {
    fn to_srgb() -> u32 {
        BGRA8UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for BC1_RGBA_UNORM {
    fn to_srgb() -> u32 {
        BC1_RGBA_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for BC2_RGBA_UNORM {
    fn to_srgb() -> u32 {
        BC2_RGBA_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for BC3_RGBA_UNORM {
    fn to_srgb() -> u32 {
        BC3_RGBA_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for BC7_RGBA_UNORM {
    fn to_srgb() -> u32 {
        BC7_RGBA_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ETC2_RGB8UNORM {
    fn to_srgb() -> u32 {
        ETC2_RGB8UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ETC2_RGB8A1UNORM {
    fn to_srgb() -> u32 {
        ETC2_RGB8A1UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ASTC_4X4_UNORM {
    fn to_srgb() -> u32 {
        ASTC_4X4_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ASTC_5X4_UNORM {
    fn to_srgb() -> u32 {
        ASTC_5X4_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ASTC_5X5_UNORM {
    fn to_srgb() -> u32 {
        ASTC_5X5_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ASTC_6X5_UNORM {
    fn to_srgb() -> u32 {
        ASTC_6X5_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ASTC_6X6_UNORM {
    fn to_srgb() -> u32 {
        ASTC_6X6_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ASTC_8X5_UNORM {
    fn to_srgb() -> u32 {
        ASTC_8X5_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ASTC_8X6_UNORM {
    fn to_srgb() -> u32 {
        ASTC_8X6_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ASTC_8X8_UNORM {
    fn to_srgb() -> u32 {
        ASTC_8X8_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ASTC_10X5_UNORM {
    fn to_srgb() -> u32 {
        ASTC_10X5_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ASTC_10X6_UNORM {
    fn to_srgb() -> u32 {
        ASTC_10X6_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ASTC_10X8_UNORM {
    fn to_srgb() -> u32 {
        ASTC_10X8_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ASTC_10X10_UNORM {
    fn to_srgb() -> u32 {
        ASTC_10X10_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ASTC_12X10_UNORM {
    fn to_srgb() -> u32 {
        ASTC_12X10_UNORM_SRGB::to_number()
    }
}
impl TextureFormatSRGB for ASTC_12X12_UNORM {
    fn to_srgb() -> u32 {
        ASTC_12X12_UNORM_SRGB::to_number()
    }
}
pub struct TFORMAT<const U: u32>();
impl<const U: u32> TextureFormat for TFORMAT<U> {
    fn to_number() -> u32 {
        U
    }
}

pub type R8UNORM = TFORMAT<0>;
pub type R8SNORM = TFORMAT<1>;
pub type R8UINT = TFORMAT<2>;
pub type R8SINT = TFORMAT<3>;
pub type R16UNORM = TFORMAT<4>;
pub type R16SNORM = TFORMAT<5>;
pub type R16UINT = TFORMAT<6>;
pub type R16SINT = TFORMAT<7>;
pub type R16FLOAT = TFORMAT<8>;
pub type RG8UNORM = TFORMAT<9>;
pub type RG8SNORM = TFORMAT<10>;
pub type RG8UINT = TFORMAT<11>;
pub type RG8SINT = TFORMAT<12>;
pub type R32UINT = TFORMAT<13>;
pub type R32SINT = TFORMAT<14>;
pub type R32FLOAT = TFORMAT<15>;
pub type RG16UNORM = TFORMAT<16>;
pub type RG16SNORM = TFORMAT<17>;
pub type RG16UINT = TFORMAT<18>;
pub type RG16SINT = TFORMAT<19>;
pub type RG16FLOAT = TFORMAT<20>;
pub type RGBA8UNORM = TFORMAT<21>;
pub type RGBA8UNORM_SRGB = TFORMAT<22>;
pub type RGBA8SNORM = TFORMAT<23>;
pub type RGBA8UINT = TFORMAT<24>;
pub type RGBA8SINT = TFORMAT<25>;
pub type BGRA8UNORM = TFORMAT<26>;
pub type BGRA8UNORM_SRGB = TFORMAT<27>;
pub type RGB9E5UFLOAT = TFORMAT<28>;
pub type RGB10A2UINT = TFORMAT<29>;
pub type RGB10A2UNORM = TFORMAT<30>;
pub type RG11B10UFLOAT = TFORMAT<31>;
pub type RG32UINT = TFORMAT<32>;
pub type RG32SINT = TFORMAT<33>;
pub type RG32FLOAT = TFORMAT<34>;
pub type RGBA16UNORM = TFORMAT<35>;
pub type RGBA16SNORM = TFORMAT<36>;
pub type RGBA16UINT = TFORMAT<37>;
pub type RGBA16SINT = TFORMAT<38>;
pub type RGBA16FLOAT = TFORMAT<39>;
pub type RGBA32UINT = TFORMAT<40>;
pub type RGBA32SINT = TFORMAT<41>;
pub type RGBA32FLOAT = TFORMAT<42>;
pub type STENCIL8 = TFORMAT<42>;
pub type DEPTH16UNORM = TFORMAT<44>;
pub type DEPTH24PLUS = TFORMAT<45>;
pub type DEPTH24PLUS_STENCIL8 = TFORMAT<46>;
pub type DEPTH32FLOAT = TFORMAT<47>;
pub type DEPTH32FLOAT_STENCIL8 = TFORMAT<48>;
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
