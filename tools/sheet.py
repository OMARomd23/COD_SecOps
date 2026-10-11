"""Contact sheet of stills for quick review: python3 tools/sheet.py out.jpg a.jpg b.jpg …"""
import sys
from PIL import Image

out, files = sys.argv[1], sys.argv[2:]
w, h, cols = 960, 540, 2
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (w * cols, h * rows))
for i, f in enumerate(files):
    sheet.paste(Image.open(f).resize((w, h)), ((i % cols) * w, (i // cols) * h))
sheet.save(out, quality=88)
