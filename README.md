# Omair's Form Filler

A powerful Chrome extension for recording and replaying form interactions with precision. Never fill out the same form twice!

## Features

### 🎯 Core Functionality
- **Record Every Interaction**: Captures clicks, text inputs, dropdowns, radio buttons, checkboxes, and more
- **Ultra-Robust Replay**: 9 fallback strategies with automatic retries for maximum reliability
- **Profile Management**: Save unlimited form-filling profiles with comprehensive metadata
- **Flexible Editing**: Edit any recorded action before replaying
- **Visual Feedback**: Real-time on-screen indicators during recording and replay
- **Smart Element Detection**: XPath + CSS selectors with intelligent waiting for dynamic content
- **Auto-Scroll & Focus**: Automatically scrolls elements into view and focuses them
- **Success Tracking**: See exactly which actions succeeded or failed during replay

### 🎨 User Interface
- **Beautiful Dark Mode**: Easy on the eyes with a modern, sleek design
- **Intuitive Controls**: Simple record/stop/fill workflow
- **Action Counter**: Track how many interactions you've recorded
- **Profile Library**: Organized view of all your saved profiles

### 🔧 Technical Features - Maximum Robustness
- **9-Layer Element Detection**:
  1. Direct CSS selector
  2. XPath fallback
  3. Name + type attributes
  4. Element ID
  5. Data attributes (data-testid, data-test, etc.)
  6. Text content matching
  7. Placeholder matching
  8. Relaxed CSS (without positional selectors)
  9. Partial selector matching

- **Automatic Retry Logic**: Up to 3 retries with exponential backoff for network-delayed content
- **Intelligent Waiting**: Waits up to 5 seconds for elements to become interactive
- **Smart Selector Generation**: Filters out dynamic classes and uses stable identifiers
- **Debounced Input**: Efficiently captures text input without duplicate actions
- **Context Preservation**: Captures comprehensive metadata (position, attributes, classes)
- **React/Vue Compatible**: Triggers native input setters for framework compatibility
- **Safe Submission**: Prevents accidental form submissions during replay
- **Element Validation**: Verifies tag names and input types before interaction
- **Auto-Scroll**: Scrolls elements into center view before interaction

## Installation

### Method 1: Load Unpacked (Development)

1. **Download or Clone** this repository to your local machine

2. **Open Chrome Extensions**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)

3. **Load the Extension**:
   - Click "Load unpacked"
   - Select the `OmairsFormFiller` folder
   - The extension should now appear in your extensions list

4. **Pin the Extension** (optional):
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Omair's Form Filler"
   - Click the pin icon to keep it visible

### Method 2: Install from Chrome Web Store (Coming Soon)

_This extension will be published to the Chrome Web Store soon._

## Usage

### Recording a Form Interaction

1. **Navigate to the Form**: Open the webpage with the form you want to automate

2. **Start Recording**:
   - Click the extension icon in your Chrome toolbar
   - Click the "Start Recording" button (🔴)
   - You'll see a red recording indicator in the top-right of the page

3. **Fill Out the Form**:
   - Interact with the form normally
   - Every click, input, and selection is captured
   - Watch the action counter increase as you interact

4. **Stop Recording**:
   - Click the extension icon again
   - Click the "Stop Recording" button
   - Review the number of actions captured

5. **Save Your Profile**:
   - Enter a descriptive name for your profile
   - Click "Save Profile"
   - Your profile is now saved and ready to use!

### Replaying a Form

1. **Navigate to the Form**: Open the same webpage (or any page with similar form structure)

2. **Open the Extension**: Click the extension icon

3. **Select a Profile**: Find the profile you want to use in the "Saved Profiles" section

4. **Fill the Form**:
   - Click the "▶ Fill Form" button
   - Watch as the extension automatically fills out the form
   - A blue indicator shows the replay progress

### Editing a Profile

1. **Open the Extension**: Click the extension icon

2. **Edit Profile**:
   - Find the profile you want to edit
   - Click the "✏️ Edit" button
   - A modal opens with all recorded actions

3. **Modify Actions**:
   - Change input values
   - Toggle checkboxes
   - Remove unwanted actions by clicking the ✕
   - Update the profile name if needed

4. **Save Changes**:
   - Click "Save Changes"
   - Your updated profile is ready to use

### Deleting a Profile

1. Click the extension icon
2. Find the profile you want to delete
3. Click the "🗑️" button
4. Confirm the deletion

## Supported Form Elements

Omair's Form Filler can capture and replay interactions with:

- ✅ Text inputs (`<input type="text">`)
- ✅ Text areas (`<textarea>`)
- ✅ Email/URL/Tel inputs
- ✅ Number inputs
- ✅ Password inputs
- ✅ Checkboxes (`<input type="checkbox">`)
- ✅ Radio buttons (`<input type="radio">`)
- ✅ Dropdown menus (`<select>`)
- ✅ Multi-select lists
- ✅ Date/Time inputs
- ✅ File inputs (captures selection, but files must be available during replay)
- ✅ Custom form elements (if they use standard events)
- ✅ Buttons and links

## Tips & Best Practices

### Recording Tips
- **Start Clean**: Begin recording before you start filling the form
- **Go Slow**: Take your time to ensure all actions are captured properly
- **Avoid Distractions**: Don't click outside the form during recording
- **Check Counter**: Keep an eye on the action counter to verify captures

### Replay Tips
- **Same Page Structure**: Works best on forms with consistent structure
- **Network Delay**: If a page loads slowly, wait before replaying
- **Review First**: Use the edit feature to verify actions before first replay
- **Test Run**: Do a test replay to ensure everything works correctly

### Profile Management
- **Descriptive Names**: Use clear names like "Google Form - Weekly Report"
- **Regular Cleanup**: Delete outdated profiles you no longer use
- **Backup Important Profiles**: Use Edit to view and manually save critical data

## Troubleshooting

### Recording Not Starting
- **Refresh the Page**: Sometimes content script needs a page reload
- **Check Permissions**: Ensure the extension has permission for the site
- **Console Errors**: Open DevTools (F12) and check for JavaScript errors

### Form Not Filling Correctly
- **Page Changes**: The form structure may have changed since recording
- **Dynamic Elements**: Some forms load elements dynamically - wait before replaying
- **Edit Profile**: Check the recorded selectors in edit mode
- **Re-record**: Sometimes the best fix is to record a fresh profile

### Elements Not Found
- **Dynamic IDs**: Some sites use random IDs that change on each load
- **Timing Issues**: Try adding a small delay by re-recording more slowly
- **Selector Conflicts**: Use edit mode to verify element selectors

### Extension Not Appearing
- **Enable Extension**: Check `chrome://extensions/` and ensure it's enabled
- **Reload Extension**: Toggle the extension off and on
- **Check Icons**: Ensure icon files are in the `icons/` folder

## Privacy & Security

### Data Storage
- **Local Only**: All profiles are stored locally in your browser
- **No Cloud Sync**: Data never leaves your device
- **No Tracking**: This extension doesn't track your usage
- **No External Calls**: No data is sent to external servers

### Permissions Explained
- **storage**: Required to save your form profiles locally
- **activeTab**: Needed to interact with the current page
- **scripting**: Required to inject the content script
- **tabs**: Used to identify the current tab
- **<all_urls>**: Allows the extension to work on any website you choose

### Security Best Practices
- **Sensitive Data**: Be cautious when recording forms with sensitive information
- **Password Fields**: Consider whether you want to save password inputs
- **Review Profiles**: Use edit mode to verify what data is stored
- **Regular Cleanup**: Delete profiles with outdated or sensitive information

## Technical Details

### Architecture
- **Manifest V3**: Built with the latest Chrome extension standards
- **Content Script**: Injects interaction capture/replay logic into pages
- **Service Worker**: Manages background operations and storage
- **Popup Interface**: Provides user-friendly controls and profile management

### Element Selection Strategy
The extension uses a comprehensive 9-layer fallback system to locate elements reliably:

**Recording Phase:**
1. **ID-based** (`#uniqueId`) - Most stable if IDs don't change
2. **Name + Type** (`input[name="email"][type="text"]`) - Common in forms
3. **Data attributes** (`[data-testid="submit"]`) - Test automation friendly
4. **ARIA labels** (`[aria-label="Submit"]`) - Accessibility attributes
5. **Placeholders** (`[placeholder="Enter email"]`) - Input hints
6. **Smart CSS path** - Filters dynamic classes, uses stable selectors only
7. **XPath** - Full DOM path as ultimate fallback

**Replay Phase (with retries):**
1. Direct CSS selector
2. XPath lookup
3. Name + type combo
4. Element ID only
5. Any data-* attribute
6. Text content matching (for buttons/labels)
7. Placeholder attribute
8. Relaxed CSS (removes nth-of-type)
9. Partial selector (last component only)

Each strategy validates the element type and structure before accepting it.

### Event Handling
- **Click Events**: Captured with `addEventListener('click', ..., true)`
- **Input Events**: Debounced to avoid duplicate captures
- **Change Events**: Captured for selects and checkboxes
- **Submit Events**: Recorded but not auto-replayed (safety feature)

## Development

### Project Structure
```
OmairsFormFiller/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup UI
├── popup.css             # Dark mode styling
├── popup.js              # Popup logic and profile management
├── content.js            # Page interaction capture/replay
├── background.js         # Service worker
├── generate-icons.html   # Icon generator utility
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

### Building & Testing
1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

### Contributing
Contributions are welcome! Please feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## Known Limitations

- **Dynamic Forms**: Forms that heavily modify the DOM may need re-recording
- **CAPTCHAs**: Cannot automate CAPTCHA solving (by design)
- **File Uploads**: File paths are relative to your system
- **iFrames**: Limited support for forms inside iframes
- **Shadow DOM**: May not work with shadow DOM elements
- **Custom Events**: Some frameworks use custom events that aren't captured

## Future Enhancements

- [ ] Export/Import profiles (JSON format)
- [ ] Cloud sync option (optional)
- [ ] Keyboard shortcuts (Ctrl+Shift+R to record)
- [ ] Profile categories and tags
- [ ] Search/filter profiles
- [ ] Conditional logic (if/then actions)
- [ ] Variable support (randomize data)
- [ ] Scheduling (auto-fill at specific times)
- [ ] Browser extension for Firefox/Edge

## License

MIT License - Feel free to use and modify as needed.

## Credits

Created with ❤️ for automating repetitive form filling tasks.

**Omair's Form Filler** - Making forms less tedious, one click at a time.

---

## Support

Having issues or questions?

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [Tips & Best Practices](#tips--best-practices)
3. Open an issue on GitHub

---

**Version**: 1.0.0
**Last Updated**: 2025-11-13
