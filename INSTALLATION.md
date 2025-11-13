# Quick Installation Guide

## Step-by-Step Setup

### 1. Generate Icons

Before installing the extension, you need to create the icon files:

1. Open `generate-icons.html` in your Chrome browser
2. Three download links will appear automatically
3. Click each link to download:
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`
4. Move all three PNG files into the `icons/` folder

### 2. Load Extension in Chrome

1. Open Chrome and navigate to: `chrome://extensions/`
2. Enable **"Developer mode"** using the toggle in the top-right corner
3. Click **"Load unpacked"**
4. Navigate to and select the `OmairsFormFiller` folder
5. Click **"Select Folder"**

### 3. Verify Installation

- The extension should now appear in your extensions list
- You should see "Omair's Form Filler" with version 1.0.0
- Click the puzzle piece icon in your Chrome toolbar
- Pin the extension for easy access

### 4. Test It Out

1. Visit any website with a form (e.g., Google Forms)
2. Click the extension icon
3. Click "Start Recording"
4. Fill out the form
5. Click "Stop Recording"
6. Save your profile
7. Refresh the page
8. Click "Fill Form" to see the magic!

## Troubleshooting Installation

### Icons Missing Error
**Problem**: Extension shows "Could not load icon"
**Solution**: Make sure you generated and placed all three icon files in the `icons/` folder

### Extension Not Loading
**Problem**: Chrome won't load the extension
**Solution**:
- Check that `manifest.json` exists in the folder
- Ensure all files (manifest.json, popup.html, popup.css, popup.js, content.js, background.js) are present
- Try reloading Chrome

### Developer Mode Not Available
**Problem**: Can't enable Developer mode
**Solution**:
- This may be restricted by your organization
- You'll need admin rights or permission to install extensions

## What's Next?

Check out [README.md](README.md) for:
- Complete usage instructions
- Tips and best practices
- Troubleshooting guide
- Feature documentation

Enjoy automating your forms! 🚀
