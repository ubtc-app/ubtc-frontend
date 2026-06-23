"""
Creates a light-mode version of the logo PNGs where the white Bitcoin B
is replaced with a dark color while the teal orbital ring stays untouched.

Strategy: pixels that are near-white (high brightness, low saturation)
get darkened to near-black. Pixels that have colour (teal, etc.) are left alone.
"""
from PIL import Image
import colorsys, os

def process(src_path, dst_path):
    img = Image.open(src_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 10:           # fully transparent — leave alone
                continue

            # normalise to 0-1
            rf, gf, bf = r/255, g/255, b/255
            hh, s, v = colorsys.rgb_to_hsv(rf, gf, bf)

            # "white" = low saturation, high value
            # teal ring has high saturation, so it won't be touched
            if s < 0.18 and v > 0.70:
                # Make it very dark (near-black) — preserve a bit of the
                # existing hue so it doesn't look flat
                new_v = 0.12
                new_s = s * 0.5
                nr, ng, nb = colorsys.hsv_to_rgb(hh, new_s, new_v)
                pixels[x, y] = (int(nr*255), int(ng*255), int(nb*255), a)

    img.save(dst_path, "PNG")
    print(f"Saved: {dst_path}")

pub = r"C:\ubtc\frontend\public"
process(os.path.join(pub, "wlb.png"),                os.path.join(pub, "wlb-light.png"))
process(os.path.join(pub, "worldlocalbanklogo.png"), os.path.join(pub, "worldlocalbanklogo-light.png"))
print("Done.")
