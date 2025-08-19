<script>
  export let selectedRowId;
  export let onApprovalClick;
  export let onFileUpload;
  export let onClearVersions;
  export let onExportHtml;
  export let onRevision;
  export let onLsReply;
  export let currentTdoc = null;
  export let fileInput;

  const approvalButtons = [
    { key: 'approved', label: 'Approve', class: 'btn-approved' },
    { key: 'noted', label: 'Note', class: 'btn-noted' },
    { key: 'revised', label: 'Revise', class: 'btn-revised' },
    { key: 'postponed', label: 'Postpone', class: 'btn-postponed' },
    { key: 'not_pursued', label: 'Not Pursue', class: 'btn-not-pursued' }
  ];

  function handleApprovalClick(status) {
    if (status === 'revised') {
      onRevision(selectedRowId);
    } else {
      onApprovalClick(status);
    }
  }
  
  // Reactive statement to compute if actions are allowed
  $: actionsAllowed = (() => {
    // Must have a selected row and current TDoc
    if (!selectedRowId || !currentTdoc) {
      return false;
    }
    
    // Get the ORIGINAL decision state (not user approval)
    const decision = currentTdoc.decision;
    if (!decision) {
      // If no original decision state, allow actions (for new entries)
      return true;
    }
    
    const normalizedDecision = decision.toLowerCase().trim();
    
    // Block these ORIGINAL decision states from further actions
    // User approvals should not block further actions
    const blockedStates = ['withdrawn', 'merged', 'replied to'];
    return !blockedStates.includes(normalizedDecision);
  })();

  function triggerFileUpload() {
    fileInput?.click();
  }
</script>

<div class="toolbar">
  <input 
    type="file" 
    accept=".html,.htm" 
    bind:this={fileInput} 
    on:change={onFileUpload}
    style="display: none;"
  />
  
  <button class="btn" on:click={triggerFileUpload}>
    Load HTML
  </button>
  
  <div class="separator" style="width: 1px; height: 20px; background: #ddd; margin: 0 8px;"></div>
  
  {#each approvalButtons as button}
    <button 
      class="btn {button.class}" 
      disabled={!actionsAllowed}
      on:click={() => handleApprovalClick(button.key)}
    >
      {button.label}
    </button>
  {/each}
  
  {#if currentTdoc && currentTdoc.type.toLowerCase().includes('ls in')}
    <button 
      class="btn" 
      disabled={!selectedRowId}
      on:click={() => onLsReply(selectedRowId)}
      title="Reply to LS In with LS Out"
    >
      Reply LS
    </button>
  {/if}
  
  <div class="separator" style="width: 1px; height: 20px; background: #ddd; margin: 0 8px;"></div>
  
  <button class="btn" on:click={onExportHtml} title="Export current version as HTML">
    Export HTML
  </button>
  
  <button class="btn" on:click={onClearVersions} title="Clear all saved versions">
    Clear Versions
  </button>
</div>