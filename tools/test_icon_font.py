"""Raster regressions for native silhouette traits; requires Pillow/fonttools."""
from pathlib import Path
import io
import unittest
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT=Path(__file__).resolve().parents[1]


class IconSilhouettes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        font=TTFont(ROOT/'packages/winui-wasm/src/assets/winui-icons.woff');font.flavor=None
        data=io.BytesIO();font.save(data)
        cls.font=ImageFont.truetype(io.BytesIO(data.getvalue()),96)

    def raster(self,code):
        image=Image.new('L',(140,140));ImageDraw.Draw(image).text((16,112),chr(int(code,16)),font=self.font,fill=255,anchor='ls')
        return image.crop(image.getbbox())

    def test_status_and_radio_dots_are_solid(self):
        for code in ['EA3B','E915','F136']:
            image=self.raster(code);w,h=image.size
            self.assertGreater(image.getpixel((w//2,h//2)),200,code)
            self.assertGreater(sum(image.tobytes())/(255*w*h),0.72,code)

    def test_icon_line_box_is_one_em_on_all_platforms(self):
        font=TTFont(ROOT/'packages/winui-wasm/src/assets/winui-icons.woff')
        em=font['head'].unitsPerEm
        self.assertEqual((font['hhea'].ascent,font['hhea'].descent,font['hhea'].lineGap),(em,0,0))
        self.assertEqual((font['OS/2'].sTypoAscender,font['OS/2'].sTypoDescender,font['OS/2'].sTypoLineGap),(em,0,0))
        self.assertEqual((font['OS/2'].usWinAscent,font['OS/2'].usWinDescent),(em,0))

    def test_caret_triangles_have_filled_interiors(self):
        for code in ['EDD9','EDDA','EDDB','EDDC','EB0F','EB11','E936']:
            image=self.raster(code);w,h=image.size
            self.assertGreater(sum(image.tobytes())/(255*w*h),0.40,code)

    def test_stock_arrows_keep_native_directions(self):
        down=self.raster('EB0F');up=self.raster('EB11')
        for image,direction in [(down,1),(up,-1)]:
            w,h=image.size
            upper=sum(image.crop((0,0,w,h//2)).tobytes())
            lower=sum(image.crop((0,h//2,w,h)).tobytes())
            self.assertGreater((upper-lower)*direction,0)


if __name__=='__main__':unittest.main()
