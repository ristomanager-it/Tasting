// ticket-home.js — Tasting Dashboard
const V = '#7C3AED', A = '#B45309', T = '#0D9488', BG = '#F5F3FF';
const supa = () => window.supabaseClient || window.supabase;

export async function render(container) {
  const { data: { user } } = await supa().auth.getUser();
  if (!user) return;
  const { data: dip } = await supa().from('dipendenti').select('azienda_id, nome').eq('user_id', user.id).single();
  if (!dip) return;
  const aziendaId = dip.azienda_id;

  container.innerHTML = `
    <div style="padding:24px;max-width:1100px;margin:0 auto">

      <!-- Hero saluto -->
      <div style="background:linear-gradient(135deg,${V},#9333ea);border-radius:16px;padding:28px 32px;margin-bottom:28px;color:#fff;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
        <div>
          <div style="font-size:13px;opacity:.8;margin-bottom:6px;letter-spacing:1px">BENVENUTO</div>
          <div style="font-size:26px;font-weight:600">${dip.nome || 'Operatore'} 👋</div>
          <div style="font-size:14px;opacity:.8;margin-top:4px">${new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="text-align:center;background:rgba(255,255,255,.15);border-radius:12px;padding:14px 20px">
            <div style="font-size:28px;font-weight:700" id="hero-eventi">—</div>
            <div style="font-size:12px;opacity:.8">eventi attivi</div>
          </div>
          <div style="text-align:center;background:rgba(255,255,255,.15);border-radius:12px;padding:14px 20px">
            <div style="font-size:28px;font-weight:700" id="hero-biglietti">—</div>
            <div style="font-size:12px;opacity:.8">biglietti oggi</div>
          </div>
        </div>
      </div>

      <!-- KPI -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:28px" id="kpi-grid">
        ${['','','',''].map(() => `<div style="background:#fff;border-radius:12px;border:1px solid #eee;padding:18px;animation:pulse 1.5s infinite">
          <div style="height:12px;background:#f0f0f0;border-radius:6px;width:60%;margin-bottom:10px"></div>
          <div style="height:28px;background:#f0f0f0;border-radius:6px;width:40%"></div>
        </div>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

        <!-- Prossimi eventi -->
        <div style="background:#fff;border-radius:14px;border:1px solid #eee;padding:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div style="font-size:15px;font-weight:500;color:#1a1a1a">🎪 Prossimi eventi</div>
            <button onclick="window.navigateTo('eventi')" style="font-size:12px;color:${V};background:${BG};border:1px solid ${V};border-radius:6px;padding:4px 10px;cursor:pointer">Vedi tutti</button>
          </div>
          <div id="prossimi-eventi">
            <div style="text-align:center;padding:20px;color:#aaa;font-size:13px">Caricamento...</div>
          </div>
        </div>

        <!-- Vendite recenti -->
        <div style="background:#fff;border-radius:14px;border:1px solid #eee;padding:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div style="font-size:15px;font-weight:500;color:#1a1a1a">🎫 Vendite recenti</div>
            <button onclick="window.navigateTo('vendite')" style="font-size:12px;color:${A};background:#fef3c7;border:1px solid ${A};border-radius:6px;padding:4px 10px;cursor:pointer">Vedi tutte</button>
          </div>
          <div id="vendite-recenti">
            <div style="text-align:center;padding:20px;color:#aaa;font-size:13px">Caricamento...</div>
          </div>
        </div>

        <!-- Slot oggi -->
        <div style="background:#fff;border-radius:14px;border:1px solid #eee;padding:20px">
          <div style="font-size:15px;font-weight:500;color:#1a1a1a;margin-bottom:16px">⏱️ Slot di oggi</div>
          <div id="slot-oggi">
            <div style="text-align:center;padding:20px;color:#aaa;font-size:13px">Caricamento...</div>
          </div>
        </div>

        <!-- Azioni rapide -->
        <div style="background:#fff;border-radius:14px;border:1px solid #eee;padding:20px">
          <div style="font-size:15px;font-weight:500;color:#1a1a1a;margin-bottom:16px">⚡ Azioni rapide</div>
          <div style="display:grid;gap:10px">
            <button onclick="window.navigateTo('eventi')"
              style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:${BG};border:1.5px solid ${V};border-radius:10px;cursor:pointer;text-align:left">
              <span style="font-size:20px">🎪</span>
              <div>
                <div style="font-size:13px;font-weight:500;color:${V}">Crea nuovo evento</div>
                <div style="font-size:11px;color:#aaa">Sagra, degustazione, serata a tema</div>
              </div>
            </button>
            <button onclick="window.open('scanner.html','_blank')"
              style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#e6faf7;border:1.5px solid ${T};border-radius:10px;cursor:pointer;text-align:left">
              <span style="font-size:20px">📷</span>
              <div>
                <div style="font-size:13px;font-weight:500;color:${T}">Apri scanner QR</div>
                <div style="font-size:11px;color:#aaa">Check-in e validazione biglietti</div>
              </div>
            </button>
            <button onclick="window.navigateTo('vendite')"
              style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#fef3c7;border:1.5px solid ${A};border-radius:10px;cursor:pointer;text-align:left">
              <span style="font-size:20px">🎫</span>
              <div>
                <div style="font-size:13px;font-weight:500;color:${A}">Vendi biglietto in cassa</div>
                <div style="font-size:11px;color:#aaa">Vendita diretta all'ingresso</div>
              </div>
            </button>
            <button onclick="window.navigateTo('report')"
              style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#f5f5f5;border:1.5px solid #ddd;border-radius:10px;cursor:pointer;text-align:left">
              <span style="font-size:20px">📊</span>
              <div>
                <div style="font-size:13px;font-weight:500;color:#555">Vedi report</div>
                <div style="font-size:11px;color:#aaa">Incassi, presenze, analisi</div>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  // Carica dati in parallelo
  const oggi = new Date().toISOString().slice(0, 10);

  const [
    { data: eventi },
    { data: ordini },
    { data: biglietti },
    { data: prossimiEventi },
    { data: venditeRecenti },
    { data: slotOggi },
    { data: bigliettOggi },
  ] = await Promise.all([
    supa().from('ticket_eventi').select('stato').eq('azienda_id', aziendaId),
    supa().from('ticket_ordini').select('totale,stato').eq('azienda_id', aziendaId),
    supa().from('ticket_biglietti').select('id').eq('azienda_id', aziendaId),
    supa().from('ticket_eventi').select('id,nome,data_inizio,tipo,stato,immagine_url')
      .eq('azienda_id', aziendaId).in('stato', ['pubblicato','bozza'])
      .gte('data_inizio', new Date().toISOString())
      .order('data_inizio').limit(4),
    supa().from('ticket_ordini').select('id,nome_acquirente,totale,stato,created_at,ticket_categorie_prezzo(nome)')
      .eq('azienda_id', aziendaId).order('created_at', { ascending: false }).limit(6),
    supa().from('ticket_slot').select('id,ora_inizio,ora_fine,capacita_totale,venduti_totale,attivo,evento_id')
      .eq('azienda_id', aziendaId).eq('data', oggi).eq('attivo', true).order('ora_inizio'),
    supa().from('ticket_biglietti').select('id').eq('azienda_id', aziendaId)
      .gte('created_at', oggi + 'T00:00:00').lte('created_at', oggi + 'T23:59:59'),
  ]);

  // Hero
  const eventiAttivi = eventi?.filter(e => e.stato === 'pubblicato').length || 0;
  document.getElementById('hero-eventi').textContent = eventiAttivi;
  document.getElementById('hero-biglietti').textContent = bigliettOggi?.length || 0;

  // KPI
  const incasso = ordini?.filter(o => o.stato === 'pagato').reduce((s, o) => s + parseFloat(o.totale || 0), 0) || 0;
  const totBiglietti = biglietti?.length || 0;
  const totEventi = eventi?.length || 0;
  const ordiniPagati = ordini?.filter(o => o.stato === 'pagato').length || 0;

  document.getElementById('kpi-grid').innerHTML = [
    { label: 'Incasso totale', val: '€' + incasso.toFixed(2), col: V, icon: '💰' },
    { label: 'Biglietti venduti', val: totBiglietti, col: T, icon: '🎫' },
    { label: 'Ordini completati', val: ordiniPagati, col: A, icon: '✅' },
    { label: 'Eventi creati', val: totEventi, col: '#8B5CF6', icon: '🎪' },
  ].map(k => `
    <div style="background:#fff;border-radius:12px;border:1px solid #eee;padding:18px;border-top:3px solid ${k.col}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:12px;color:#888">${k.label}</div>
        <span style="font-size:18px">${k.icon}</span>
      </div>
      <div style="font-size:26px;font-weight:600;color:${k.col}">${k.val}</div>
    </div>`).join('');

  // Prossimi eventi
  const elEventi = document.getElementById('prossimi-eventi');
  if (!prossimiEventi?.length) {
    elEventi.innerHTML = `<div style="text-align:center;padding:24px;color:#aaa">
      <div style="font-size:28px;margin-bottom:8px">🎪</div>
      <div style="font-size:13px">Nessun evento in programma</div>
      <button onclick="window.navigateTo('eventi')" style="margin-top:10px;padding:6px 14px;background:${V};color:#fff;border:none;border-radius:8px;font-size:12px;cursor:pointer">Crea evento</button>
    </div>`;
  } else {
    elEventi.innerHTML = prossimiEventi.map(e => {
      const dataFmt = new Date(e.data_inizio).toLocaleDateString('it-IT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
      const statoCol = e.stato === 'pubblicato' ? T : '#888';
      const tipoCol = e.tipo === 'consumazione' ? A : V;
      return `
        <div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #f5f5f5;cursor:pointer" onclick="window.navigateTo('eventi')">
          <div style="width:44px;height:44px;border-radius:8px;background:${BG};overflow:hidden;flex-shrink:0">
            ${e.immagine_url ? `<img src="${e.immagine_url}" style="width:100%;height:100%;object-fit:cover">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:20px">🎪</div>`}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.nome}</div>
            <div style="font-size:11px;color:#aaa;margin-top:2px">📅 ${dataFmt}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
            <span style="font-size:10px;background:${statoCol}22;color:${statoCol};border-radius:4px;padding:1px 6px">${e.stato}</span>
            <span style="font-size:10px;background:${tipoCol}22;color:${tipoCol};border-radius:4px;padding:1px 6px">${e.tipo}</span>
          </div>
        </div>`;
    }).join('');
  }

  // Vendite recenti
  const elVendite = document.getElementById('vendite-recenti');
  if (!venditeRecenti?.length) {
    elVendite.innerHTML = `<div style="text-align:center;padding:24px;color:#aaa;font-size:13px">Nessuna vendita ancora</div>`;
  } else {
    elVendite.innerHTML = venditeRecenti.map(o => {
      const dataFmt = new Date(o.created_at).toLocaleDateString('it-IT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
      const statoCol = { pagato:T, in_attesa:A, annullato:'#e53e3e', rimborsato:'#888' }[o.stato] || '#888';
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f5">
          <div style="width:32px;height:32px;border-radius:50%;background:${statoCol}22;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">🎫</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.nome_acquirente}</div>
            <div style="font-size:11px;color:#aaa">${dataFmt}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:13px;font-weight:600;color:${statoCol}">€${parseFloat(o.totale).toFixed(2)}</div>
            <div style="font-size:10px;color:${statoCol}">${o.stato}</div>
          </div>
        </div>`;
    }).join('');
  }

  // Slot oggi
  const elSlot = document.getElementById('slot-oggi');
  if (!slotOggi?.length) {
    elSlot.innerHTML = `<div style="text-align:center;padding:24px;color:#aaa;font-size:13px">
      <div style="font-size:28px;margin-bottom:8px">⏱️</div>
      Nessuno slot attivo oggi
    </div>`;
  } else {
    elSlot.innerHTML = slotOggi.map(sl => {
      const perc = sl.capacita_totale > 0 ? Math.round((sl.venduti_totale / sl.capacita_totale) * 100) : 0;
      const colBar = perc >= 90 ? '#e53e3e' : perc >= 70 ? A : T;
      const adesso = new Date();
      const [h, m] = sl.ora_inizio.split(':').map(Number);
      const slotTime = new Date(); slotTime.setHours(h, m, 0);
      const isCurrent = Math.abs(adesso - slotTime) < 20 * 60 * 1000;
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:8px 10px;border-radius:8px;margin-bottom:6px;background:${isCurrent ? T + '11' : '#fafafa'};border:1px solid ${isCurrent ? T : '#f0f0f0'}">
          ${isCurrent ? `<span style="font-size:10px;background:${T};color:#fff;border-radius:4px;padding:1px 6px;flex-shrink:0">ORA</span>` : ''}
          <span style="font-size:13px;font-weight:500;color:#1a1a1a;flex-shrink:0">${sl.ora_inizio.slice(0,5)}${sl.ora_fine ? ' → ' + sl.ora_fine.slice(0,5) : ''}</span>
          <div style="flex:1">
            <div style="height:4px;background:#eee;border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${perc}%;background:${colBar};border-radius:4px"></div>
            </div>
          </div>
          <span style="font-size:12px;color:${colBar};font-weight:500;flex-shrink:0">${sl.venduti_totale}/${sl.capacita_totale}</span>
        </div>`;
    }).join('');
  }
}
