# 3GPP TDoc Tracker

A web application for managing 3GPP TDoc agenda items with approval workflow, revision tracking, and version control.

## 📥 Quick Download

**Ready to use? Download the latest version:**

### 🎯 **[Download v1.0.0 from GitHub Releases](https://github.com/coherent-cache/3gpp-tdoc-tracker/releases/latest)** 🎯

*Alternative: [Direct file download](../../raw/main/dist/3gpp-tdoc-tracker.html)*

### How to Use:

1. **Download** the single HTML file above
2. **Save it** to any folder alongside your 3GPP agenda HTML files
3. **Double-click** to open in your web browser
4. **No installation required** - works offline on Windows, Mac, and Linux

---

## Features

- **HTML Import**: Load TDoc data from 3GPP HTML agenda files
- **Approval Workflow**: Set approval status (approved, noted, revised, postponed, not pursued) for selected rows
- **Manual Entry Support**: Insert brand-new TDocs directly from the toolbar
- **Version Control**: Automatic versioning with date/timestamp naming when importing new HTML files
- **Revision Tracking**: Create revision entries with parent-child linking
- **Merge Workflow**: Mark entries as merged into newer TDocs while preserving traceability
- **LS Reply**: Create LS Out replies for LS In entries
- **Comments**: Add personal comments to any entry
- **Auto-Rebase**: User changes are automatically applied when importing newer HTML versions
- **Persistence**: All data is saved in browser localStorage
- **Single-File Build**: Generate an all-in-one HTML artifact for offline distribution

## Usage

1. **Start the application**:

   ```bash
   npm install
   npm run dev
   ```

2. **Load HTML Data**:

   - Click "Load HTML" button
   - Select a 3GPP TDoc agenda HTML file
   - Data will be parsed and displayed in the table

3. **Approval Workflow**:

   - Click rows to select them (blue highlight)
   - Use the approval buttons at the top to set status
   - Row backgrounds change color based on approval status

4. **Manage TDocs**:
   - Use **Add TDoc** to insert a brand-new entry after the current selection
   - Apply **Merge** to mark a TDoc as superseded by another number

5. **Create Revisions**:

   - Click "Revise" button in the Actions column
   - Enter revision number when prompted
   - New row is created with proper parent-child linking

6. **Version Management**:
   - View all versions in the right sidebar
   - Click any version to switch to it
   - Import new HTML files to create new versions

## Builds & Releases

- Development server with hot reload: `npm run dev`
- Standard production build (multi-file): `npm run build`
- Standalone HTML export for distribution: `npm run build:single`  
  Produces `dist/3gpp-tdoc-tracker.html`, a single file ready to share or archive.

Before shipping a release, open the generated HTML in Chrome and Firefox to confirm comment editing, Add TDoc, and Merge behave as expected.

## Technical Stack

- **Svelte**: Reactive UI framework
- **Vite**: Build tool and dev server
- **Pure JavaScript**: No external dependencies for fast performance
- **localStorage**: Data persistence across sessions

## File Structure

- `src/App.svelte`: Main application component
- `src/Toolbar.svelte`: Top toolbar with approval buttons
- `src/TdocTable.svelte`: Data table with row selection and editing
- `src/VersionSidebar.svelte`: Version management sidebar
- `src/parser.js`: HTML parsing and data extraction logic
- `src/app.css`: Application styles

The application is designed to be fast, simple, and functional, with no external dependencies beyond the Svelte framework.
