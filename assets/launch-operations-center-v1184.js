(() => {
  const summary = document.getElementById('launch-ops-summary');
  const grid = document.getElementById('launch-ops-grid');
  const refresh = document.getElementById('launch-ops-refresh');
  const exportButton = document.getElementById('launch-ops-export');
  let snapshot = null;
  const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const render = data => {
    snapshot = data;
    const blocked = data.dependencies.filter(item => item.gate === 'BLOCKED').length;
    const open = data.dependencies.filter(item => item.gate === 'OPEN_VERIFIED').length;
    summary.textContent = `${data.product} ${data.version}: ${data.decision}. ${open} open-verified, ${blocked} blocked or not connected. Production deployment is not proven.`;
    grid.innerHTML = data.dependencies.map(item => `<article class="content-card"><p class="eyebrow">${safe(item.gate)}</p><h2>${safe(item.label)}</h2><p><strong>${safe(item.state)}</strong></p><p>${safe(typeof item.evidence === 'string' ? item.evidence : JSON.stringify(item.evidence))}</p><p class="muted">Owner action: ${safe(item.ownerAction)}</p></article>`).join('');
  };
  const localFallback = () => ({schema:'ela-unified-live-operations-v1',version:'1.1.84',product:'Estate Law Aid',decision:'CONDITIONAL_GO',dependencies:[{label:'Operations evidence',state:'CONTRACT_READY_NOT_CONNECTED',gate:'BLOCKED',evidence:'Backend status is unavailable. Use the packaged data/unified_live_operations_v1184.json evidence file.',ownerAction:'NONE'}]});
  const load = async () => {
    summary.textContent = 'Checking local portal evidence…';
    try {
      const response = await fetch('/api/v1184/unified-live-operations',{headers:{accept:'application/json'}});
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json(); render(data);
    } catch (_error) { render(localFallback()); }
  };
  const exportSnapshot = () => {
    const data = snapshot || localFallback();
    const blob = new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
    const url = URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download='estate-law-aid-launch-operations-v1.1.84.json'; a.click(); URL.revokeObjectURL(url);
  };
  refresh?.addEventListener('click',load); exportButton?.addEventListener('click',exportSnapshot);
})();