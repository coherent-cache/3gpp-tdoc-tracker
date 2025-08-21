<script>
  import { onMount, afterUpdate } from "svelte";

  export let tdocs;
  export let selectedRowId;
  export let onRowSelect;
  export let onCommentsUpdate;

  let tableHeaderElement;
  let headerHeight = 35; // default fallback
  let activeTooltip = null; // Track which tooltip is currently showing
  let tooltipPosition = { x: 0, y: 0 }; // Track tooltip position

  function handleRowClick(tdoc) {
    onRowSelect(tdoc.id);
  }

  function handleCommentsBlur(event, tdocId) {
    const comments = event.target.textContent;
    onCommentsUpdate(tdocId, comments);
  }

  function toggleTooltip(tdocId, event) {
    event.stopPropagation();
    if (activeTooltip === tdocId) {
      activeTooltip = null;
    } else {
      activeTooltip = tdocId;
      // Update position when opening
      updateTooltipPosition(event.target);
    }
  }

  function updateTooltipPosition(iconElement) {
    if (!iconElement) return;
    const iconRect = iconElement.getBoundingClientRect();
    tooltipPosition = {
      x: iconRect.right + 10,
      y: Math.max(iconRect.top - 10, 60), // Ensure it's below sticky headers
    };
  }

  // Update tooltip position on scroll
  function handleScroll() {
    if (activeTooltip) {
      const activeIcon = document.querySelector(
        `[data-tooltip-id="${activeTooltip}"] .comment-icon`
      );
      if (activeIcon) {
        updateTooltipPosition(activeIcon);
      }
    }
  }

  function closeTooltip() {
    activeTooltip = null;
  }

  function handleLinkClick(event, href) {
    event.stopPropagation();

    // If it's an internal link (starts with #), scroll to the target instead of opening new tab
    if (href && href.startsWith("#")) {
      event.preventDefault();
      const targetId = href.substring(1); // Remove the # symbol
      const targetElement = document.querySelector(
        `[data-tdoc-id*="${targetId}"]`
      );

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        // Briefly highlight the target row
        targetElement.style.backgroundColor = "#fff3cd";
        setTimeout(() => {
          targetElement.style.backgroundColor = "";
        }, 2000);
      }
    }
    // For external links, let the default behavior happen (open in new tab)
  }

  function getDecisionStateColor(decision, userApproval) {
    // Map decision states to original HTML colors
    const stateColors = {
      // Green states (#99FF33)
      approved: "#99FF33",
      revised: "#99FF33",
      merged: "#99FF33",
      "replied to": "#99FF33",
      "not pursued": "#99FF33",
      postponed: "#99FF33",

      // Yellow states (#FFFF99)
      available: "#FFFF99",

      // Red/Orange states (#FF8566)
      reserved: "#FF8566",

      // Default white
      default: "#FFFFFF",
    };

    // If user has made an approval decision, use that to determine color
    if (userApproval && userApproval.trim() !== "") {
      const approvalStates = {
        approved: "#99FF33",
        agreed: "#99FF33",
        noted: "#99FF33",
        revised: "#99FF33",
        "replied to": "#99FF33",
        postponed: "#99FF33",
        "not pursued": "#99FF33",
      };
      const normalizedApproval = userApproval.toLowerCase().trim();
      return approvalStates[normalizedApproval] || stateColors["default"];
    }

    // Otherwise use the decision state
    return stateColors[decision?.toLowerCase()] || stateColors["default"];
  }

  function darkenColor(hexColor, factor = 0.8) {
    // Convert hex to RGB
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Darken by multiplying by factor
    const newR = Math.floor(r * factor);
    const newG = Math.floor(g * factor);
    const newB = Math.floor(b * factor);

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
  }

  function getRowClass(tdoc) {
    let classes = [];

    // Add original color class from HTML if no user decision
    if (tdoc.originalColorClass && !tdoc.userApproval) {
      classes.push(tdoc.originalColorClass);
    }

    // Add selection class (should come last to have highest precedence)
    if (selectedRowId === tdoc.id) {
      classes.push("selected");
    }

    return classes.join(" ");
  }

  // Group tdocs by agenda and topic - enhanced logic to handle filtered data properly
  function groupTdocs(tdocs) {
    if (!tdocs || tdocs.length === 0) return [];

    const groups = [];
    let currentAgenda = "";
    let currentTopic = "";
    let currentGroup = null;
    let groupIndex = 0;

    // First pass: determine the agenda/topic context for each TDoc by looking at their inherited values
    const enrichedTdocs = tdocs.map((tdoc) => {
      // Use inherited values if they exist (from the original unfiltered context)
      const agenda = tdoc.inheritedAgenda || tdoc.agenda || "";
      const topic = tdoc.inheritedTopic || tdoc.topic || "";

      return {
        ...tdoc,
        effectiveAgenda: agenda.trim(),
        effectiveTopic: topic.trim(),
      };
    });

    for (const tdoc of enrichedTdocs) {
      const { effectiveAgenda, effectiveTopic } = tdoc;

      // Check if we need a new group
      const agendaChanged = effectiveAgenda !== currentAgenda;
      const topicChanged = effectiveTopic !== currentTopic;
      const needNewGroup = agendaChanged || topicChanged || !currentGroup;

      if (needNewGroup) {
        currentAgenda = effectiveAgenda;
        currentTopic = effectiveTopic;

        const groupKey = `${currentAgenda}-${currentTopic}`;
        currentGroup = {
          key: `${groupKey}-${groupIndex}`,
          agenda: currentAgenda || "No Agenda",
          topic: currentTopic || "No Topic",
          tdocs: [],
        };
        groups.push(currentGroup);
        groupIndex++;
      }

      // Add current tdoc to the group
      currentGroup.tdocs.push({
        ...tdoc,
        inheritedAgenda: currentAgenda,
        inheritedTopic: currentTopic,
      });
    }

    return groups;
  }

  $: groupedTdocs = tdocs && tdocs.length > 0 ? groupTdocs(tdocs) : [];

  function updateHeaderHeight() {
    if (tableHeaderElement) {
      const rect = tableHeaderElement.getBoundingClientRect();
      headerHeight = Math.ceil(rect.height);
    }
  }

  onMount(() => {
    updateHeaderHeight();
  });

  afterUpdate(() => {
    updateHeaderHeight();
  });

  // Close tooltip when clicking outside
  function handleDocumentClick(event) {
    if (!event.target.closest(".treated-cell")) {
      activeTooltip = null;
    }
  }

  // Listen for scroll events to update tooltip position
  onMount(() => {
    const tableContainer = document.querySelector(".table-container");
    if (tableContainer) {
      tableContainer.addEventListener("scroll", handleScroll);
      return () => tableContainer.removeEventListener("scroll", handleScroll);
    }
  });
</script>

<svelte:window on:click={handleDocumentClick} />

<div class="table-container">
  <table class="data-table">
    <thead bind:this={tableHeaderElement}>
      <tr>
        <th>TDoc</th>
        <th>Title</th>
        <th>Source</th>
        <th>Type</th>
        <th>For</th>
        <th>Avail</th>
        <th>Treated</th>
        <th>Decision</th>
        <th>My Approval</th>
        <th>My Comments</th>
        <th>Wdrn</th>
        <th>Replaced-by</th>
        <th>Replaces</th>
      </tr>
    </thead>
    <tbody>
      {#if groupedTdocs && groupedTdocs.length > 0}
        {#each groupedTdocs as group (group.key)}
          <tr class="section-header" style="top: {headerHeight}px;">
            <td colspan="13">
              <strong
                >{group.agenda || "No Agenda"} - {group.topic ||
                  "No Topic"}</strong
              >
            </td>
          </tr>
          {#each group.tdocs as tdoc (tdoc.id)}
            <tr
              class={getRowClass(tdoc)}
              class:row-selected={selectedRowId === tdoc.id}
              on:click={() => handleRowClick(tdoc)}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === "Enter" && handleRowClick(tdoc)}
              data-tdoc-id={tdoc.id}
            >
              <td
                style="background-color: {tdoc.userApproval
                  ? getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                  : tdoc.cellColors?.tdoc ||
                    getDecisionStateColor(tdoc.decision, tdoc.userApproval)};"
              >
                {#if tdoc.tdocHref}
                  <a
                    href={tdoc.tdocHref}
                    target={tdoc.tdocHref.startsWith("#") ? "_self" : "_blank"}
                    on:click={(e) => handleLinkClick(e, tdoc.tdocHref)}
                  >
                    {tdoc.tdocNumber}
                  </a>
                {:else}
                  {tdoc.tdocNumber}
                {/if}
              </td>
              <td
                style="background-color: {tdoc.userApproval
                  ? getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                  : tdoc.cellColors?.title ||
                    getDecisionStateColor(tdoc.decision, tdoc.userApproval)};"
                >{tdoc.title}</td
              >
              <td
                style="background-color: {tdoc.userApproval
                  ? getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                  : tdoc.cellColors?.source ||
                    getDecisionStateColor(tdoc.decision, tdoc.userApproval)};"
                >{tdoc.source}</td
              >
              <td
                style="background-color: {tdoc.userApproval
                  ? getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                  : tdoc.cellColors?.type ||
                    getDecisionStateColor(tdoc.decision, tdoc.userApproval)};"
                >{tdoc.type}</td
              >
              <td
                style="background-color: {tdoc.userApproval
                  ? getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                  : tdoc.cellColors?.for ||
                    getDecisionStateColor(tdoc.decision, tdoc.userApproval)};"
                >{tdoc.for}</td
              >
              <td
                style="background-color: {tdoc.userApproval
                  ? getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                  : tdoc.cellColors?.avail ||
                    getDecisionStateColor(tdoc.decision, tdoc.userApproval)};"
                >{tdoc.avail}</td
              >
              <td
                style="background-color: {tdoc.userApproval
                  ? getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                  : tdoc.cellColors?.treated ||
                    getDecisionStateColor(tdoc.decision, tdoc.userApproval)};"
                class="treated-cell"
                data-tooltip-id={tdoc.id}
              >
                {#if tdoc.treatedTooltip}
                  <div class="treated-content">
                    <span>{tdoc.treated}</span>
                    <button
                      class="comment-icon"
                      on:click={(e) => toggleTooltip(tdoc.id, e)}
                      title="Click to view comments"
                    >
                      💬
                    </button>
                    {#if activeTooltip === tdoc.id}
                      <div
                        class="floating-tooltip"
                        style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px;"
                      >
                        <div class="tooltip-content">
                          {tdoc.treatedTooltip}
                        </div>
                        <button class="tooltip-close" on:click={closeTooltip}
                          >×</button
                        >
                      </div>
                    {/if}
                  </div>
                {:else}
                  {tdoc.treated}
                {/if}
              </td>
              <td
                style="background-color: {tdoc.userApproval
                  ? getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                  : tdoc.cellColors?.decision ||
                    getDecisionStateColor(tdoc.decision, tdoc.userApproval)};"
                >{tdoc.decision}</td
              >
              <td
                class="my-approval-cell"
                style="background-color: {darkenColor(
                  tdoc.userApproval
                    ? getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                    : tdoc.cellColors?.decision ||
                        getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                )};"
              >
                {tdoc.userApproval || ""}
              </td>
              <td
                class="editable-cell my-comments-cell"
                style="background-color: {darkenColor(
                  tdoc.userApproval
                    ? getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                    : tdoc.cellColors?.decision ||
                        getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                )};"
                contenteditable="true"
                on:blur={(e) => handleCommentsBlur(e, tdoc.id)}
                on:click={(e) => {
                  // Only stop propagation if we're actually editing (focusing the cell)
                  if (
                    e.target.isContentEditable &&
                    document.activeElement === e.target
                  ) {
                    e.stopPropagation();
                  }
                }}
                on:focus={(e) => e.stopPropagation()}
              >
                {tdoc.userComments || ""}
              </td>
              <td
                style="background-color: {tdoc.userApproval
                  ? getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                  : tdoc.cellColors?.wdrn ||
                    getDecisionStateColor(tdoc.decision, tdoc.userApproval)};"
                >{tdoc.wdrn}</td
              >
              <td
                style="background-color: {tdoc.userApproval
                  ? getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                  : tdoc.cellColors?.replacedBy ||
                    getDecisionStateColor(tdoc.decision, tdoc.userApproval)};"
              >
                {#if tdoc.replacedByHref}
                  <a
                    href={tdoc.replacedByHref}
                    target={tdoc.replacedByHref.startsWith("#")
                      ? "_self"
                      : "_blank"}
                    on:click={(e) => handleLinkClick(e, tdoc.replacedByHref)}
                  >
                    {tdoc.replacedBy}
                  </a>
                {:else}
                  {tdoc.replacedBy}
                {/if}
              </td>
              <td
                style="background-color: {tdoc.userApproval
                  ? getDecisionStateColor(tdoc.decision, tdoc.userApproval)
                  : tdoc.cellColors?.replaces ||
                    getDecisionStateColor(tdoc.decision, tdoc.userApproval)};"
              >
                {#if tdoc.replacesHref}
                  <a
                    href={tdoc.replacesHref}
                    target={tdoc.replacesHref.startsWith("#")
                      ? "_self"
                      : "_blank"}
                    on:click={(e) => handleLinkClick(e, tdoc.replacesHref)}
                  >
                    {tdoc.replaces}
                  </a>
                {:else}
                  {tdoc.replaces}
                {/if}
              </td>
            </tr>
          {/each}
        {/each}
      {:else}
        <tr>
          <td
            colspan="13"
            style="text-align: center; padding: 40px 20px; font-size: 14px; color: #666;"
          >
            No TDoc data available. Please upload an HTML file to get started.
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
