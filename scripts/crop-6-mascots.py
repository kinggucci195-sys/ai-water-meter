from PIL import Image
import numpy as np
import os

def crop_6_mascots():
    img_path = r'c:\Users\kingg\OneDrive\Documents\Automation agent application\web-app\public\mascots\water-drop-mascots.jpg'
    output_dir = r'c:\Users\kingg\OneDrive\Documents\Automation agent application\web-app\public\mascots'
    
    if not os.path.exists(img_path):
        print(f"Error: {img_path} not found.")
        return
        
    img = Image.open(img_path)
    w, h = img.size
    bg_color = np.array([2, 21, 63])
    tolerance = 25

    # Convert image to numpy array
    data = np.array(img.convert('RGBA'))
    
    # Create mask of foreground pixels (where difference from bg_color is greater than tolerance)
    diff = np.abs(data[:, :, :3] - bg_color)
    fg_mask = np.any(diff >= tolerance, axis=2)
    
    # Set background pixels to transparent in our array
    data[~fg_mask] = [0, 0, 0, 0]
    
    # Scan columns to find character boundaries
    col_has_pixels = fg_mask.any(axis=0)
    
    # Identify spans of foreground pixels
    spans = []
    in_span = False
    start = 0
    
    for x in range(w):
        if col_has_pixels[x] and not in_span:
            start = x
            in_span = True
        elif not col_has_pixels[x] and in_span:
            # We want to ignore very thin noise columns (e.g. less than 10 pixels wide)
            if x - start > 10:
                spans.append((start, x))
            in_span = False
            
    if in_span:
        spans.append((start, w))
        
    print(f"Detected {len(spans)} character spans: {spans}")
    
    # Process each character span
    for i, (x_start, x_end) in enumerate(spans):
        # Find the vertical bounding box for this character slice
        slice_mask = fg_mask[:, x_start:x_end]
        row_has_pixels = slice_mask.any(axis=1)
        
        y_indices = np.where(row_has_pixels)[0]
        if len(y_indices) == 0:
            continue
            
        y_start = y_indices[0]
        y_end = y_indices[-1] + 1
        
        # Crop the character from the transparent data
        char_data = data[y_start:y_end, x_start:x_end]
        char_img = Image.fromarray(char_data)
        
        # Create a square transparent canvas larger than the character
        char_w, char_h = char_img.size
        square_size = max(char_w, char_h) + 120 # Add padding so it's not close to edges
        
        square_canvas = Image.new('RGBA', (square_size, square_size), (0, 0, 0, 0))
        
        # Paste the character in the center of the square canvas
        paste_x = (square_size - char_w) // 2
        paste_y = (square_size - char_h) // 2
        square_canvas.paste(char_img, (paste_x, paste_y), char_img)
        
        # Resize to 512x512
        resized = square_canvas.resize((512, 512), Image.Resampling.LANCZOS)
        
        out_path = os.path.join(output_dir, f'mascot_{i+1}.png')
        resized.save(out_path, 'PNG')
        print(f"Saved mascot {i+1} to {out_path}")
        
if __name__ == '__main__':
    crop_6_mascots()
