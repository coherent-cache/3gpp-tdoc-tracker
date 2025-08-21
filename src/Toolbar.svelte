<script>
  export let selectedRowId;
  export let onApprovalClick;
  export let onFileUpload;
  export let onRevision;
  export let onLsReply;
  export let onClearApproval;
  export let onFilterChange;
  export let currentTdoc = null;
  export let fileInput;
  export let currentFilter = "all";
  export let onToggleSidebar = null;

  const approvalButtons = [
    { key: "approved", label: "Approve", class: "btn-approved" },
    { key: "agreed", label: "Agree", class: "btn-agreed" },
    { key: "noted", label: "Note", class: "btn-noted" },
    { key: "revised", label: "Revise", class: "btn-revised" },
    { key: "postponed", label: "Postpone", class: "btn-postponed" },
    { key: "not_pursued", label: "Not Pursue", class: "btn-not-pursued" },
  ];

  function handleApprovalClick(status) {
    if (status === "revised") {
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

    // Only allow user actions on "available" and "reserved" decision states
    // All other decision states are blocked per decision-states-diagram.md
    const allowedStates = ["available", "reserved"];
    if (!allowedStates.includes(normalizedDecision)) {
      return false;
    }

    // If user has already set "revised" or "replied to" approval, block other actions
    // They must clear the approval first before setting a different one
    if (
      currentTdoc.userApproval === "revised" ||
      currentTdoc.userApproval === "replied to"
    ) {
      return false;
    }

    return true;
  })();

  function triggerFileUpload() {
    fileInput?.click();
  }

  function handleFilterChange(filterValue) {
    onFilterChange(filterValue);
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

  <!-- Main Action Row -->
  <div class="action-row">
    <div class="action-left">
      <button class="btn" on:click={triggerFileUpload}> Load HTML </button>

      <div class="separator"></div>

      {#each approvalButtons as button}
        <button
          class="btn {button.class}"
          disabled={!actionsAllowed}
          on:click={() => handleApprovalClick(button.key)}
        >
          {button.label}
        </button>
      {/each}

      {#if currentTdoc && currentTdoc.type
          .toLowerCase()
          .includes("ls in") && actionsAllowed && !currentTdoc.userApproval && currentTdoc.decision?.toLowerCase() !== "replied to"}
        <button
          class="btn"
          disabled={!selectedRowId}
          on:click={() => onLsReply(selectedRowId)}
          title="Reply to LS In with LS Out"
        >
          Reply LS
        </button>
      {/if}

      {#if currentTdoc && currentTdoc.userApproval}
        <button
          class="btn"
          disabled={!selectedRowId}
          on:click={() => onClearApproval(selectedRowId)}
          title="Clear user approval and revert to original decision state"
        >
          Clear
        </button>
      {/if}
    </div>

    {#if onToggleSidebar}
      <button
        class="btn hamburger-btn"
        on:click={onToggleSidebar}
        title="Toggle sidebar"
      >
        ☰
      </button>
    {/if}
  </div>

  <!-- Filter Row -->
  <div class="filter-row">
    <!-- Decision Column Filters -->
    <div class="filter-group">
      <span class="filter-label">Decision:</span>
      <button
        class="btn filter-btn {currentFilter === 'all' ? 'active' : ''}"
        on:click={() => handleFilterChange("all")}>All</button
      >
      <button
        class="btn filter-btn {currentFilter === 'available' ? 'active' : ''}"
        on:click={() => handleFilterChange("available")}>🟡 Available</button
      >
      <button
        class="btn filter-btn {currentFilter === 'reserved' ? 'active' : ''}"
        on:click={() => handleFilterChange("reserved")}>🔴 Reserved</button
      >
      <button
        class="btn filter-btn {currentFilter === 'approved' ? 'active' : ''}"
        on:click={() => handleFilterChange("approved")}>🟢 Approved</button
      >
      <button
        class="btn filter-btn {currentFilter === 'revised' ? 'active' : ''}"
        on:click={() => handleFilterChange("revised")}>🟢 Revised</button
      >
      <button
        class="btn filter-btn {currentFilter === 'postponed' ? 'active' : ''}"
        on:click={() => handleFilterChange("postponed")}>🟡 Postponed</button
      >
      <button
        class="btn filter-btn {currentFilter === 'withdrawn' ? 'active' : ''}"
        on:click={() => handleFilterChange("withdrawn")}>⚫ Withdrawn</button
      >
    </div>

    <!-- My Approval Column Filters -->
    <div class="filter-group">
      <span class="filter-label">My Approval:</span>
      <button
        class="btn filter-btn {currentFilter === 'has-approval'
          ? 'active'
          : ''}"
        on:click={() => handleFilterChange("has-approval")}
        >✓ Has Approval</button
      >
      <button
        class="btn filter-btn {currentFilter === 'no-approval' ? 'active' : ''}"
        on:click={() => handleFilterChange("no-approval")}>✗ No Approval</button
      >
    </div>
  </div>
</div>
