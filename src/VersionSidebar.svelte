<script>
  export let versions;
  export let currentVersion;
  export let filteredTdocs = [];
  export let onVersionSelect;
  export let onAgendaJump = null;
  export let onSave = null;
  export let onExportHtml = null;
  export let onDeleteVersion = null;
  export let hasUnsavedChanges = false;

  let showSavedFeedback = false;

  function handleVersionClick(version) {
    onVersionSelect(version);
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  function extractAgendaOutline(tdocs) {
    if (!tdocs || tdocs.length === 0) return [];

    const agendaMap = new Map();
    const seen = new Set();

    tdocs.forEach((tdoc) => {
      if (tdoc.agenda && tdoc.agenda.trim() !== "") {
        const agendaKey = tdoc.agenda.trim();

        // Initialize agenda item if not seen
        if (!agendaMap.has(agendaKey)) {
          agendaMap.set(agendaKey, {
            type: "agenda",
            text: agendaKey,
            id: `agenda-${agendaKey}`,
            count: 0,
            approvedCount: 0,
            topics: new Map(),
          });
        }

        const agendaItem = agendaMap.get(agendaKey);
        agendaItem.count++;
        if (tdoc.userApproval || tdoc.decision === "approved") {
          agendaItem.approvedCount++;
        }

        // Handle topics within agenda
        if (tdoc.topic && tdoc.topic.trim() !== "") {
          const topicKey = tdoc.topic.trim();

          if (!agendaItem.topics.has(topicKey)) {
            agendaItem.topics.set(topicKey, {
              type: "topic",
              text: topicKey,
              id: `topic-${agendaKey}-${topicKey}`,
              agenda: agendaKey,
              count: 0,
              approvedCount: 0,
            });
          }

          const topicItem = agendaItem.topics.get(topicKey);
          topicItem.count++;
          if (tdoc.userApproval || tdoc.decision === "approved") {
            topicItem.approvedCount++;
          }
        }
      }
    });

    // Convert to flat outline with proper hierarchy
    const outline = [];
    agendaMap.forEach((agendaItem) => {
      // Add main agenda item (combine agenda number + first topic if exists)
      const firstTopic = Array.from(agendaItem.topics.values())[0];
      const displayText = firstTopic
        ? `${agendaItem.text} ${firstTopic.text}`
        : agendaItem.text;

      outline.push({
        ...agendaItem,
        text: displayText,
        isMainItem: true,
      });

      // Add sub-topics if there are multiple topics
      if (agendaItem.topics.size > 1) {
        Array.from(agendaItem.topics.values())
          .slice(1)
          .forEach((topic) => {
            outline.push({
              ...topic,
              isSubTopic: true,
              parentAgenda: agendaItem.text,
            });
          });
      }
    });

    return outline;
  }

  function handleAgendaClick(item) {
    if (onAgendaJump) {
      onAgendaJump(item);
    }
  }

  function handleSaveClick() {
    if (onSave) {
      onSave();
      showSavedFeedback = true;
      setTimeout(() => {
        showSavedFeedback = false;
      }, 1500);
    }
  }

  $: agendaOutline =
    filteredTdocs.length > 0 ? extractAgendaOutline(filteredTdocs) : [];
</script>

<div
  class="sidebar-content"
  style="display: flex; flex-direction: column; height: 100%;"
>
  <div class="versions-header">
    <h3 style="margin: 0; font-size: 14px; color: var(--text-color);">
      Versions
    </h3>
    {#if onDeleteVersion && currentVersion}
      <button
        class="delete-btn btn-danger"
        on:click={() => onDeleteVersion(currentVersion)}
        title={versions.length <= 1
          ? "Delete current data to start fresh"
          : `Delete version v${versions.indexOf(currentVersion) + 1}`}
      >
        Delete
      </button>
    {/if}
  </div>

  <!-- Save and Export Section -->
  <div class="utility-section">
    {#if onSave}
      <button
        class="sidebar-btn btn-save {hasUnsavedChanges
          ? 'btn-save-needed'
          : versions.length > 0
            ? 'btn-save-clean'
            : 'btn-save-disabled'} {showSavedFeedback
          ? 'btn-save-feedback'
          : ''}"
        on:click={handleSaveClick}
        disabled={versions.length === 0}
        title={versions.length === 0
          ? "No data to save"
          : hasUnsavedChanges
            ? "Save changes"
            : "All changes saved"}
      >
        {showSavedFeedback
          ? "✓ Saved!"
          : versions.length === 0
            ? "💾 No Data"
            : hasUnsavedChanges
              ? "💾 Save"
              : "✓ Saved"}
      </button>
    {/if}

    {#if onExportHtml}
      <button
        class="sidebar-btn {versions.length === 0 ? 'btn-save-disabled' : ''}"
        on:click={onExportHtml}
        disabled={versions.length === 0}
        title={versions.length === 0
          ? "No data to export"
          : "Export current version as HTML"}
      >
        📄 {versions.length === 0 ? "No Data" : "Export HTML"}
      </button>
    {/if}
  </div>

  {#if versions.length === 0}
    <div style="padding: 12px; color: #666; font-size: 12px;">
      No versions loaded yet
    </div>
  {:else}
    {#each versions as version (version.id)}
      <div
        class="version-item {currentVersion?.id === version.id ? 'active' : ''}"
        on:click={() => handleVersionClick(version)}
      >
        <div>
          <div class="version-name">v{versions.indexOf(version) + 1}</div>
          <div class="version-date">{formatDate(version.timestamp)}</div>
          {#if version.originalDate}
            <div class="version-date">Original: {version.originalDate}</div>
          {/if}
        </div>
        <div style="font-size: 11px; opacity: 0.7;">
          {version.tdocs.length} entries
        </div>
      </div>
    {/each}
  {/if}

  {#if currentVersion && agendaOutline.length > 0}
    <div
      style="padding: 12px; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);"
    >
      <h3 style="margin: 0; font-size: 14px; color: var(--text-color);">
        Agenda Outline
      </h3>
    </div>

    <div class="agenda-outline">
      {#each agendaOutline as item (item.id)}
        <div
          class="agenda-item"
          class:main-item={item.isMainItem}
          class:sub-topic={item.isSubTopic}
          on:click={() => handleAgendaClick(item)}
          on:keydown={(e) => e.key === "Enter" && handleAgendaClick(item)}
          tabindex="0"
          role="button"
        >
          <div class="agenda-text">
            {item.text}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .versions-header {
    padding: 12px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .delete-btn {
    padding: 4px 8px;
    border: 1px solid #dc3545;
    border-radius: 4px;
    background: #dc3545;
    color: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }

  .delete-btn:hover:not(:disabled) {
    background-color: #c82333;
  }

  .delete-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .utility-section {
    padding: 12px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* When sidebar is wide enough, arrange buttons in a row */
  @media (min-width: 1200px) {
    .utility-section {
      flex-direction: row;
    }

    .sidebar-btn {
      flex: 1;
      min-width: 0;
    }
  }

  .sidebar-btn {
    padding: 8px 12px; /* Increased to match action buttons */
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    text-align: left;
    min-height: 38px; /* Match action button height */
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar-btn:hover {
    background-color: #f0f0f0;
  }

  .btn-save-needed {
    background-color: #007bff;
    color: white;
    border-color: #007bff;
    animation: pulse 2s infinite;
  }

  .btn-save-clean {
    background-color: #28a745;
    color: white;
    border-color: #28a745;
  }

  .btn-save-disabled {
    background-color: #6c757d;
    color: white;
    border-color: #6c757d;
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-save-feedback {
    background-color: #20c997 !important;
    color: white !important;
    border-color: #20c997 !important;
    animation: saveSuccess 1.5s ease-out;
  }

  .btn-danger {
    background-color: #dc3545;
    color: white;
    border-color: #dc3545;
  }

  .btn-danger:hover {
    background-color: #c82333;
  }

  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
    100% {
      opacity: 1;
    }
  }

  @keyframes saveSuccess {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(32, 201, 151, 0.7);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 0 8px rgba(32, 201, 151, 0.3);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(32, 201, 151, 0);
    }
  }

  .agenda-outline {
    flex: 1;
    overflow-y: auto;
    border: 1px solid rgba(222, 226, 230, 0.6);
    border-radius: 4px;
    margin: 0 12px 12px 12px;
  }

  .agenda-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 12px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.2s;
  }

  .agenda-item:hover {
    background-color: #f8f9fa;
  }

  .agenda-item.main-item {
    font-weight: 600;
    color: #333;
    font-size: 13px;
    border-bottom: 1px solid #e9ecef;
  }

  .agenda-item.sub-topic {
    color: #666;
    font-size: 11px;
    font-weight: 400;
    padding-left: 24px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #f0f0f0;
  }

  .agenda-text {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
