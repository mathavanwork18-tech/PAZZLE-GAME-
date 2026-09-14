import os
from PIL import Image  # type: ignore
import numpy as np  # type: ignore

src_path = r'C:\Users\ADMIN\.gemini\antigravity-ide\brain\03328a82-09e4-4f12-9963-8f06ac1612ab\.user_uploaded\media_1789407896332.png'
out_dir = r'c:\Users\ADMIN\Downloads\pazzle game\public\avatars'
os.makedirs(out_dir, exist_ok=True)

im = Image.open(src_path)
arr = np.array(im)
alpha = arr[:, :, 3]
h, w = alpha.shape
visited = np.zeros((h, w), dtype=bool)

components = []
for y in range(0, h, 2):
    for x in range(0, w, 2):
        if alpha[y, x] > 30 and not visited[y, x]:
            queue = [(y, x)]
            visited[y, x] = True
            min_y, max_y = y, y
            min_x, max_x = x, x
            cnt = 0
            while queue:
                cy, cx = queue.pop()
                cnt += 1
                if cy < min_y: min_y = cy
                if cy > max_y: max_y = cy
                if cx < min_x: min_x = cx
                if cx > max_x: max_x = cx
                
                for dy, dx in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and alpha[ny, nx] > 30:
                        visited[ny, nx] = True
                        queue.append((ny, nx))
            
            if cnt > 500:
                components.append((min_y, max_y, min_x, max_x))

# Sort by row (approx 160px per row), then x coordinate
components.sort(key=lambda c: (c[0] // 150, c[2]))

animal_names = [
    "fox", "panda", "tiger", "lion",
    "koala", "penguin", "rabbit", "bear",
    "monkey", "frog", "raccoon", "elephant",
    "giraffe", "zebra", "cat", "dog"
]

print(f"Discovered {len(components)} avatars:")

for idx, (ymin, ymax, xmin, xmax) in enumerate(components):
    name = animal_names[idx]
    
    # Expand 2px to ensure anti-aliased edge is retained
    ymin_pad = max(0, ymin - 2)
    ymax_pad = min(h, ymax + 2)
    xmin_pad = max(0, xmin - 2)
    xmax_pad = min(w, xmax + 2)
    
    cropped = im.crop((xmin_pad, ymin_pad, xmax_pad, ymax_pad))
    cw, ch = cropped.size
    
    # Place squarely centered on a transparent 256x256 canvas
    target_size = 256
    scale = min((target_size - 16) / cw, (target_size - 16) / ch)
    new_w = int(cw * scale)
    new_h = int(ch * scale)
    
    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    canvas = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
    offset_x = (target_size - new_w) // 2
    offset_y = (target_size - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y), resized)
    
    dest = os.path.join(out_dir, f"{name}.png")
    canvas.save(dest, 'PNG', optimize=True)
    print(f"[{idx+1:2d}/16] Saved {name:<10} ({cw}x{ch} -> 256x256) to {dest}")

print("All 16 cartoon animal avatars saved cleanly!")
