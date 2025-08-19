<script>
  export let versions;
  export let currentVersion;
  export let onVersionSelect;

  function handleVersionClick(version) {
    onVersionSelect(version);
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
</script>

<div class="sidebar">
  <div style="padding: 12px; border-bottom: 1px solid var(--border-color);">
    <h3 style="margin: 0; font-size: 14px; color: var(--text-color);">Versions</h3>
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
</div>