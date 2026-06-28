// ticket-vendite.js — Tasting App
const V = '#7C3AED', BG = '#F5F3FF';
const supa = () => window.supabaseClient || window.supabase;

export async function render(container) {
  const { data: { user } } = await supa().auth.getUser();
  if (!user) return;
  const { data: dip } = await supa().from('dipendenti').select('azienda_id').eq('user_id', user.id).single();
  if (!dip) return;
  const aziendaId = dip.azienda_id;

  const fmt  = n => Number(n||0).toLocaleString('it-IT');
  const fmtE = n => '€ ' + Number(n||0).toFixed(2).replace('.', ',');
  const fdt  = ts => ts ? new Date(ts).toLocaleString('it-IT', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';

  container.innerHTML = `
  <style>
    .tv-wrap{max-width:960px;margin:0 auto;padding:20px;}
    .tv-title{font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:4px;}
    .tv-sub{font-size:13px;color:#888;margin-bottom:16px;}
    .tv-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center;}
    .tv-sel{padding:8px 12px;border-radius:8px;border:1.5px solid #e5e7eb;background:#fff;font-size:13px;color:#374151;outline:none;cursor:pointer;}
    .tv-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px;}
    @media(min-width:600px){.tv-grid{grid-template-columns:repeat(4,1fr);}}
    .tv-kpi{background:#fff;border-radius:12px;padding:16px;border:1px solid #ede9fe;}
    .tv-kpi-val{font-size:22px;font-weight:700;color:#1a1a1a;}
    .tv-kpi-lab{font-size:12px;color:#888;margin-top:2px;}
    .tv-kpi-sub{font-size:11px;color:#aaa;margin-top:2px;}
    .tv-card{background:#fff;border-radius:12px;padding:18px;border:1px solid #ede9fe;margin-bottom:12px;}
    .tv-card-title{font-size:12px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;}
    .tv-table{width:100%;border-collapse:collapse;font-size:13px;}
    .tv-table th{text-align:left;padding:8px 10px;background:#faf5ff;color:#888;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #ede9fe;}
    .tv-table td{padding:10px;border-bottom:1px solid #f5f3ff;color:#374151;}
    .tv-table tr:last-child td{border:none;}
    .tv-table tr:hover td{background:#faf5ff;}
    .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;}
    .b-pagato{background:#dcfce7;color:#16a34a;}
    .b-attesa{background:#fef9c3;color:#854d0e;}
    .b-annullato{background:#fee2e2;color:#dc2626;}
    .tv-empty{text-align:center;padding:32px;color:#aaa;font-size:13px;}
    .tv-loading{text-align:center;padding:40px;color:#aaa;}
    .bar-wrap{background:#f3f0ff;border-radius:6px;height:8px;overflow:hidden;margin-top:4px;}
    .bar-fill{height:100%;border-radius:6px;background:linear-gradient(90deg,${V},#9333ea);}
  </style>
  <div class="tv-wrap">
    <div class="tv-title">🎫 Vendite & Biglietti</div>
    <div class="tv-sub">Report ordini, incassi e biglietti per evento</div>
    <div class="tv-bar">
      <select id="sel-evento" class="tv-sel"><option value="">⏳ Caricamento...</option></select>
      <select id="sel-stato" class="tv-sel">
        <option value="">Tutti gli stati</option>
        <option value="pagato">Pagati</option>
        <option value="in_attesa">In attesa</option>
        <option value="annullato">Annullati</option>
      </select>
    </div>
    <div id="tv-body"><div class="tv-loading">Seleziona un evento</div></div>
  </div>`;

  // Carica eventi
  const { data: eventi } = await supa().from('ticket_eventi')
    .select('id,nome,data_evento').eq('azienda_id', aziendaId)
    .order('data_evento', { ascending: false });

  const sel = document.getElementById('sel-evento');
  sel.innerHTML = '<option value="">— Seleziona evento —</option>' +
    (eventi||[]).map(e => `<option value="${e.id}">${e.nome}${e.data_evento ? ' · ' + new Date(e.data_evento).toLocaleDateString('it-IT') : ''}</option>`).join('');

  sel.onchange = () => carica();
  document.getElementById('sel-stato').onchange = () => carica();

  async function carica() {
    const evId = sel.value;
    if (!evId) return;
    document.getElementById('tv-body').innerHTML = '<div class="tv-loading">⏳ Caricamento...</div>';

    const stato = document.getElementById('sel-stato').value;
    let q = supa().from('ticket_ordini')
      .select('id,nome_acquirente,email,telefono,totale,stato,metodo_pagamento,quantita,created_at,ticket_categorie_prezzo(nome,tipo,prezzo)')
      .eq('evento_id', evId).eq('azienda_id', aziendaId).order('created_at', { ascending: false });
    if (stato) q = q.eq('stato', stato);
    const { data: ordini } = await q;

    const { data: biglietti } = await supa().from('ticket_biglietti')
      .select('id,stato,consumazioni_totali,consumazioni_usate,nome_partecipante,attivato_at')
      .eq('evento_id', evId).eq('azienda_id', aziendaId);

    const { data: evento } = await supa().from('ticket_eventi')
      .select('nome,data_evento,ticket_categorie_prezzo(nome,tipo,prezzo,quantita_venduta,quantita_disponibile)')
      .eq('id', evId).single();

    const ords = ordini || [];
    const bigs = biglietti || [];
    const pagati = ords.filter(o => o.stato === 'pagato');
    const incasso = pagati.reduce((s,o) => s + parseFloat(o.totale||0), 0);
    const venduti = pagati.reduce((s,o) => s + (o.quantita||1), 0);
    const entrati = bigs.filter(b => b.stato === 'usato').length;
    const consUse = bigs.reduce((s,b) => s + (b.consumazioni_usate||0), 0);

    const kpi = `
    <div class="tv-grid">
      <div class="tv-kpi"><div class="tv-kpi-val" style="color:#16a34a">${fmtE(incasso)}</div><div class="tv-kpi-lab">💰 Incasso</div><div class="tv-kpi-sub">${fmt(pagati.length)} ordini pagati</div></div>
      <div class="tv-kpi"><div class="tv-kpi-val">${fmt(venduti)}</div><div class="tv-kpi-lab">🎫 Biglietti</div><div class="tv-kpi-sub">${fmt(ords.length)} ordini totali</div></div>
      <div class="tv-kpi"><div class="tv-kpi-val" style="color:${V}">${fmt(entrati)}</div><div class="tv-kpi-lab">✅ Entrati</div><div class="tv-kpi-sub">${venduti ? Math.round(entrati/venduti*100) : 0}% dei venduti</div></div>
      <div class="tv-kpi"><div class="tv-kpi-val">${fmt(consUse)}</div><div class="tv-kpi-lab">🍸 Consumazioni</div><div class="tv-kpi-sub">usate</div></div>
    </div>`;

    // Categorie
    const cats = evento?.ticket_categorie_prezzo || [];
    const maxVend = Math.max(...cats.map(c => c.quantita_venduta||0), 1);
    const catsHtml = cats.length ? `
    <div class="tv-card">
      <div class="tv-card-title">📊 Per categoria</div>
      ${cats.map(c => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f3ff;">
          <div><div style="font-weight:600;font-size:13px;">${c.nome}</div><div style="font-size:11px;color:#aaa;">${c.tipo} · ${fmtE(c.prezzo)}</div>
            <div class="bar-wrap" style="width:120px;"><div class="bar-fill" style="width:${Math.round((c.quantita_venduta||0)/maxVend*100)}%"></div></div>
          </div>
          <div style="text-align:right;"><div style="font-weight:700;">${fmt(c.quantita_venduta||0)}</div><div style="font-size:11px;color:#aaa;">/ ${fmt(c.quantita_disponibile||0)}</div></div>
        </div>`).join('')}
    </div>` : '';

    // Ordini
    const ordHtml = `
    <div class="tv-card">
      <div class="tv-card-title">📋 Ordini (${ords.length})</div>
      ${!ords.length ? '<div class="tv-empty">Nessun ordine</div>' : `
      <div style="overflow-x:auto;">
        <table class="tv-table">
          <thead><tr><th>Acquirente</th><th>Categoria</th><th>Qty</th><th>Totale</th><th>Stato</th><th>Data</th></tr></thead>
          <tbody>${ords.map(o => `
            <tr>
              <td><div style="font-weight:600;">${o.nome_acquirente||'—'}</div><div style="font-size:11px;color:#aaa;">${o.telefono||o.email||''}</div></td>
              <td>${o.ticket_categorie_prezzo?.nome||'—'}</td>
              <td style="text-align:center;">${o.quantita||1}</td>
              <td style="font-weight:700;">${fmtE(o.totale)}</td>
              <td><span class="badge b-${o.stato==='pagato'?'pagato':o.stato==='annullato'?'annullato':'attesa'}">${o.stato}</span></td>
              <td style="color:#aaa;">${fdt(o.created_at)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}
    </div>`;

    // Biglietti
    const bigHtml = bigs.length ? `
    <div class="tv-card">
      <div class="tv-card-title">🎫 Biglietti (${bigs.length})</div>
      <div style="overflow-x:auto;">
        <table class="tv-table">
          <thead><tr><th>Partecipante</th><th>Stato</th><th>Consumazioni</th><th>Entrato</th></tr></thead>
          <tbody>${bigs.map(b => `
            <tr>
              <td style="font-weight:600;">${b.nome_partecipante||'—'}</td>
              <td><span class="badge b-${b.stato==='usato'?'pagato':b.stato==='annullato'?'annullato':'attesa'}">${b.stato}</span></td>
              <td style="text-align:center;">${b.consumazioni_usate||0} / ${b.consumazioni_totali||0}</td>
              <td style="color:#aaa;">${fdt(b.attivato_at)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : '';

    document.getElementById('tv-body').innerHTML = kpi + catsHtml + ordHtml + bigHtml;
  }
}
