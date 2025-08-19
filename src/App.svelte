<script>
  import { onMount } from 'svelte';
  import { parseTdocHtml, createNewVersion } from './parser.js';
  import VersionSidebar from './VersionSidebar.svelte';
  import TdocTable from './TdocTable.svelte';
  import Toolbar from './Toolbar.svelte';
  import Modal from './Modal.svelte';

  let versions = [];
  let currentVersion = null;
  let selectedRowId = null;
  let fileInput;
  
  // Modal state
  let showRevisionModal = false;
  let showLsReplyModal = false;
  let showClearConfirmModal = false;
  let showReloadConfirmModal = false;
  let showErrorModal = false;
  let errorMessage = '';
  let pendingRevisionTdocId = null;
  let pendingLsReplyTdocId = null;
  let revisionTdocNumber = '';

  // Load data from localStorage on mount
  onMount(() => {
    const savedVersions = localStorage.getItem('tdoc-versions');
    const savedCurrentId = localStorage.getItem('tdoc-current-version');
    
    if (savedVersions) {
      versions = JSON.parse(savedVersions);
      if (savedCurrentId) {
        currentVersion = versions.find(v => v.id === savedCurrentId) || versions[0];
      } else if (versions.length > 0) {
        currentVersion = versions[0];
      }
    }
  });

  // Save to localStorage whenever versions change
  $: if (versions.length > 0) {
    localStorage.setItem('tdoc-versions', JSON.stringify(versions));
    if (currentVersion) {
      localStorage.setItem('tdoc-current-version', currentVersion.id);
    }
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const htmlContent = e.target.result;
        const userChanges = extractUserChanges();
        const newVersion = createNewVersion(versions, htmlContent, userChanges);
        
        // Mark previous versions as inactive
        versions = versions.map(v => ({ ...v, isActive: false }));
        versions = [...versions, newVersion];
        currentVersion = newVersion;
        
        // Clear selected row
        selectedRowId = null;
      } catch (error) {
        console.error('Error parsing HTML file:', error);
        errorMessage = 'Error parsing HTML file: ' + error.message;
        showErrorModal = true;
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  function extractUserChanges() {
    if (!currentVersion) return [];
    
    return currentVersion.tdocs
      .filter(tdoc => tdoc.userApproval || tdoc.userComments)
      .map(tdoc => ({
        tdocNumber: tdoc.tdocNumber,
        userApproval: tdoc.userApproval,
        userComments: tdoc.userComments
      }));
  }

  function switchVersion(version) {
    currentVersion = version;
    selectedRowId = null;
  }

  function applyApprovalStatus(status) {
    if (!selectedRowId) return;
    
    const selectedTdoc = currentVersion.tdocs.find(t => t.id === selectedRowId);
    if (!selectedTdoc) return;
    
    // Check if the action is allowed (same logic as Toolbar)
    const decision = selectedTdoc.decision?.toLowerCase()?.trim();
    const blockedStates = ['withdrawn', 'merged', 'replied to'];
    if (decision && blockedStates.includes(decision)) {
      errorMessage = `Cannot apply ${status} to TDoc with decision state: ${selectedTdoc.decision}`;
      showErrorModal = true;
      return;
    }
    
    const statusText = status.replace('_', ' ');
    
    currentVersion.tdocs = currentVersion.tdocs.map(tdoc => {
      if (tdoc.id === selectedRowId) {
        return { 
          ...tdoc, 
          userApproval: statusText
          // Keep existing comments unchanged
        };
      }
      return tdoc;
    });
    
    // Trigger reactivity
    currentVersion = currentVersion;
    versions = versions;
  }

  function handleRowSelection(tdocId) {
    selectedRowId = selectedRowId === tdocId ? null : tdocId;
  }

  function handleRevision(tdocId) {
    pendingRevisionTdocId = tdocId;
    revisionTdocNumber = getRevisionTdocPrefix();
    showRevisionModal = true;
  }
  
  function getRevisionTdocPrefix() {
    if (!currentVersion || !currentVersion.tdocs || currentVersion.tdocs.length === 0) {
      return '';
    }
    
    // Get the first TDoc number to extract the prefix
    const firstTdoc = currentVersion.tdocs[0].tdocNumber;
    if (!firstTdoc) return '';
    
    // Extract prefix (everything before the last 4 digits)
    // Example: "R5-2356789" -> "R5-235" (user adds "6789")
    const match = firstTdoc.match(/^(.+?)(\d{4})$/);
    if (match) {
      return match[1]; // Return the prefix part
    }
    
    // Fallback: return first part if pattern doesn't match
    return firstTdoc.slice(0, -4) || firstTdoc;
  }
  
  function confirmRevision() {
    if (!revisionTdocNumber || !pendingRevisionTdocId) return;
    
    const newTdocNumber = revisionTdocNumber.trim();
    
    // Check for TDoc number conflicts
    const existingTdoc = currentVersion.tdocs.find(t => t.tdocNumber === newTdocNumber);
    if (existingTdoc) {
      errorMessage = `TDoc number "${newTdocNumber}" already exists. Please choose a different number.`;
      showErrorModal = true;
      return;
    }
    
    const parentTdoc = currentVersion.tdocs.find(t => t.id === pendingRevisionTdocId);
    if (!parentTdoc) return;
    
    // Create new revision entry
    const revisionId = `${newTdocNumber}-${Date.now()}`;
    const revision = {
      ...parentTdoc,
      id: revisionId,
      tdocNumber: newTdocNumber,
      decision: 'reserved', // New revision gets "reserved" status (red color)
      isRevision: true,
      parentTdoc: parentTdoc.tdocNumber,
      userApproval: null, // No approval status for new revision
      userComments: '', // Empty comments for new revision
      selected: false,
      originalColorClass: '', // New revision starts without original color
      originalBgColor: '',
      cellColors: null, // Clear any inherited cell colors
      replaces: parentTdoc.tdocNumber, // This revision replaces the parent
      replacesHref: `#${parentTdoc.tdocNumber}` // Internal link to parent
    };
    
    // Update parent: set as revised (green) and reference new revision
    currentVersion.tdocs = currentVersion.tdocs.map(tdoc => {
      if (tdoc.id === pendingRevisionTdocId) {
        return { 
          ...tdoc, 
          replacedBy: newTdocNumber,
          replacedByHref: `#${newTdocNumber}`, // Internal link to revision
          userApproval: 'revised' // Parent becomes revised (green), keep existing comments
        };
      }
      return tdoc;
    });
    
    // Replaces field already set above
    
    // Add revision to list (ensure it's inserted in the right place, after the parent)
    const parentIndex = currentVersion.tdocs.findIndex(t => t.id === pendingRevisionTdocId);
    if (parentIndex >= 0) {
      currentVersion.tdocs.splice(parentIndex + 1, 0, revision);
    } else {
      currentVersion.tdocs.push(revision);
    }
    
    // Reset modal state
    pendingRevisionTdocId = null;
    revisionTdocNumber = '';
    
    // Trigger reactivity by creating new objects
    currentVersion = {
      ...currentVersion,
      tdocs: [...currentVersion.tdocs]
    };
    versions = [...versions];
  }

  function handleLsReply(tdocId) {
    pendingLsReplyTdocId = tdocId;
    showLsReplyModal = true;
  }
  
  function confirmLsReply(lsOutNumber) {
    if (!lsOutNumber || !pendingLsReplyTdocId) return;
    
    const parentTdoc = currentVersion.tdocs.find(t => t.id === pendingLsReplyTdocId);
    if (!parentTdoc) return;
    
    // Create new LS reply entry
    const replyId = `${lsOutNumber}-${Date.now()}`;
    const reply = {
      ...parentTdoc,
      id: replyId,
      tdocNumber: lsOutNumber,
      title: `Reply to ${parentTdoc.tdocNumber}`,
      type: 'LS Out',
      isRevision: false,
      parentTdoc: parentTdoc.tdocNumber,
      userApproval: null,
      userComments: '',
      selected: false
    };
    
    // Update replaces field in reply
    reply.replaces = parentTdoc.tdocNumber;
    
    // Add reply to list (ensure it's inserted in the right place, after the parent)
    const parentIndex = currentVersion.tdocs.findIndex(t => t.id === pendingLsReplyTdocId);
    if (parentIndex >= 0) {
      currentVersion.tdocs.splice(parentIndex + 1, 0, reply);
    } else {
      currentVersion.tdocs.push(reply);
    }
    
    // Reset modal state
    pendingLsReplyTdocId = null;
    
    // Trigger reactivity by creating new objects
    currentVersion = {
      ...currentVersion,
      tdocs: [...currentVersion.tdocs]
    };
    versions = [...versions];
  }

  function updateComments(tdocId, comments) {
    currentVersion.tdocs = currentVersion.tdocs.map(tdoc => {
      if (tdoc.id === tdocId) {
        return { ...tdoc, userComments: comments };
      }
      return tdoc;
    });
    
    // Trigger reactivity
    currentVersion = currentVersion;
    versions = versions;
  }

  function clearAllVersions() {
    showClearConfirmModal = true;
  }
  
  function confirmClearVersions() {
    versions = [];
    currentVersion = null;
    selectedRowId = null;
    localStorage.removeItem('tdoc-versions');
    localStorage.removeItem('tdoc-current-version');
  }

  function reloadApp() {
    showReloadConfirmModal = true;
  }
  
  function confirmReloadApp() {
    window.location.reload();
  }

  async function exportHtml() {
    if (!currentVersion) {
      errorMessage = 'No data to export';
      showErrorModal = true;
      return;
    }

    const htmlContent = generateHtmlExport(currentVersion);
    const suggestedName = `TDoc_Export_${formatDateForFilename(new Date())}.html`;
    
    // Try to use modern File System Access API
    if ('showSaveFilePicker' in window) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName,
          types: [{
            description: 'HTML files',
            accept: { 'text/html': ['.html'] }
          }]
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(htmlContent);
        await writable.close();
        return;
      } catch (err) {
        if (err.name === 'AbortError') {
          return; // User cancelled
        }
        console.error('Save failed:', err);
      }
    }
    
    // Fallback to traditional download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function formatDateForFilename(date) {
    return date.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, 'h');
  }

  function generateHtmlExport(version) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day} ${hour}:${minute}`;
    
    let html = `<HTML>
<HEAD>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html;charset=UTF-8">
<TITLE>TDoc list</TITLE>
<style>
/* Tooltip container */
.tooltip {
    position: relative;
    display: inline-block;
    border-bottom: 1px dotted black; /* dots under the hoverable text */
}

/* Tooltip text */
.tooltip .tooltiptext {
    visibility: hidden;
    width: 300px;
    background-color: black;
    color: #fff;
    text-align: left;
    padding: 5px 5px;
    border-radius: 6px;
 
    /* Position the tooltip text */
    position: absolute;
    z-index: 1;
    top: -5px;
    right: 105%;
}

/* Show the tooltip text when you mouse over the tooltip container */
.tooltip:hover .tooltiptext {
    visibility: visible;
}
</style>
</HEAD>

<BODY>
<P><FONT FACE="Arial" COLOR=#000000><B>Tdoc List</B></FONT></P>
<P><FONT FACE="Arial" COLOR=#000000>${timestamp}</FONT></P>

<TABLE BORDER=1 BGCOLOR=#FFFFFF CELLSPACING=0>
<THEAD>
<TH BGCOLOR=#FFFFFF BORDERCOLOR=#000000 ><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
Agenda
</FONT></TH>
<TH BGCOLOR=#FFFFFF BORDERCOLOR=#000000 ><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
Topic
</FONT></TH>
<TH BGCOLOR=#FFFFFF BORDERCOLOR=#000000 ><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
TDoc
</FONT></TH>
<TH BGCOLOR=#FFFFFF BORDERCOLOR=#000000 ><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
Title
</FONT></TH>
<TH BGCOLOR=#FFFFFF BORDERCOLOR=#000000 ><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
Source
</FONT></TH>
<TH BGCOLOR=#FFFFFF BORDERCOLOR=#000000 ><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
Type
</FONT></TH>
<TH BGCOLOR=#FFFFFF BORDERCOLOR=#000000 ><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
For
</FONT></TH>
<TH BGCOLOR=#FFFFFF BORDERCOLOR=#000000 ><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
Avail
</FONT></TH>
<TH BGCOLOR=#FFFFFF BORDERCOLOR=#000000 ><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
Treated
</FONT></TH>
<TH BGCOLOR=#FFFFFF BORDERCOLOR=#000000 ><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
Decision
</FONT></TH>
<TH BGCOLOR=#FFFFFF BORDERCOLOR=#000000 ><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
My Approval/Comments
</FONT></TH>
<TH BGCOLOR=#FFFFFF BORDERCOLOR=#000000 ><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
Wdrn
</FONT></TH>
<TH BGCOLOR=#FFFFFF BORDERCOLOR=#000000 ><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
Replaced-by
</FONT></TH>
<TH BGCOLOR=#FFFFFF BORDERCOLOR=#000000 ><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
Replaces
</FONT></TH>
</THEAD>`;

    // Export in original format - flat list with agenda/topic in each row
    version.tdocs.forEach(tdoc => {
      // Get individual cell colors using same logic as the app
      const getCellColor = (cellType) => {
        return getExportBgColor(
          tdoc.decision, 
          tdoc.userApproval, 
          tdoc.cellColors?.[cellType]
        );
      };
      
      html += `
<TR VALIGN=TOP>
<TD BORDERCOLOR=#000000 BGCOLOR=#FFFFFF><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.agenda)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=#FFFFFF><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.topic)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor('tdoc')}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${tdoc.tdocHref ? `<a name="${escapeHtml(tdoc.tdocNumber)}" target="_blank" href="${tdoc.tdocHref}">${escapeHtml(tdoc.tdocNumber)}</a>` : escapeHtml(tdoc.tdocNumber)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor('title')}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.title)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor('source')}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.source)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor('type')}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.type)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor('for')}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.for)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor('avail')}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.avail)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor('treated')}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${tdoc.treatedTooltip ? `<div class="tooltip">${escapeHtml(tdoc.treated)}<span class="tooltiptext">${escapeHtml(tdoc.treatedTooltip)}</span></div>` : escapeHtml(tdoc.treated)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor('decision')}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.decision)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor('decision')}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${generateApprovalCommentsCell(tdoc)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor('wdrn')}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.wdrn)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor('replacedBy')}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${tdoc.replacedByHref ? `<a href="${tdoc.replacedByHref}">${escapeHtml(tdoc.replacedBy)}</a>` : escapeHtml(tdoc.replacedBy)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor('replaces')}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${tdoc.replacesHref ? `<a href="${tdoc.replacesHref}">${escapeHtml(tdoc.replaces)}</a>` : escapeHtml(tdoc.replaces)}
</FONT></TH>
</TR>`;
    });

    html += `
</TABLE>
</BODY>
</HTML>`;

    return html;
  }

  function getExportBgColor(decision, userApproval, cellColor = null) {
    // Priority: userApproval > cellColor > decision state > default
    
    // If user has made an approval decision, use that color
    if (userApproval && userApproval.trim() !== '') {
      const approvalColors = {
        'approved': '#99FF33',
        'noted': '#99FF33', 
        'revised': '#99FF33',
        'postponed': '#99FF33',
        'not pursued': '#99FF33'
      };
      return approvalColors[userApproval.toLowerCase().trim()] || '#FFFFFF';
    }
    
    // If there's an original cell color and no user approval, use it
    if (cellColor) {
      return cellColor;
    }
    
    // Otherwise use decision state colors
    const decisionColors = {
      'approved': '#99FF33',
      'revised': '#99FF33', 
      'merged': '#99FF33',
      'replied to': '#99FF33',
      'not pursued': '#99FF33',
      'postponed': '#99FF33',
      'available': '#FFFF99',
      'reserved': '#FF8566'
    };
    
    return decisionColors[decision?.toLowerCase()] || '#FFFFFF';
  }
  
  function generateApprovalCommentsCell(tdoc) {
    const approval = tdoc.userApproval || '';
    const comments = tdoc.userComments || '';
    
    if (approval && comments) {
      return `<div class="tooltip">${escapeHtml(approval)}<span class="tooltiptext">${escapeHtml(comments)}</span></div>`;
    } else if (approval) {
      return escapeHtml(approval);
    } else if (comments) {
      return escapeHtml(comments);
    } else {
      return '&nbsp;';
    }
  }

  function escapeHtml(text) {
    if (!text) return '&nbsp;';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#8217;') // Right single quotation mark
      .replace(/'/g, '&#8216;') // Left single quotation mark  
      .replace(/"/g, '&#8220;') // Left double quotation mark
      .replace(/"/g, '&#8221;') // Right double quotation mark
      .replace(/–/g, '&#8211;') // En dash
      .replace(/—/g, '&#8212;') // Em dash
      .replace(/‑/g, '&#8209;') // Non-breaking hyphen
      .replace(/…/g, '&#8230;') // Horizontal ellipsis
      .replace(/�/g, '&#8217;'); // Fix replacement character to apostrophe
  }

</script>

<div class="app-container">
  <div class="main-content">
    <Toolbar 
      {selectedRowId}
      currentTdoc={selectedRowId ? currentVersion?.tdocs?.find(t => t.id === selectedRowId) : null}
      onApprovalClick={applyApprovalStatus}
      onFileUpload={handleFileUpload}
      onClearVersions={clearAllVersions}
      onExportHtml={exportHtml}
      onRevision={handleRevision}
      onLsReply={handleLsReply}
      bind:fileInput
    />
    
    {#if currentVersion}
      <TdocTable 
        tdocs={currentVersion.tdocs}
        {selectedRowId}
        onRowSelect={handleRowSelection}
        onCommentsUpdate={updateComments}
      />
    {:else}
      <div class="table-container">
        <p>No data loaded. Please upload an HTML file to get started.</p>
      </div>
    {/if}
  </div>
  
  <VersionSidebar 
    {versions}
    {currentVersion}
    onVersionSelect={switchVersion}
  />
</div>

<!-- Modals -->
<Modal 
  bind:isOpen={showRevisionModal}
  title="Create Revision"
  onConfirm={confirmRevision}
  confirmText="Create Revision"
>
  <div>
    <label for="revision-tdoc-input">New TDoc Number:</label>
    <input 
      id="revision-tdoc-input"
      type="text" 
      class="modal-input"
      bind:value={revisionTdocNumber}
      placeholder="Enter TDoc number..."
    />
    <p style="font-size: 12px; color: #666; margin-top: 8px;">
      Enter the full TDoc number or edit the prefilled prefix and add the remaining 4 digits.
    </p>
  </div>
</Modal>

<Modal 
  bind:isOpen={showLsReplyModal}
  title="Reply to LS In"
  onConfirm={confirmLsReply}
  confirmText="Create Reply"
>
  Enter LS Out number:
</Modal>

<Modal 
  bind:isOpen={showClearConfirmModal}
  title="Clear All Versions"
  onConfirm={confirmClearVersions}
  confirmText="Clear All"
  showCancel={true}
>
  Are you sure you want to clear all versions? This cannot be undone.
</Modal>

<Modal 
  bind:isOpen={showReloadConfirmModal}
  title="Reload Application"
  onConfirm={confirmReloadApp}
  confirmText="Reload"
  showCancel={true}
>
  Are you sure you want to reload the app? Unsaved changes will be lost.
</Modal>

<Modal 
  bind:isOpen={showErrorModal}
  title="Error"
  onConfirm={() => {}}
  confirmText="OK"
  showCancel={false}
>
  {errorMessage}
</Modal>