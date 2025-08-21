<script>
  export let isOpen = false;
  export let title = '';
  export let onClose = () => {};
  export let onConfirm = null;
  export let confirmText = 'OK';
  export let cancelText = 'Cancel';
  export let showCancel = true;
  
  let inputValue = '';
  let inputElement;
  
  function handleClose() {
    isOpen = false;
    inputValue = '';
    onClose();
  }
  
  function handleConfirm() {
    if (onConfirm) {
      onConfirm(inputValue);
    }
    handleClose();
  }
  
  function handleKeydown(event) {
    if (!isOpen) return; // Only handle if modal is open
    
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handleClose();
    } else if (event.key === 'Enter' && event.target.closest('.modal-content')) {
      event.preventDefault();
      event.stopPropagation();
      handleConfirm();
    }
  }
  
  $: if (isOpen && inputElement) {
    setTimeout(() => inputElement.focus(), 100);
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-overlay" on:click={handleClose} role="dialog" aria-modal="true">
    <div class="modal-content" on:click|stopPropagation role="document">
      <form on:submit|preventDefault={handleConfirm}>
        <div class="modal-header">
          <h3>{title}</h3>
          <button type="button" class="modal-close" on:click={handleClose} aria-label="Close">&times;</button>
        </div>
        
        <div class="modal-body">
          <slot>
            <input 
              bind:this={inputElement}
              bind:value={inputValue} 
              type="text" 
              class="modal-input"
              placeholder="Enter value..."
            />
          </slot>
        </div>
        
        <div class="modal-footer">
          {#if showCancel}
            <button type="button" class="btn btn-secondary" on:click={handleClose}>
              {cancelText}
            </button>
          {/if}
          <button type="submit" class="btn btn-primary">
            {confirmText}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow: auto;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px 16px;
    border-bottom: 1px solid #e9ecef;
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }
  
  .modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .modal-close:hover {
    color: #333;
  }
  
  .modal-body {
    padding: 20px 24px;
  }
  
  .modal-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .modal-input:focus {
    outline: none;
    border-color: #0066cc;
    box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
  }
  
  .modal-footer {
    padding: 16px 24px 20px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    border-top: 1px solid #e9ecef;
  }
  
  .btn {
    padding: 8px 16px;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }
  
  .btn-primary {
    background-color: #0066cc;
    color: white;
    border-color: #0066cc;
  }
  
  .btn-primary:hover {
    background-color: #0056b3;
  }
  
  .btn-secondary {
    background-color: white;
    color: #333;
  }
  
  .btn-secondary:hover {
    background-color: #f8f9fa;
  }
</style>