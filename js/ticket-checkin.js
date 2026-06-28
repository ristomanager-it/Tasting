// ticket-checkin.js — Tasting App
const V = '#7C3AED', BG = '#F5F3FF';
const supa = () => window.supabaseClient || window.supabase;

export async function render(container) {
  const { data: { user } } = await supa().auth.getUser();
  if (!user) return;
  const { data: dip } = await supa().from('dipendenti').select('azienda_id').eq('user_id', user.id).single();
  if (!dip) return;
  const aziendaId = dip.azienda_id;

  const fdt = ts => ts ? new Date(ts).toLocaleString('it-IT', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
  const fmt = n => Number(n||0).toLocaleString('it-IT');

  container.innerHTML = `
  <style>
    .tc-wrap{max-width:960px;margin:0 auto;padding:20px;}
    .tc-title{font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:4px;}
    .tc-sub{font-size:13px;color:#888;margin-bottom:16px;}
    .tc-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center;}
    .tc-sel{padding:8px 12px;border-radius:8px;border:1.5px solid #e5e7eb;background:#fff;font-size:13px;outline:none;cursor:pointer;}
    .tc-search{flex:1;min-width:160px;padding:8px 12px;border-radius:8px;border:1.5px solid #e5e7eb;background:#fff;font-size:13px;outline:none;}
    .tc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
    @media(max-width:600px){.tc-grid{grid-template-columns:repeat(2,1fr);}}
    .tc-kpi{background:#fff;border-radius:12px;padding:14px;border:1px solid #ede9fe;text-align:center;}
    .tc-kpi-val{font-size:22px;font-weight:700;color:#1a1a1a;}
    .tc-kpi-lab{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-top:2px;}
    .tc-card{background:#fff;border-radius:12px;padding:18px;border:1px solid #ede9fe;margin-bottom:12px;}
    .tc-card-title{font-size:12px;font-weight:700;color:${V};text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;}
    .tc-table{width:100%;border-collapse:collapse;font-size:13px;}
    .tc-table th{text-align:left;padding:8px 10px;background:#faf5ff;color:#888;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #ede9fe;}
    .tc-table td{padding:10px;border-bottom:1px solid #f5f3ff;vertical-align:middle;}
    .tc-table tr:last-child td{border:none;}
    .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;}
    .b-attivo{background:#dbeafe;color:#1d4ed8;}
    .b-usato{background:#dcfce7;color:#16a34a;}
    .b-annullato{background:#fee2e2;color:#dc2626;}
    .btn-ci{padding:6px 12px;border-radius:8px;border:none;background:${V};color:#fff;font-size:12px;font-weight:700;cursor:pointer;}
    .btn-ci:hover{background:#6d28d9;}
    .btn-ci:disabled{background:#e5e7eb;color:#aaa;cursor:default;}
    .btn-scala{padding:5px 10px;border-radius:8px;border:1.5px solid ${V};background:#fff;color:${V};font-size:12px;font-weight:700;cursor:pointer;}
    .pbar{height:6px;background:#ede9fe;border-radius:4px;overflow:hidden;margin-top:4px;}
    .pbar-fill{height:100%;background:linear-gradient(90deg,${V},#9333ea);border-radius:4px;transition:width .4s;}
    .tc-empty{text-align:center;padding:32px;color:#aaa;font-size:13px;}
    .tc-loading{text-align:center;padding:40px;color:#aaa;}
    @keyframes pulse2{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
    .pulse{animation:pulse2 .4s ease;}
  </style>
  <div class="tc-wrap">
    <div class="tc-title">✅ Check-in</div>
    <div class="tc-sub">Gestione ingressi e consumazioni in tempo reale</div>
    <div class="tc-bar">
      <select id="tc-ev" class="tc-sel"><option value="">⏳ Caricamento...</option></select>
      <select id="tc-slot" class="tc-sel"><option value="">Tutti gli slot</option></select>
      <select id="tc-stato" class="tc-sel">
        <option value="">Tutti</option>
        <option value="attivo">Da fare</option>
        <option value="pagato">Da fare</option>
        <option value="usato">Entrati</option>
        <option value="annullato">Annullati</option>
      </select>
      <input id="tc-search" class="tc-search" type="text" placeholder="🔍 Cerca nome...">
    </div>
    <div id="tc-body"><div class="tc-loading">Seleziona un evento</div></div>
  </div>`;

  // Carica eventi
  const { data: eventi } = await supa().from('ticket_eventi')
    .select('id,nome,data_evento').eq('azienda_id', aziendaId)
    .order('data_evento', { ascending: false });

  const selEv = document.getElementById('tc-ev');
  selEv.innerHTML = '<option value="">— Seleziona evento —</option>' +
    (eventi||[]).map(e => `<option value="${e.id}">${e.nome}${e.data_evento ? ' · ' + new Date(e.data_evento).toLocaleDateString('it-IT') : ''}</option>`).join('');

  selEv.onchange = async () => { await caricaSlot(); carica(); };
  document.getElementById('tc-slot').onchange = () => carica();
  document.getElementById('tc-stato').onchange = () => carica();
  document.getElementById('tc-search').oninput = () => filtra();

  let _tutti = [];

  async function caricaSlot() {
    const evId = selEv.value;
    const selSlot = document.getElementById('tc-slot');
    selSlot.innerHTML = '<option value="">Tutti gli slot</option>';
    if (!evId) return;
    const { data: slots } = await supa().from('ticket_slot')
      .select('id,data,ora_inizio,ora_fine').eq('evento_id', evId).order('data').order('ora_inizio');
    (slots||[]).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = (s.data ? new Date(s.data+'T12:00:00').toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'}) + ' ' : '') + (s.ora_inizio?.slice(0,5)||'') + ' – ' + (s.ora_fine?.slice(0,5)||'');
      selSlot.appendChild(opt);
    });
  }

  async function carica() {
    const evId = selEv.value;
    if (!evId) return;
    document.getElementById('tc-body').innerHTML = '<div class="tc-loading">⏳ Caricamento...</div>';

    const slotId = document.getElementById('tc-slot').value;
    const stato = document.getElementById('tc-stato').value;

    let q = supa().from('ticket_biglietti')
      .select('id,stato,nome_partecipante,consumazioni_totali,consumazioni_usate,attivato_at,slot_id,ticket_ordini(nome_acquirente,telefono),ticket_categorie_prezzo(nome,tipo)')
      .eq('evento_id', evId).eq('azienda_id', aziendaId).order('created_at', { ascending: false });
    if (slotId) q = q.eq('slot_id', slotId);
    if (stato) q = q.eq('stato', stato);

    const { data } = await q;
    _tutti = data || [];
    renderTabella(_tutti);
  }

  function filtra() {
    const q = document.getElementById('tc-search').value.toLowerCase().trim();
    if (!q) { renderTabella(_tutti); return; }
    renderTabella(_tutti.filter(b =>
      (b.nome_partecipante||'').toLowerCase().includes(q) ||
      (b.ticket_ordini?.nome_acquirente||'').toLowerCase().includes(q) ||
      (b.ticket_ordini?.telefono||'').includes(q)
    ));
  }

  function renderTabella(lista) {
    const tot    = lista.length;
    const entr   = lista.filter(b => b.stato === 'usato').length;
    const daFare = lista.filter(b => b.stato === 'attivo' || b.stato === 'pagato').length;
    const ann    = lista.filter(b => b.stato === 'annullato').length;
    const pct    = tot ? Math.round(entr/tot*100) : 0;

    const kpi = `
    <div class="tc-grid">
      <div class="tc-kpi"><div class="tc-kpi-val">${fmt(tot)}</div><div class="tc-kpi-lab">Totali</div></div>
      <div class="tc-kpi"><div class="tc-kpi-val" style="color:#16a34a">${fmt(entr)}</div><div class="tc-kpi-lab">✅ Entrati</div>
        <div class="pbar" style="width:80%;margin:4px auto 0;"><div class="pbar-fill" style="width:${pct}%;background:#16a34a"></div></div>
      </div>
      <div class="tc-kpi"><div class="tc-kpi-val" style="color:#d97706">${fmt(daFare)}</div><div class="tc-kpi-lab">⏳ Da fare</div></div>
      <div class="tc-kpi"><div class="tc-kpi-val" style="color:#dc2626">${fmt(ann)}</div><div class="tc-kpi-lab">❌ Annullati</div></div>
    </div>`;

    if (!lista.length) {
      document.getElementById('tc-body').innerHTML = kpi + '<div class="tc-card"><div class="tc-empty">Nessun biglietto trovato</div></div>';
      return;
    }

    const righe = lista.map(b => {
      const isCons = b.ticket_categorie_prezzo?.tipo === 'consumazione';
      const usate = b.consumazioni_usate || 0;
      const tot2  = b.consumazioni_totali || 0;
      const rim   = Math.max(0, tot2 - usate);
      const puoCI = b.stato === 'attivo' || b.stato === 'pagato';
      const stCls = b.stato === 'usato' ? 'b-usato' : b.stato === 'annullato' ? 'b-annullato' : 'b-attivo';

      return `<tr id="r-${b.id}">
        <td><div style="font-weight:600;">${b.nome_partecipante||b.ticket_ordini?.nome_acquirente||'—'}</div>
            <div style="font-size:11px;color:#aaa;">${b.ticket_ordini?.telefono||''}</div></td>
        <td><div style="font-size:12px;font-weight:600;">${b.ticket_categorie_prezzo?.nome||'—'}</div></td>
        <td><span class="badge ${stCls}">${b.stato}</span></td>
        <td style="color:#aaa;font-size:12px;">${fdt(b.attivato_at)}</td>
        <td>
          ${isCons ? `<div class="cons-info-${b.id}" style="font-size:12px;color:#555;">${rim} / ${tot2}</div>
            <div class="pbar" style="width:80px;"><div class="pbar-fill cf-${b.id}" style="width:${tot2?Math.round(usate/tot2*100):0}%"></div></div>
            ${rim > 0 && b.stato === 'usato' ? `<button class="btn-scala" style="margin-top:4px;" onclick="scalaC('${b.id}',${usate},${tot2})">🍸</button>` : ''}` : ''}
        </td>
        <td>
          ${puoCI
            ? `<button class="btn-ci" onclick="doCI('${b.id}')">✅ Check-in</button>`
            : b.stato === 'usato'
              ? `<span style="font-size:12px;color:#16a34a;font-weight:600;">✓ Entrato</span>`
              : `<span style="font-size:12px;color:#aaa;">—</span>`}
        </td>
      </tr>`;
    }).join('');

    document.getElementById('tc-body').innerHTML = kpi + `
    <div class="tc-card">
      <div class="tc-card-title"><span>Lista biglietti</span><span style="font-size:11px;color:#aaa;font-weight:400;">${lista.length} risultati</span></div>
      <div style="overflow-x:auto;">
        <table class="tc-table">
          <thead><tr><th>Partecipante</th><th>Categoria</th><th>Stato</th><th>Entrato alle</th><th>Consumazioni</th><th>Azione</th></tr></thead>
          <tbody>${righe}</tbody>
        </table>
      </div>
    </div>`;
  }

  window.doCI = async function(id) {
    const btn = document.querySelector(`#r-${id} .btn-ci`);
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    const { error } = await supa().from('ticket_biglietti')
      .update({ stato: 'usato', attivato_at: new Date().toISOString() }).eq('id', id);
    if (error) { alert('Errore: ' + error.message); if(btn){btn.disabled=false;btn.textContent='✅ Check-in';} return; }
    const row = document.getElementById('r-' + id);
    if (row) {
      row.classList.add('pulse');
      row.cells[2].innerHTML = '<span class="badge b-usato">usato</span>';
      row.cells[3].textContent = fdt(new Date().toISOString());
      row.cells[5].innerHTML = '<span style="font-size:12px;color:#16a34a;font-weight:600;">✓ Entrato</span>';
    }
    const b = _tutti.find(x => x.id === id);
    if (b) b.stato = 'usato';
  };

  window.scalaC = async function(id, usate, tot) {
    const nuove = usate + 1;
    await supa().from('ticket_biglietti').update({ consumazioni_usate: nuove }).eq('id', id);
    const rim = Math.max(0, tot - nuove);
    const pct2 = Math.round(nuove/tot*100);
    const ci = document.querySelector('.cons-info-' + id);
    const cf = document.querySelector('.cf-' + id);
    if (ci) ci.textContent = rim + ' / ' + tot;
    if (cf) cf.style.width = pct2 + '%';
    const row = document.getElementById('r-' + id);
    if (row) {
      const btn = row.querySelector('.btn-scala');
      if (rim <= 0 && btn) btn.remove();
      else if (btn) btn.onclick = () => window.scalaC(id, nuove, tot);
    }
    const b = _tutti.find(x => x.id === id);
    if (b) b.consumazioni_usate = nuove;
  };
}
