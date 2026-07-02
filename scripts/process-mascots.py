from PIL import Image
import numpy as np
import os

def process_mascots():
    img_path = r'c:\Users\kingg\OneDrive\Documents\Automation agent application\web-app\public\mascots\water-drop-mascots.jpg'
    output_dir = r'c:\Users\kingg\OneDrive\Documents\Automation agent application\web-app\public\mascots'
    
    if not os.path.exists(img_path):
        print(f"Error: {img_path} not found.")
        return
        
    img = Image.open(img_path)
    w, h = img.size
    bg_color = np.array([2, 21, 63])
    tolerance = 25  # increased slightly to clean up edges

    crop_w = w // 4
    for i in range(4):
        left = i * crop_w
        right = (i + 1) * crop_w
        cropped = img.crop((left, 0, right, h))
        
        # Convert to RGBA numpy array
        rgba = cropped.convert('RGBA')
        data = np.array(rgba)
        
        # Calculate color difference for RGB channels
        diff = np.abs(data[:, :, :3] - bg_color)
        # Pixel is background if all channels are within tolerance
        bg_mask = np.all(diff < tolerance, axis=2)
        
        # Set alpha to 0 for background pixels
        data[bg_mask, 3] = 0
        
        # Clean up stray pixels or smooth edges
        # We can also do a soft transition by setting partial alpha for border pixels,
        # but let's start with a clean cut-off first.
        
        # Convert back to PIL Image
        out_img = Image.fromarray(data)
        
        # Resize to 512x512 with high quality Lanczos filter
        resized = out_img.resize((512, 512), Image.Resampling.LANCZOS)
        
        out_path = os.path.join(output_dir, f'mascot_{i+1}.png')
        resized.save(out_path, 'PNG')
        print(f"Saved mascot {i+1} to {out_path}")

if __name__ == '__main__':
    process_mascots()
