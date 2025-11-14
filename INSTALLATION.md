# Installation Guide

## Quick Install

1. Download this extension folder
2. Open Chrome: `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the extension folder
6. Done!

## Files Included

- `manifest.json` - Extension configuration
- `background.js` - Service worker
- `content.js` - Form interaction logic
- `popup.html` - Extension UI
- `popup.js` - UI logic
- `popup.css` - Dark mode styling
- `icons/` - Extension icons

## Test It

1. Click the extension icon
2. Click "Record"
3. Fill out any form
4. Click "Stop" (auto-saves)
5. Refresh the page
6. Click "Fill" to replay!

## Troubleshooting

**Extension won't load?**
- Make sure all files are present
- Check Chrome version (need 88+)
- Try reloading: Click refresh icon on extension

**Not working on a page?**
- Refresh the page after loading extension
- Check browser console for errors

## Uninstall

1. Go to `chrome://extensions/`
2. Find "Omair's Form Filler"
3. Click "Remove"
