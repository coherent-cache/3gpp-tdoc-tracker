<script>
  import { onMount } from "svelte";
  import { parseTdocHtml, createNewVersion } from "./parser.js";
  import VersionSidebar from "./VersionSidebar.svelte";
  import TdocTable from "./TdocTable.svelte";
  import Toolbar from "./Toolbar.svelte";
  import Modal from "./Modal.svelte";

  let versions = [];
  let currentVersion = null;
  let selectedRowId = null;
  let fileInput;
  let lastSaveTime = null;
  let hasUnsavedChanges = false;
  let autosaveTimer = null;
  let currentFilter = "all";
  let sidebarVisible = false;

  // Modal state
  let showRevisionModal = false;
  let showLsReplyModal = false;
  let showDeleteVersionConfirmModal = false;
  let showReloadConfirmModal = false;
  let showErrorModal = false;
  let errorMessage = "";
  let pendingRevisionTdocId = null;
  let pendingLsReplyTdocId = null;
  let pendingDeleteVersion = null;
  let revisionTdocNumber = "";
  let lsOutNumber = "";

  // Enhanced state management constants
  const STORAGE_KEYS = {
    versions: "3gpp-tracker-versions",
    currentVersion: "3gpp-tracker-current-version",
    lastSave: "3gpp-tracker-last-save",
    appVersion: "3gpp-tracker-app-version",
  };
  const APP_VERSION = "1.0.0";
  const AUTOSAVE_INTERVAL = 30000; // 30 seconds

  // Load data from localStorage with validation
  onMount(() => {
    try {
      // Check app version for migration
      const savedAppVersion = localStorage.getItem(STORAGE_KEYS.appVersion);
      if (savedAppVersion && savedAppVersion !== APP_VERSION) {
        console.log("App version changed, checking for migration...");
      }

      const savedVersions = localStorage.getItem(STORAGE_KEYS.versions);
      const savedCurrentId = localStorage.getItem(STORAGE_KEYS.currentVersion);
      const savedLastSave = localStorage.getItem(STORAGE_KEYS.lastSave);

      if (savedVersions) {
        const parsedVersions = JSON.parse(savedVersions);
        // Validate data structure
        if (Array.isArray(parsedVersions) && parsedVersions.length > 0) {
          versions = parsedVersions;
          if (savedCurrentId) {
            currentVersion =
              versions.find((v) => v.id === savedCurrentId) || versions[0];
          } else if (versions.length > 0) {
            currentVersion = versions[0];
          }

          if (savedLastSave) {
            lastSaveTime = new Date(savedLastSave);
          }
        }
      }

      // Set app version
      localStorage.setItem(STORAGE_KEYS.appVersion, APP_VERSION);

      // Start autosave timer
      startAutosave();
    } catch (error) {
      console.error("Error loading saved data:", error);
      // Clear corrupted data
      clearCorruptedData();
    }
  });

  function clearCorruptedData() {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
    versions = [];
    currentVersion = null;
    lastSaveTime = null;
  }

  function saveState() {
    if (versions.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.versions, JSON.stringify(versions));
        if (currentVersion) {
          localStorage.setItem(STORAGE_KEYS.currentVersion, currentVersion.id);
        }
        const now = new Date();
        localStorage.setItem(STORAGE_KEYS.lastSave, now.toISOString());
        lastSaveTime = now;
        hasUnsavedChanges = false;
        console.log("State saved successfully");
      } catch (error) {
        console.error("Error saving state:", error);
      }
    }
  }

  function startAutosave() {
    if (autosaveTimer) clearInterval(autosaveTimer);
    autosaveTimer = setInterval(() => {
      if (hasUnsavedChanges && versions.length > 0) {
        saveState();
      }
    }, AUTOSAVE_INTERVAL);
  }

  function markAsChanged() {
    hasUnsavedChanges = true;
  }

  // Save to localStorage whenever versions change (immediate save for critical changes)
  $: if (versions.length > 0) {
    markAsChanged();
    // Immediate save for new versions or structural changes
    if (!lastSaveTime || Date.now() - lastSaveTime.getTime() > 60000) {
      saveState();
    }
  }

  // Cleanup on unmount
  import { onDestroy } from "svelte";
  onDestroy(() => {
    if (autosaveTimer) {
      clearInterval(autosaveTimer);
    }
    // Final save on exit
    if (hasUnsavedChanges) {
      saveState();
    }
  });

  // Prevent accidental page reload while allowing proper Enter key behavior
  function handleGlobalKeydown(event) {
    if (event.key === "Enter") {
      const target = event.target;

      // Allow Enter in modals (handled by Modal component)
      if (target.closest(".modal-content")) {
        return;
      }

      // Allow Enter in contenteditable elements (comments) to create newlines
      if (target.isContentEditable) {
        return;
      }

      // Allow Enter for row selection (handled by component)
      if (
        target.hasAttribute("role") &&
        target.getAttribute("role") === "button"
      ) {
        return;
      }

      // Prevent Enter everywhere else to avoid page reloads
      event.preventDefault();
      event.stopPropagation();
    }

    // Prevent F5/Ctrl+R refresh as additional safety
    if (event.key === "F5" || (event.ctrlKey && event.key === "r")) {
      if (hasUnsavedChanges) {
        event.preventDefault();
        if (
          confirm("You have unsaved changes. Are you sure you want to refresh?")
        ) {
          window.location.reload();
        }
      }
    }
  }

  // Prevent accidental page refresh
  function handleBeforeUnload(event) {
    if (hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue =
        "You have unsaved changes. Are you sure you want to leave?";
      return event.returnValue;
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
        versions = versions.map((v) => ({ ...v, isActive: false }));
        versions = [...versions, newVersion];
        currentVersion = newVersion;

        // Clear selected row
        selectedRowId = null;
      } catch (error) {
        console.error("Error parsing HTML file:", error);
        errorMessage = "Error parsing HTML file: " + error.message;
        showErrorModal = true;
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  function extractUserChanges() {
    if (!currentVersion) return [];

    return currentVersion.tdocs
      .filter((tdoc) => tdoc.userApproval || tdoc.userComments)
      .map((tdoc) => ({
        tdocNumber: tdoc.tdocNumber,
        userApproval: tdoc.userApproval,
        userComments: tdoc.userComments,
      }));
  }

  function switchVersion(version) {
    currentVersion = version;
    selectedRowId = null;
  }

  function handleAgendaJump(item) {
    // Scroll to the first TDoc matching this agenda/topic
    const tableContainer = document.querySelector(".table-container");
    if (!tableContainer) return;

    let targetTdoc = null;

    if (item.type === "agenda") {
      // For main agenda items, extract the actual agenda text (before the first topic)
      const agendaText = item.text.split(" ")[0]; // Get first word which should be agenda number
      targetTdoc = filteredTdocs?.find((t) => {
        const effectiveAgenda = t.inheritedAgenda || t.agenda || "";
        return effectiveAgenda.startsWith(agendaText);
      });
    } else if (item.type === "topic") {
      // For topic items, look for matching agenda and topic
      targetTdoc = filteredTdocs?.find((t) => {
        const effectiveAgenda = t.inheritedAgenda || t.agenda || "";
        const effectiveTopic = t.inheritedTopic || t.topic || "";
        return (
          effectiveAgenda === item.parentAgenda && effectiveTopic === item.text
        );
      });
    }

    if (targetTdoc) {
      const targetRow = tableContainer.querySelector(
        `[data-tdoc-id="${targetTdoc.id}"]`
      );
      if (targetRow) {
        targetRow.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        // Briefly highlight the row
        targetRow.style.backgroundColor = "#fff3cd";
        setTimeout(() => {
          targetRow.style.backgroundColor = "";
        }, 2000);
      }
    }
  }

  function applyApprovalStatus(status) {
    if (!selectedRowId) return;

    const selectedTdoc = currentVersion.tdocs.find(
      (t) => t.id === selectedRowId
    );
    if (!selectedTdoc) return;

    // Check if the action is allowed (same logic as Toolbar)
    const decision = selectedTdoc.decision?.toLowerCase()?.trim();
    // Only allow user actions on "available" and "reserved" decision states
    const allowedStates = ["available", "reserved"];
    if (decision && !allowedStates.includes(decision)) {
      errorMessage = `Cannot apply ${status} to TDoc with decision state: ${selectedTdoc.decision}. Only "available" and "reserved" TDocs can be acted upon.`;
      showErrorModal = true;
      return;
    }

    // If user has already set "revised" or "replied to" approval, block other actions
    // They must clear the approval first before setting a different one
    if (selectedTdoc.userApproval === "revised") {
      errorMessage = `This TDoc has a "revised" approval with a linked child TDoc. Please clear the revised approval first before applying a different action.`;
      showErrorModal = true;
      return;
    }

    if (selectedTdoc.userApproval === "replied to") {
      errorMessage = `This TDoc has a "replied to" approval with a linked LS Out. Please clear the replied to approval first before applying a different action.`;
      showErrorModal = true;
      return;
    }

    const statusText = status.replace("_", " ");

    // Special handling for "revised" - trigger modal for new TDoc creation
    if (statusText === "revised") {
      handleRevision(selectedRowId);
      return;
    }

    currentVersion.tdocs = currentVersion.tdocs.map((tdoc) => {
      if (tdoc.id === selectedRowId) {
        return {
          ...tdoc,
          userApproval: statusText,
          // Keep existing comments unchanged
        };
      }
      return tdoc;
    });

    // Mark as changed and trigger reactivity
    markAsChanged();
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
    if (
      !currentVersion ||
      !currentVersion.tdocs ||
      currentVersion.tdocs.length === 0
    ) {
      return "";
    }

    // Get the first TDoc number to extract the prefix
    const firstTdoc = currentVersion.tdocs[0].tdocNumber;
    if (!firstTdoc) return "";

    // Extract prefix (everything before the last 4 digits)
    // Example: "R5-2356789" -> "R5-235" (user adds "6789")
    const match = firstTdoc.match(/^(.+?)(\d{4})$/);
    if (match) {
      return match[1]; // Return the prefix part
    }

    // Fallback: return first part if pattern doesn't match
    return firstTdoc.slice(0, -4) || firstTdoc;
  }

  function getLsOutPrefix() {
    if (
      !currentVersion ||
      !currentVersion.tdocs ||
      currentVersion.tdocs.length === 0
    ) {
      return "";
    }

    // Get the first TDoc number to extract the prefix for LS Out
    const firstTdoc = currentVersion.tdocs[0].tdocNumber;
    if (!firstTdoc) return "";

    // Extract prefix and suggest LS Out format
    // Example: "R5-2356789" -> "R5-235" (user adds LS Out number)
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
    const existingTdoc = currentVersion.tdocs.find(
      (t) => t.tdocNumber === newTdocNumber
    );
    if (existingTdoc) {
      errorMessage = `TDoc number "${newTdocNumber}" already exists. Please choose a different number.`;
      showErrorModal = true;
      return;
    }

    const parentTdoc = currentVersion.tdocs.find(
      (t) => t.id === pendingRevisionTdocId
    );
    if (!parentTdoc) return;

    // Create new revision entry
    const revisionId = `${newTdocNumber}-${Date.now()}`;
    const revision = {
      ...parentTdoc,
      id: revisionId,
      tdocNumber: newTdocNumber,
      decision: "reserved", // New revision gets "reserved" status (red color)
      isRevision: true,
      parentTdoc: parentTdoc.tdocNumber,
      userApproval: null, // No approval status for new revision
      userComments: "", // Empty comments for new revision
      selected: false,
      originalColorClass: "", // New revision starts without original color
      originalBgColor: "",
      cellColors: null, // Clear any inherited cell colors
      replaces: parentTdoc.tdocNumber, // This revision replaces the parent
      replacesHref: `#${parentTdoc.tdocNumber}`, // Internal link to parent
    };

    // Update parent: set as revised (green) and reference new revision
    currentVersion.tdocs = currentVersion.tdocs.map((tdoc) => {
      if (tdoc.id === pendingRevisionTdocId) {
        return {
          ...tdoc,
          replacedBy: newTdocNumber,
          replacedByHref: `#${newTdocNumber}`, // Internal link to revision
          userApproval: "revised", // Parent becomes revised (green), keep existing comments
        };
      }
      return tdoc;
    });

    // Replaces field already set above

    // Add revision to list (ensure it's inserted in the right place, after the parent)
    const parentIndex = currentVersion.tdocs.findIndex(
      (t) => t.id === pendingRevisionTdocId
    );
    if (parentIndex >= 0) {
      currentVersion.tdocs.splice(parentIndex + 1, 0, revision);
    } else {
      currentVersion.tdocs.push(revision);
    }

    // Reset modal state
    pendingRevisionTdocId = null;
    revisionTdocNumber = "";

    // Trigger reactivity by creating new objects
    currentVersion = {
      ...currentVersion,
      tdocs: [...currentVersion.tdocs],
    };
    versions = [...versions];
  }

  function handleLsReply(tdocId) {
    const targetTdoc = currentVersion.tdocs.find((t) => t.id === tdocId);
    if (!targetTdoc) return;

    // Check if LS is already replied to in the decision column (external state)
    if (targetTdoc.decision?.toLowerCase() === "replied to") {
      errorMessage = `This LS In has already been replied to (Decision: ${targetTdoc.decision}). Cannot create another reply.`;
      showErrorModal = true;
      return;
    }

    pendingLsReplyTdocId = tdocId;
    lsOutNumber = getLsOutPrefix(); // Pre-fill with suggested prefix
    showLsReplyModal = true;
  }

  function confirmLsReply() {
    if (!lsOutNumber || !pendingLsReplyTdocId) return;

    const lsOutNumberTrimmed = lsOutNumber.trim();

    // Check for TDoc number conflicts
    const existingTdoc = currentVersion.tdocs.find(
      (t) => t.tdocNumber === lsOutNumberTrimmed
    );
    if (existingTdoc) {
      errorMessage = `TDoc number "${lsOutNumberTrimmed}" already exists. Please choose a different number.`;
      showErrorModal = true;
      return;
    }

    const parentTdoc = currentVersion.tdocs.find(
      (t) => t.id === pendingLsReplyTdocId
    );
    if (!parentTdoc) return;

    // Create new LS reply entry
    const replyId = `${lsOutNumberTrimmed}-${Date.now()}`;
    const reply = {
      ...parentTdoc,
      id: replyId,
      tdocNumber: lsOutNumberTrimmed,
      title: `Reply to ${parentTdoc.tdocNumber}`,
      type: "LS Out",
      decision: "reserved", // New LS Out starts as reserved (like revisions)
      originalColorClass: "", // Clear original color so decision state color is used
      cellColors: null, // Clear inherited cell colors so decision state color is used
      isRevision: false,
      parentTdoc: parentTdoc.tdocNumber,
      userApproval: null,
      userComments: "",
      selected: false,
    };

    // Update replaces field in reply
    reply.replaces = parentTdoc.tdocNumber;

    // Mark parent LS In with "replied to" user approval (keep decision unchanged)
    currentVersion.tdocs = currentVersion.tdocs.map((tdoc) => {
      if (tdoc.id === pendingLsReplyTdocId) {
        return {
          ...tdoc,
          userApproval: "replied to", // Only modify user approval, not decision
          replacedBy: lsOutNumberTrimmed,
          replacedByHref: `#${lsOutNumberTrimmed}`, // Internal link to reply
        };
      }
      return tdoc;
    });

    // Add reply to list (ensure it's inserted in the right place, after the parent)
    const parentIndex = currentVersion.tdocs.findIndex(
      (t) => t.id === pendingLsReplyTdocId
    );
    if (parentIndex >= 0) {
      currentVersion.tdocs.splice(parentIndex + 1, 0, reply);
    } else {
      currentVersion.tdocs.push(reply);
    }

    // Mark as changed and reset modal state
    markAsChanged();
    pendingLsReplyTdocId = null;
    lsOutNumber = "";

    // Trigger reactivity by creating new objects
    currentVersion = {
      ...currentVersion,
      tdocs: [...currentVersion.tdocs],
    };
    versions = [...versions];
  }

  function updateComments(tdocId, comments) {
    currentVersion.tdocs = currentVersion.tdocs.map((tdoc) => {
      if (tdoc.id === tdocId) {
        return { ...tdoc, userComments: comments };
      }
      return tdoc;
    });

    // Trigger reactivity
    currentVersion = currentVersion;
    versions = versions;
  }

  function clearApproval(tdocId) {
    if (!tdocId) return;

    const targetTdoc = currentVersion.tdocs.find((t) => t.id === tdocId);
    if (!targetTdoc) return;

    // If clearing a "revised" or "replied to" approval, we need to remove the child TDoc and clear replaced-by
    if (
      targetTdoc.userApproval === "revised" ||
      targetTdoc.userApproval === "replied to"
    ) {
      const replacedByTdocNumber = targetTdoc.replacedBy;

      // Remove the child TDoc that was created
      if (replacedByTdocNumber) {
        currentVersion.tdocs = currentVersion.tdocs.filter(
          (tdoc) => tdoc.tdocNumber !== replacedByTdocNumber
        );
      }

      // Clear the parent TDoc's approval and replaced-by reference
      currentVersion.tdocs = currentVersion.tdocs.map((tdoc) => {
        if (tdoc.id === tdocId) {
          return {
            ...tdoc,
            userApproval: null, // Clear the user approval
            replacedBy: "", // Clear the replaced-by reference
            replacedByHref: null, // Clear the href as well
          };
        }
        return tdoc;
      });
    } else {
      // Standard approval clearing for non-revised approvals
      currentVersion.tdocs = currentVersion.tdocs.map((tdoc) => {
        if (tdoc.id === tdocId) {
          return {
            ...tdoc,
            userApproval: null, // Clear the user approval, keeping comments
          };
        }
        return tdoc;
      });
    }

    // Mark as changed and trigger reactivity
    markAsChanged();
    currentVersion = currentVersion;
    versions = versions;
  }

  function deleteVersion(version) {
    pendingDeleteVersion = version;
    showDeleteVersionConfirmModal = true;
  }

  function confirmDeleteVersion() {
    if (!pendingDeleteVersion) return;

    // If this is the only version, clear all data to start fresh
    if (versions.length <= 1) {
      versions = [];
      currentVersion = null;
      selectedRowId = null;
      lastSaveTime = null;
      hasUnsavedChanges = false;

      // Clear localStorage
      localStorage.removeItem("3gpp-tdoc-versions");
      localStorage.removeItem("3gpp-tdoc-lastSave");

      // Clear the pending delete
      pendingDeleteVersion = null;
      showDeleteVersionConfirmModal = false;

      return;
    }

    // Remove the version from the list
    versions = versions.filter((v) => v.id !== pendingDeleteVersion.id);

    // If we deleted the current version, switch to another one
    if (currentVersion?.id === pendingDeleteVersion.id) {
      currentVersion = versions[0] || null;
      selectedRowId = null;
    }

    // Clear the pending delete
    pendingDeleteVersion = null;

    // Mark as changed and save
    markAsChanged();
    saveState();
  }

  function handleFilterChange(filter) {
    currentFilter = filter;
    markAsChanged();
  }

  function toggleSidebar() {
    sidebarVisible = !sidebarVisible;
  }

  // Reactive statement to filter TDocs with proper agenda/topic inheritance
  $: filteredTdocs = (() => {
    if (!currentVersion?.tdocs || currentVersion.tdocs.length === 0) return [];

    // First, ensure all TDocs have proper agenda/topic inheritance from the original sequence
    let currentAgenda = "";
    let currentTopic = "";

    const enrichedTdocs = currentVersion.tdocs.map((tdoc) => {
      // Update context when we encounter actual agenda/topic values
      if (tdoc.agenda && tdoc.agenda.trim() !== "") {
        currentAgenda = tdoc.agenda.trim();
      }
      if (tdoc.topic && tdoc.topic.trim() !== "") {
        currentTopic = tdoc.topic.trim();
      }

      return {
        ...tdoc,
        inheritedAgenda: currentAgenda,
        inheritedTopic: currentTopic,
      };
    });

    // Apply filter to enriched TDocs - preserve original order
    return enrichedTdocs.filter((tdoc) => {
      switch (currentFilter) {
        case "all":
          return true;
        case "available":
          return tdoc.decision?.toLowerCase() === "available";
        case "reserved":
          return tdoc.decision?.toLowerCase() === "reserved";
        case "approved":
          return tdoc.decision?.toLowerCase() === "approved";
        case "revised":
          return tdoc.decision?.toLowerCase() === "revised";
        case "postponed":
          return tdoc.decision?.toLowerCase() === "postponed";
        case "withdrawn":
          return tdoc.decision?.toLowerCase() === "withdrawn";
        case "has-approval":
          return tdoc.userApproval && tdoc.userApproval.trim() !== "";
        case "no-approval":
          return !tdoc.userApproval || tdoc.userApproval.trim() === "";
        default:
          return true;
      }
    });
  })();

  function reloadApp() {
    showReloadConfirmModal = true;
  }

  function confirmReloadApp() {
    window.location.reload();
  }

  async function exportHtml() {
    if (!currentVersion) {
      errorMessage = "No data to export";
      showErrorModal = true;
      return;
    }

    const htmlContent = generateHtmlExport(currentVersion);
    const suggestedName = `TDoc_Export_${formatDateForFilename(new Date())}.html`;

    // Try to use modern File System Access API
    if ("showSaveFilePicker" in window) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: "HTML files",
              accept: { "text/html": [".html"] },
            },
          ],
        });

        const writable = await fileHandle.createWritable();
        await writable.write(htmlContent);
        await writable.close();
        return;
      } catch (err) {
        if (err.name === "AbortError") {
          return; // User cancelled
        }
        console.error("Save failed:", err);
      }
    }

    // Fallback to traditional download
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function formatDateForFilename(date) {
    return date.toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "h");
  }

  function generateHtmlExport(version) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
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
    version.tdocs.forEach((tdoc) => {
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
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor("tdoc")}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${tdoc.tdocHref ? `<a name="${escapeHtml(tdoc.tdocNumber)}" target="_blank" href="${tdoc.tdocHref}">${escapeHtml(tdoc.tdocNumber)}</a>` : escapeHtml(tdoc.tdocNumber)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor("title")}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.title)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor("source")}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.source)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor("type")}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.type)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor("for")}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.for)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor("avail")}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.avail)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor("treated")}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${tdoc.treatedTooltip ? `<div class="tooltip">${escapeHtml(tdoc.treated)}<span class="tooltiptext">${escapeHtml(tdoc.treatedTooltip)}</span></div>` : escapeHtml(tdoc.treated)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor("decision")}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.decision)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor("decision")}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${generateApprovalCommentsCell(tdoc)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor("wdrn")}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${escapeHtml(tdoc.wdrn)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor("replacedBy")}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
${tdoc.replacedByHref ? `<a href="${tdoc.replacedByHref}">${escapeHtml(tdoc.replacedBy)}</a>` : escapeHtml(tdoc.replacedBy)}
</FONT></TH>
<TD BORDERCOLOR=#000000 BGCOLOR=${getCellColor("replaces")}><FONT style=FONT-SIZE:8pt FACE="Arial" COLOR=#000000>
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
    if (userApproval && userApproval.trim() !== "") {
      const approvalColors = {
        approved: "#99FF33",
        agreed: "#99FF33",
        noted: "#99FF33",
        revised: "#99FF33",
        "replied to": "#99FF33",
        postponed: "#99FF33",
        "not pursued": "#99FF33",
      };
      return approvalColors[userApproval.toLowerCase().trim()] || "#FFFFFF";
    }

    // If there's an original cell color and no user approval, use it
    if (cellColor) {
      return cellColor;
    }

    // Otherwise use decision state colors
    const decisionColors = {
      approved: "#99FF33",
      revised: "#99FF33",
      merged: "#99FF33",
      "replied to": "#99FF33",
      "not pursued": "#99FF33",
      postponed: "#99FF33",
      available: "#FFFF99",
      reserved: "#FF8566",
    };

    return decisionColors[decision?.toLowerCase()] || "#FFFFFF";
  }

  function generateApprovalCommentsCell(tdoc) {
    const approval = tdoc.userApproval || "";
    const comments = tdoc.userComments || "";

    if (approval && comments) {
      return `<div class="tooltip">${escapeHtml(approval)}<span class="tooltiptext">${escapeHtml(comments)}</span></div>`;
    } else if (approval) {
      return escapeHtml(approval);
    } else if (comments) {
      return escapeHtml(comments);
    } else {
      return "&nbsp;";
    }
  }

  function escapeHtml(text) {
    if (!text) return "&nbsp;";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#8217;") // Right single quotation mark
      .replace(/'/g, "&#8216;") // Left single quotation mark
      .replace(/"/g, "&#8220;") // Left double quotation mark
      .replace(/"/g, "&#8221;") // Right double quotation mark
      .replace(/–/g, "&#8211;") // En dash
      .replace(/—/g, "&#8212;") // Em dash
      .replace(/‑/g, "&#8209;") // Non-breaking hyphen
      .replace(/…/g, "&#8230;") // Horizontal ellipsis
      .replace(/�/g, "&#8217;"); // Fix replacement character to apostrophe
  }
</script>

<svelte:window
  on:keydown={handleGlobalKeydown}
  on:beforeunload={handleBeforeUnload}
/>

<div class="app-container">
  <div class="main-content">
    <Toolbar
      {selectedRowId}
      currentTdoc={selectedRowId
        ? currentVersion?.tdocs?.find((t) => t.id === selectedRowId)
        : null}
      onApprovalClick={applyApprovalStatus}
      onFileUpload={handleFileUpload}
      onRevision={handleRevision}
      onLsReply={handleLsReply}
      onClearApproval={clearApproval}
      onFilterChange={handleFilterChange}
      onToggleSidebar={toggleSidebar}
      {currentFilter}
      bind:fileInput
    />

    {#if currentVersion}
      <TdocTable
        tdocs={filteredTdocs}
        {selectedRowId}
        onRowSelect={handleRowSelection}
        onCommentsUpdate={updateComments}
      />
    {:else}
      <div class="table-container">
        <div
          style="display: flex; align-items: center; justify-content: center; height: 100%; padding: 40px;"
        >
          <div style="text-align: center; color: #666; font-size: 16px;">
            <h3 style="margin-bottom: 16px; color: #333;">
              Welcome to 3GPP TDoc Tracker
            </h3>
            <p style="margin-bottom: 8px;">
              No data loaded. Please upload an HTML file to get started.
            </p>
            <p style="font-size: 14px; color: #999;">
              Upload a 3GPP HTML agenda file to begin tracking TDoc approvals.
            </p>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Mobile overlay -->
  {#if sidebarVisible}
    <div class="sidebar-overlay" on:click={toggleSidebar}></div>
  {/if}

  <div class="sidebar {sidebarVisible ? 'visible' : ''}">
    <VersionSidebar
      {versions}
      {currentVersion}
      {filteredTdocs}
      onVersionSelect={switchVersion}
      onAgendaJump={handleAgendaJump}
      onSave={saveState}
      onExportHtml={exportHtml}
      onDeleteVersion={deleteVersion}
      {hasUnsavedChanges}
    />
  </div>
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
      Enter the full TDoc number or edit the prefilled prefix and add the
      remaining 4 digits.
    </p>
  </div>
</Modal>

<Modal
  bind:isOpen={showLsReplyModal}
  title="Reply to LS In"
  onConfirm={confirmLsReply}
  confirmText="Create Reply"
>
  <div>
    <label for="ls-out-input">LS Out Number:</label>
    <input
      id="ls-out-input"
      type="text"
      class="modal-input"
      bind:value={lsOutNumber}
      placeholder="Enter LS Out number..."
    />
    <p style="font-size: 12px; color: #666; margin-top: 8px;">
      Enter the full LS Out number or edit the prefilled prefix and add the
      remaining digits.
    </p>
  </div>
</Modal>

<Modal
  bind:isOpen={showDeleteVersionConfirmModal}
  title={versions.length <= 1 ? "Delete Data" : "Delete Version"}
  onConfirm={confirmDeleteVersion}
  confirmText="Delete"
  showCancel={true}
>
  {#if versions.length <= 1}
    Are you sure you want to delete all current data? This will remove all
    versions and allow you to start fresh with a new agenda. This cannot be
    undone.
  {:else}
    Are you sure you want to delete version v{pendingDeleteVersion
      ? versions.indexOf(pendingDeleteVersion) + 1
      : 1}? This cannot be undone.
  {/if}
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
