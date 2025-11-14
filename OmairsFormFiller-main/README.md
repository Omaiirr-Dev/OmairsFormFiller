# Omair's Form Filler

Simple and fast Chrome extension for recording and replaying form interactions.

## Features

- **Auto-Save**: Profiles save automatically when you stop recording
- **Label Detection**: Shows field names like "VPN offered?" instead of selectors
- **Script Implementing**: Paste spreadsheet data to fill multiple forms
- **Fast Replay**: Fills forms in ~10 seconds
- **Edit Anytime**: Modify any field value before or after saving
- **Custom Dropdowns**: Works with modern div-based dropdowns

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the folder containing this extension
6. Done! The extension icon will appear in your toolbar

## Usage

### Record a Form
1. Click the extension icon
2. Click "Record"
3. Fill out the form normally
4. Click "Stop" when done
5. Profile auto-saves with a random name

### Fill a Form
1. Navigate to the form page
2. Click the extension icon
3. Click "Fill" on any saved profile
4. Watch it fill automatically!

### Edit Values
- After recording, edit any field in the "Edit Actions" section
- Or click "Edit" on any saved profile
- Changes save automatically

### Script Implementing
Perfect for filling similar forms with different data:
1. Record the form once
2. Paste spreadsheet data like: `Value1    Value2    Value3`
3. Click "Apply to Fields"
4. Click "Fill" to use the new data

## Requirements

- Chrome browser (version 88+)
- No additional dependencies needed

## License

MIT License - Free to use and modify
