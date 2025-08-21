# 3GPP TDoc Tracker - Project Status

## Overview
A web application for managing 3GPP TDoc agenda items with approval workflow, revision tracking, and version control. Built with Svelte and Vite for fast performance.

## Main Requirements (Enhanced)
- Load data from 3GPP HTML agenda files with individual cell color preservation
- Separate "Decision" (external/system) and "My Approval" (user) columns for proper state management
- Set approval status: Approve, Agree, Note, Revise, Postpone, Not Pursue (verb-based buttons)
- Comments textbox available for ALL states (terminal and actionable)
- State validation: Approval actions only enabled for "available" and "reserved" decision states
- Color-code based on decision states using original 3GPP colors (#99FF33 green, #FFFF99 yellow, #FF8566 red)
- User approval colors override decision colors when applied
- Clear/revert approval functionality to return to original decision state colors
- Create revisions with parent-child linking and proper state management
- Reply to LS In entries with LS Out numbers
- Sync/rebase user changes when importing newer HTML versions - preserve user data
- Export with file save dialog and maintain original HTML format with tooltip merge
- **SINGLE-FILE APPLICATION**: Build as standalone HTML file for maximum portability
- **PERSISTENT STATE**: Robust localStorage with autosave and manual save functionality
- **FILTERING & SORTING**: Filter by decision/approval states, sort by various criteria
- **AGENDA NAVIGATION**: Clickable agenda outline in sidebar for quick navigation

## Current Implementation Status

### ✅ Completed Features

**Core Data Management:**
- HTML parser extracts TDoc data from 3GPP agenda files
- Preserves original styling and color coding from source HTML
- Version control system with date/timestamp naming
- Auto-rebase functionality applies user changes to new HTML imports
- LocalStorage persistence across sessions

**User Interface:**
- Clean Svelte-based responsive interface with mobile support
- Two-row toolbar: action buttons top, filter buttons below
- Hamburger menu for mobile sidebar access
- Row selection with blue outline highlighting
- Reorganized sidebar: utility buttons moved from toolbar
- Removed redundant Actions column for cleaner layout

**Approval Workflow:**
- Single-row selection system
- Top toolbar buttons: Approved, Agreed, Noted, Revised, Postponed, Not Pursued
- Clear/revert approval button to remove user approval state
- Comments textbox available for ALL TDocs (regardless of state)
- User approval colors override decision state colors when applied
- Visual color coding: green (all user approvals), decision state colors when no approval
- Autosave functionality with 30-second intervals
- Manual save button with save status indicators

**Filtering & Navigation:**
- Visual filter buttons for Decision states: Available, Reserved, Approved, Revised, Postponed, Withdrawn
- Filter buttons for My Approval states: Has Approval, No Approval  
- Removed sorting feature to preserve natural agenda order
- Reactive filtering with proper agenda/topic inheritance
- Agenda outline sidebar with click-to-scroll navigation (currently needs fixes)
- Progress indicators showing approval counts per agenda item

**Advanced Workflows:**
- **Revision System**: User "revised" approval creates new TDoc with "reserved" status
- **State Management**: Decision column (external) vs My Approval column (user) separation
- **Orphan Prevention**: User "revised" approval makes original TDoc terminal until cleared
- **LS Reply System**: Reply to LS In entries with LS Out numbers
- **Hyperlink Preservation**: Maintains internal links in Replaced-by/Replaces columns
- **Tooltip Support**: Preserves and displays tooltips from original HTML

**Export/Import:**
- Generates HTML export matching original 3GPP format
- Preserves all user changes, comments, and approval statuses
- UTF-8 encoding with proper character escaping
- Can re-import exported files without data loss

**Technical Features:**
- Sticky table headers and section headers for navigation
- Agenda/topic grouping with floating section headers
- Consistent date formatting (YYYY-MM-DD HH:MM)
- No external dependencies beyond Svelte for performance

### 🔧 Current Technical State

**Architecture:**
- `src/App.svelte` - Main application component with state management
- `src/Toolbar.svelte` - Top action buttons and file operations
- `src/TdocTable.svelte` - Data display with grouping and selection
- `src/VersionSidebar.svelte` - Version management interface
- `src/parser.js` - HTML parsing and data extraction logic
- `src/app.css` - Styling with sticky headers and color schemes

**Data Model:**
- Original fields: agenda, topic, tdocNumber, title, source, type, for, avail, treated, decision, wdrn, replacedBy, replaces
- Enhanced fields: userApproval, userComments, originalColorClass, treatedTooltip, hyperlink references
- Version tracking: timestamp, name, tdocs array, metadata
- State separation: decision (external/read-only) vs userApproval (user-controlled)

**Key Functions:**
- `parseTdocHtml()` - Extracts data from HTML with tooltip and link preservation
- `createNewVersion()` - Version management with auto-rebase
- `applyApprovalStatus()` - Handles approval workflow
- `handleRevision()` - Creates revision entries with proper linking
- `generateHtmlExport()` - Produces standards-compliant HTML output

### 🚀 Usage Instructions

**For Single-File Application:**
1. **Build**: `npm run build:single` - Creates `dist/3gpp-tdoc-tracker.html`
2. **Deploy**: Copy single HTML file to any directory with agenda files
3. **Open**: Double-click HTML file in browser - all previous state loads automatically

**Daily Workflow:**
1. **Load Data**: Drag/drop or click "Load HTML" and select 3GPP agenda file
2. **Filter/Sort**: Use dropdown menus to filter by state or sort by criteria
3. **Navigate**: Use agenda outline sidebar to jump to specific sections
4. **Select Row**: Click any TDoc row (blue outline appears)
5. **Apply Actions**: Use top toolbar buttons for approval actions (only on actionable states)
6. **Add Comments**: Use comments textbox (available for all states)
7. **Save**: Manual save button or automatic save every 30 seconds
8. **Clear Approvals**: Use clear/revert button to remove user approval and return to decision color
9. **Manage Versions**: Use sidebar to switch between imported versions
10. **Export Results**: Click "Export HTML" to save with all changes

**State Persistence**: All data automatically saved in browser localStorage - reopening preserves all work

### 🎯 Key Achievements

- **Performance**: Fast, lightweight implementation with minimal dependencies
- **Portability**: Single HTML file deployment - works anywhere, anytime
- **Compatibility**: Maintains full compatibility with original 3GPP HTML format
- **Workflow**: Streamlined approval process with filtering, sorting, and navigation
- **Data Integrity**: Preserves all original data, links, and tooltips
- **State Persistence**: Robust localStorage with autosave and manual save
- **User Experience**: Clean interface with agenda navigation and visual feedback
- **Offline Capability**: Complete functionality without internet connection

### 📝 State Management Architecture

**Two-Column State System:**
- **Decision Column**: External/system state from 3GPP HTML imports (read-only)
  - States: available, reserved, approved, revised, postponed, withdrawn, merged, replied to
  - Updated only during HTML import/sync operations
- **My Approval Column**: User workflow state (user-controlled)
  - Actions: approved, agreed, noted, revised, postponed, not pursued, clear
  - Preserved across imports and syncs

**Key Behavioral Rules:**
- User actions NEVER modify decision column
- Approval actions only available on "available" and "reserved" decision states
- Comments always available regardless of state
- User "revised" approval creates terminal condition to prevent orphaning
- Clear approval functionality restores original decision state colors
- Import/sync preserves user data while updating decision states

### 📝 Notes for Future Development

- Application implements proper state separation between external and user data
- All approval workflow requirements have been implemented with state validation
- Export/import cycle maintains data integrity with user data preservation
- Revision workflow prevents orphaning through terminal user state management
- Interface provides full audit capability with universal comments access

The application successfully transforms the static 3GPP HTML agenda format into a fully portable, single-file interactive workflow management tool while maintaining strict data separation and preserving all original formatting and user data integrity.

## 📦 Single-File Build System

**Build Configuration:**
- Uses `vite-plugin-singlefile` for complete application bundling
- Produces self-contained HTML file with all assets inlined
- No external dependencies or network requirements after build
- Compatible with all modern browsers

**Build Commands:**
- `npm run dev` - Development server with hot reload
- `npm run build` - Standard multi-file build  
- `npm run build:single` - **Single-file build for deployment**

**Deployment:**
1. Run `npm run build:single`
2. Copy `dist/3gpp-tdoc-tracker.html` to desired location
3. File is completely portable and self-contained
4. Works offline, maintains state across browser sessions
5. Can be shared, backed up, or deployed anywhere

## 🔧 Development Setup

**Prerequisites:**
- Node.js LTS (use `nvm use --lts`)
- Modern browser for testing

**Getting Started:**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build single-file application
npm run build:single
```