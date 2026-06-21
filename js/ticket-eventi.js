// ticket-eventi.js — Tasting backoffice eventi
// Colori: Viola #7C3AED, Ambra #B45309, Verde acqua #0D9488

const V = '#7C3AED';
const A = '#B45309';
const T = '#0D9488';
const BG = '#F5F3FF';

const supa = () => window.supabaseClient || window.supabase;

// ============================================
// UPLOAD SUPABASE STORAGE
// ============================================
async function uploadTastingMedia(file, folder) {
  const ext = file.name.split('.').pop().toLowerCase();
  const filename = folder + '/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
  const { data, error } = await supa().storage.from('tasting-media').upload(filename, file, { upsert: true });
  if (error) throw error;
  const { data: pub } = supa().storage.from('tasting-media').getPublicUrl(filename);
  return pub.publicUrl;
}

function renderUploadBox(id, label, currentUrl, onUpload, color) {
  const c = color || '#7C3AED';
  const elId = 'upload-box-' + id;
  const inputId = 'upload-input-' + id;
  const previewId = 'upload-preview-' + id;
  const borderCol = currentUrl ? c : '#ddd';
  const bgCol = currentUrl ? (c + '11') : '#fafafa';
  const previewHtml = currentUrl
    ? '<img id="' + previewId + '" src="' + currentUrl + '" style="max-height:80px;max-width:100%;border-radius:6px;object-fit:cover;display:block;margin:0 auto 8px">'
    : '<div id="' + previewId + '" style="font-size:28px;margin-bottom:6px">📁</div>';
  const labelHtml = label ? '<div style="font-size:12px;color:#666;font-weight:500;margin-bottom:6px">' + label + '</div>' : '';
  const boxLabel = currentUrl ? 'Clicca per cambiare' : 'Clicca per caricare';
  const html = '<div style="margin-top:4px">'
    + labelHtml
    + '<div id="' + elId + '" style="border:2px dashed ' + borderCol + ';border-radius:10px;padding:16px;text-align:center;cursor:pointer;background:' + bgCol + '">'
    + previewHtml
    + '<div style="font-size:12px;color:#888">' + boxLabel + '</div>'
    + '<input type="file" id="' + inputId + '" accept="image/*" style="display:none" onchange="' + onUpload + '">'
    + '</div>'
    + '</div>';
  setTimeout(function() {
    var box = document.getElementById(elId);
    var inp = document.getElementById(inputId);
    if (box && inp) box.addEventListener('click', function(e) { if (e.target !== inp) inp.click(); });
  }, 50);
  return html;
}


let aziendaId = null;
let eventoCorrente = null;
let tabCorrente = 'info';

export async function render(container) {
  const { data: { user } } = await supa().auth.getUser();
  if (!user) return;
  const { data: dip } = await supa().from('dipendenti').select('azienda_id').eq('user_id', user.id).single();
  if (!dip) return;
  aziendaId = dip.azienda_id;

  container.innerHTML = `
    <div style="padding:24px;max-width:1100px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:gap:12px">
        <div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:28px;font-weight:700;color:${V}">T</span><span style="font-size:28px;font-weight:300;color:${V}">asting</span>
            <span style="background:${BG};color:${V};border:1px solid ${V};border-radius:20px;padding:2px 12px;font-size:12px;font-weight:500">Eventi</span>
          </div>
          <p style="color:#666;margin:4px 0 0;font-size:14px">Gestisci eventi, postazioni e biglietti</p>
        </div>
        <button onclick="window._tastingNuovoEvento()" style="background:${V};color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">+</span> Nuovo evento
        </button>
      </div>

      <!-- KPI strip -->
      <div id="tasting-kpi" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:28px"></div>

      <!-- Filtri -->
      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
        ${['tutti','bozza','pubblicato','concluso','annullato'].map(s => `
          <button onclick="window._tastingFiltro('${s}')" id="filtro-${s}"
            style="padding:6px 16px;border-radius:20px;border:1.5px solid ${s==='tutti'?V:'#ddd'};
            background:${s==='tutti'?BG:'#fff'};color:${s==='tutti'?V:'#666'};font-size:13px;cursor:pointer">
            ${s === 'tutti' ? 'Tutti' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>`).join('')}
      </div>

      <!-- Lista eventi -->
      <div id="tasting-lista" style="display:grid;gap:16px"></div>
    </div>

    <!-- MODALE EVENTO -->
    <div id="tasting-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;overflow-y:auto">
      <div style="background:#fff;max-width:860px;margin:40px auto;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.2)">
        <!-- Header modale -->
        <div style="background:${V};padding:20px 24px;display:flex;align-items:center;justify-content:space-between">
          <h2 id="modal-titolo" style="color:#fff;margin:0;font-size:18px;font-weight:500">Nuovo evento</h2>
          <button onclick="window._tastingChiudiModal()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:16px">✕</button>
        </div>

        <!-- Tab navigazione -->
        <div style="display:flex;border-bottom:1px solid #eee;background:#fafafa;overflow-x:auto">
          ${[
            {id:'info', label:'📋 Info'},
            {id:'categorie', label:'🎫 Biglietti'},
            {id:'slot', label:'⏱️ Slot'},
            {id:'postazioni', label:'🍕 Postazioni'},
            {id:'foto', label:'📸 Foto'},
            {id:'sezioni', label:'📄 Contenuti'},
          ].map(t => `
            <button onclick="window._tastingTab('${t.id}')" id="tab-${t.id}"
              style="padding:12px 18px;border:none;background:transparent;font-size:13px;cursor:pointer;
              white-space:nowrap;border-bottom:2px solid transparent;color:#666">
              ${t.label}
            </button>`).join('')}
        </div>

        <!-- Corpo tab -->
        <div id="modal-body" style="padding:24px;min-height:400px"></div>

        <!-- Footer -->
        <div style="padding:16px 24px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;background:#fafafa">
          <div id="modal-stato-badge"></div>
          <div style="display:flex;gap:10px">
            <button onclick="window._tastingChiudiModal()" style="padding:10px 20px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;font-size:14px">Annulla</button>
            <button onclick="window._tastingSalva()" style="padding:10px 20px;background:${V};color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500">Salva</button>
            <button id="btn-pubblica" onclick="window._tastingPubblica()" style="padding:10px 20px;background:${T};color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;display:none">Pubblica</button>
          </div>
        </div>
      </div>
    </div>
  `;

  window._tastingNuovoEvento = () => apriModal(null);
  window._tastingFiltro = (s) => caricaLista(s);
  window._tastingTab = (t) => cambiaTab(t);
  window._tastingChiudiModal = chiudiModal;
  window._tastingSalva = salvaEvento;
  window._tastingPubblica = pubblicaEvento;
  window._tastingEditEvento = (id) => apriModal(id);
  window._tastingDeleteEvento = (id) => eliminaEvento(id);
  window._tastingToggleStato = (id, stato) => toggleStato(id, stato);

  await caricaKPI();
  await caricaLista('tutti');
}

// ============================================
// KPI
// ============================================
async function caricaKPI() {
  const { data: eventi } = await supa().from('ticket_eventi').select('stato').eq('azienda_id', aziendaId);
  const { data: ordini } = await supa().from('ticket_ordini').select('totale,stato').eq('azienda_id', aziendaId);
  const { data: biglietti } = await supa().from('ticket_biglietti').select('stato').eq('azienda_id', aziendaId);

  const totEventi = eventi?.length || 0;
  const attivi = eventi?.filter(e => e.stato === 'pubblicato').length || 0;
  const incasso = ordini?.filter(o => o.stato === 'pagato').reduce((s, o) => s + parseFloat(o.totale || 0), 0) || 0;
  const totBiglietti = biglietti?.length || 0;

  document.getElementById('tasting-kpi').innerHTML = [
    { label: 'Eventi totali', val: totEventi, col: V },
    { label: 'Pubblicati', val: attivi, col: T },
    { label: 'Biglietti venduti', val: totBiglietti, col: A },
    { label: 'Incasso totale', val: '€' + incasso.toFixed(2), col: V },
  ].map(k => `
    <div style="background:#fff;border:1px solid #eee;border-radius:12px;padding:16px 20px;border-top:3px solid ${k.col}">
      <div style="font-size:12px;color:#888;margin-bottom:6px">${k.label}</div>
      <div style="font-size:24px;font-weight:600;color:${k.col}">${k.val}</div>
    </div>`).join('');
}

// ============================================
// LISTA EVENTI
// ============================================
let filtroCorrente = 'tutti';
async function caricaLista(filtro = 'tutti') {
  filtroCorrente = filtro;

  // aggiorna stile filtri
  ['tutti','bozza','pubblicato','concluso','annullato'].forEach(s => {
    const btn = document.getElementById('filtro-' + s);
    if (!btn) return;
    btn.style.borderColor = s === filtro ? V : '#ddd';
    btn.style.background = s === filtro ? BG : '#fff';
    btn.style.color = s === filtro ? V : '#666';
  });

  let q = supa().from('ticket_eventi').select(`
    id, nome, sottotitolo, tipo, stato, data_inizio, data_fine,
    luogo, immagine_url, capacita_totale, slug, created_at,
    ticket_categorie_prezzo(id, nome, prezzo, consumazioni_incluse, quantita_venduta, quantita_disponibile)
  `).eq('azienda_id', aziendaId).order('data_inizio', { ascending: false });

  if (filtro !== 'tutti') q = q.eq('stato', filtro);
  const { data: eventi, error } = await q;

  const lista = document.getElementById('tasting-lista');
  if (error || !eventi?.length) {
    lista.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:#aaa">
        <div style="font-size:48px;margin-bottom:12px">🎪</div>
        <div style="font-size:16px;margin-bottom:8px">Nessun evento</div>
        <div style="font-size:13px">Crea il tuo primo evento Tasting</div>
      </div>`;
    return;
  }

  lista.innerHTML = eventi.map(e => {
    const dataI = new Date(e.data_inizio).toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric' });
    const dataF = new Date(e.data_fine).toLocaleDateString('it-IT', { day:'2-digit', month:'short' });
    const venduti = e.ticket_categorie_prezzo?.reduce((s, c) => s + (c.quantita_venduta || 0), 0) || 0;
    const disponibili = e.ticket_categorie_prezzo?.reduce((s, c) => s + (c.quantita_disponibile || 0), 0) || 0;
    const percFill = disponibili > 0 ? Math.round((venduti / disponibili) * 100) : 0;
    const statoCol = { bozza:'#888', pubblicato:T, concluso:V, annullato:'#e53e3e' }[e.stato] || '#888';
    const statoLabel = { bozza:'Bozza', pubblicato:'Pubblicato', concluso:'Concluso', annullato:'Annullato' }[e.stato] || e.stato;
    const tipoCol = e.tipo === 'consumazione' ? A : V;
    const tipoLabel = e.tipo === 'consumazione' ? '🍕 Consumazione' : '🎫 Ingresso';

    return `
      <div style="background:#fff;border:1px solid #eee;border-radius:14px;overflow:hidden;display:flex;gap:0">
        <!-- Foto -->
        <div style="width:160px;min-height:140px;flex-shrink:0;background:${BG};position:relative;overflow:hidden">
          ${e.immagine_url
            ? `<img src="${e.immagine_url}" style="width:100%;height:100%;object-fit:cover">`
            : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:40px">🎪</div>`}
          <span style="position:absolute;top:8px;left:8px;background:${statoCol};color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:500">${statoLabel}</span>
        </div>

        <!-- Info -->
        <div style="flex:1;padding:16px 20px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-size:11px;background:${tipoCol}22;color:${tipoCol};border-radius:4px;padding:2px 8px;font-weight:500">${tipoLabel}</span>
              </div>
              <h3 style="margin:0 0 4px;font-size:17px;font-weight:600;color:#1a1a1a">${e.nome}</h3>
              ${e.sottotitolo ? `<p style="margin:0 0 8px;font-size:13px;color:#666">${e.sottotitolo}</p>` : ''}
              <div style="font-size:12px;color:#888;display:flex;gap:16px;flex-wrap:wrap">
                <span>📅 ${dataI} → ${dataF}</span>
                ${e.luogo ? `<span>📍 ${e.luogo}</span>` : ''}
              </div>
            </div>

            <!-- Azioni -->
            <div style="display:flex;gap:8px;flex-shrink:0">
              ${e.stato === 'bozza' ? `
                <button onclick="window._tastingToggleStato('${e.id}','pubblicato')"
                  style="padding:6px 14px;background:${T};color:#fff;border:none;border-radius:8px;font-size:12px;cursor:pointer;font-weight:500">
                  Pubblica
                </button>` : ''}
              ${e.stato === 'pubblicato' ? `
                <button onclick="window._tastingToggleStato('${e.id}','concluso')"
                  style="padding:6px 14px;background:#f0f0f0;color:#666;border:none;border-radius:8px;font-size:12px;cursor:pointer">
                  Concludi
                </button>` : ''}
              <button onclick="window._tastingEditEvento('${e.id}')"
                style="padding:6px 14px;background:${BG};color:${V};border:1px solid ${V};border-radius:8px;font-size:12px;cursor:pointer;font-weight:500">
                Modifica
              </button>
              <button onclick="window._tastingDeleteEvento('${e.id}')"
                style="padding:6px 12px;background:#fff0f0;color:#e53e3e;border:1px solid #fca5a5;border-radius:8px;font-size:12px;cursor:pointer">
                🗑
              </button>
            </div>
          </div>

          <!-- Barra biglietti -->
          ${disponibili > 0 ? `
            <div style="margin-top:12px">
              <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;margin-bottom:4px">
                <span>${venduti} / ${disponibili} biglietti venduti</span>
                <span style="color:${percFill > 80 ? '#e53e3e' : T};font-weight:500">${percFill}%</span>
              </div>
              <div style="height:4px;background:#f0f0f0;border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${percFill}%;background:${percFill > 80 ? '#e53e3e' : T};border-radius:4px;transition:width .3s"></div>
              </div>
            </div>` : ''}

          <!-- Categorie prezzo -->
          ${e.ticket_categorie_prezzo?.length ? `
            <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
              ${e.ticket_categorie_prezzo.map(c => `
                <span style="font-size:11px;background:#f9f9f9;border:1px solid #eee;border-radius:6px;padding:3px 10px;color:#555">
                  ${c.nome} — €${parseFloat(c.prezzo).toFixed(2)}${c.consumazioni_incluse ? ` · ${c.consumazioni_incluse} cons.` : ''}
                </span>`).join('')}
            </div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ============================================
// MODALE
// ============================================
async function apriModal(eventoId) {
  eventoCorrente = null;
  tabCorrente = 'info';

  if (eventoId) {
    const { data } = await supa().from('ticket_eventi').select('*').eq('id', eventoId).single();
    eventoCorrente = data;
  }

  document.getElementById('modal-titolo').textContent = eventoCorrente ? 'Modifica evento' : 'Nuovo evento';
  document.getElementById('tasting-modal').style.display = 'block';
  document.body.style.overflow = 'hidden';

  const btnPubblica = document.getElementById('btn-pubblica');
  if (eventoCorrente?.stato === 'bozza') {
    btnPubblica.style.display = 'inline-block';
  } else {
    btnPubblica.style.display = 'none';
  }

  aggiornaStatoBadge();
  cambiaTab('info');
}

function chiudiModal() {
  document.getElementById('tasting-modal').style.display = 'none';
  document.body.style.overflow = '';
  eventoCorrente = null;
}

function aggiornaStatoBadge() {
  const el = document.getElementById('modal-stato-badge');
  if (!eventoCorrente) { el.innerHTML = ''; return; }
  const col = { bozza:'#888', pubblicato:T, concluso:V, annullato:'#e53e3e' }[eventoCorrente.stato] || '#888';
  const label = { bozza:'Bozza', pubblicato:'Pubblicato', concluso:'Concluso', annullato:'Annullato' }[eventoCorrente.stato] || '';
  el.innerHTML = `<span style="background:${col}22;color:${col};border-radius:6px;padding:4px 12px;font-size:12px;font-weight:500">${label}</span>`;
}

// ============================================
// TAB
// ============================================
function cambiaTab(tab) {
  tabCorrente = tab;
  ['info','categorie','slot','postazioni','foto','sezioni'].forEach(t => {
    const btn = document.getElementById('tab-' + t);
    if (!btn) return;
    btn.style.borderBottomColor = t === tab ? V : 'transparent';
    btn.style.color = t === tab ? V : '#666';
    btn.style.fontWeight = t === tab ? '500' : '400';
  });

  const body = document.getElementById('modal-body');
  switch (tab) {
    case 'info': renderTabInfo(body); break;
    case 'categorie': renderTabCategorie(body); break;
    case 'slot': renderTabSlot(body); break;
    case 'postazioni': renderTabPostazioni(body); break;
    case 'foto': renderTabFoto(body); break;
    case 'sezioni': renderTabSezioni(body); break;
  }
}

// ============================================
// TAB INFO
// ============================================
function renderTabInfo(body) {
  const e = eventoCorrente || {};
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div style="grid-column:1/-1">
        <label style="font-size:12px;color:#666;font-weight:500">Nome evento *</label>
        <input id="ev-nome" value="${e.nome || ''}" placeholder="es. Festa della Pizza DOC 2026"
          style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
      </div>
      <div style="grid-column:1/-1">
        <label style="font-size:12px;color:#666;font-weight:500">Sottotitolo</label>
        <input id="ev-sottotitolo" value="${e.sottotitolo || ''}" placeholder="Una serata tra sapori autentici e tradizione"
          style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
      </div>

      <div>
        <label style="font-size:12px;color:#666;font-weight:500">Tipo evento *</label>
        <select id="ev-tipo" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
          <option value="ingresso" ${e.tipo === 'ingresso' ? 'selected' : ''}>🎫 Ingresso semplice</option>
          <option value="consumazione" ${e.tipo === 'consumazione' ? 'selected' : ''}>🍕 A consumazione</option>
        </select>
      </div>
      <div>
        <label style="font-size:12px;color:#666;font-weight:500">Slug URL *</label>
        <input id="ev-slug" value="${e.slug || ''}" placeholder="festa-pizza-2026"
          style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
        <div style="font-size:11px;color:#aaa;margin-top:3px">tasting.ristoflow-ai.com/e/<span id="slug-preview">${e.slug || '...'}</span></div>
      </div>

      <div>
        <label style="font-size:12px;color:#666;font-weight:500">Data e ora inizio *</label>
        <input id="ev-data-inizio" type="datetime-local" value="${e.data_inizio ? e.data_inizio.slice(0,16) : ''}"
          style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:12px;color:#666;font-weight:500">Data e ora fine *</label>
        <input id="ev-data-fine" type="datetime-local" value="${e.data_fine ? e.data_fine.slice(0,16) : ''}"
          style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
      </div>

      <div>
        <label style="font-size:12px;color:#666;font-weight:500">Luogo</label>
        <input id="ev-luogo" value="${e.luogo || ''}" placeholder="Piazza del Comune, Orte"
          style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:12px;color:#666;font-weight:500">Indirizzo completo</label>
        <input id="ev-indirizzo" value="${e.indirizzo || ''}" placeholder="Via Roma 1, 01028 Orte VT"
          style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
      </div>

      <div>
        <label style="font-size:12px;color:#666;font-weight:500">Capienza totale</label>
        <input id="ev-capacita" type="number" value="${e.capacita_totale || 100}"
          style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:12px;color:#666;font-weight:500">Organizzatore</label>
        <input id="ev-organizzatore" value="${e.organizzatore || ''}" placeholder="Pro Loco Orte"
          style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
      </div>

      <div style="grid-column:1/-1">
        <label style="font-size:12px;color:#666;font-weight:500">Descrizione breve</label>
        <textarea id="ev-descrizione" rows="2" placeholder="Descrizione breve per la card evento..."
          style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box;resize:vertical">${e.descrizione || ''}</textarea>
      </div>
      <div style="grid-column:1/-1">
        <label style="font-size:12px;color:#666;font-weight:500">Storia dell'evento</label>
        <textarea id="ev-storia" rows="4" placeholder="Racconta la storia, la tradizione, il territorio..."
          style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box;resize:vertical">${e.storia || ''}</textarea>
      </div>

      <div style="grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
        <div>
          <div id="upload-copertina-html"></div>
          <input id="ev-immagine" type="hidden" value="${e.immagine_url || ''}">
        </div>
        <div>
          <div id="upload-logo-html"></div>
          <input id="ev-logo" type="hidden" value="${e.logo_url || ''}">
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">URL video (YouTube/Vimeo)</label>
          <input id="ev-video" value="${e.video_url || ''}" placeholder="https://youtube.com/embed/..."
            style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
        </div>
      </div>

      <div style="grid-column:1/-1">
        <label style="font-size:12px;color:#666;font-weight:500">Meta descrizione SEO</label>
        <input id="ev-meta" value="${e.meta_descrizione || ''}" placeholder="Descrizione per Google e social..."
          style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
      </div>
    </div>
  `;

  const nomeEl = document.getElementById('ev-nome');
  const slugEl = document.getElementById('ev-slug');
  if (nomeEl && !eventoCorrente) {
    nomeEl.addEventListener('input', () => {
      const slug = nomeEl.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      slugEl.value = slug;
      const preview = document.getElementById('slug-preview');
      if (preview) preview.textContent = slug || '...';
    });
  }
  if (slugEl) {
    slugEl.addEventListener('input', () => {
      const preview = document.getElementById('slug-preview');
      if (preview) preview.textContent = slugEl.value || '...';
    });
  }

  // Init upload boxes
  const copEl = document.getElementById('upload-copertina-html');
  const logoEl = document.getElementById('upload-logo-html');
  if (copEl) copEl.innerHTML = renderUploadBox('copertina', 'Foto copertina', e.immagine_url || '', 'window._tastingUploadCopertina(event)', V);
  if (logoEl) logoEl.innerHTML = renderUploadBox('logo', 'Logo evento', e.logo_url || '', 'window._tastingUploadLogo(event)', A);

  window._tastingUploadCopertina = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    const box = document.getElementById('upload-box-copertina');
    if (box) box.style.opacity = '0.5';
    try {
      const url = await uploadTastingMedia(file, 'copertine');
      document.getElementById('ev-immagine').value = url;
      const prev = document.getElementById('upload-preview-copertina');
      if (prev) { prev.outerHTML = '<img id="upload-preview-copertina" src="' + url + '" style="max-height:80px;max-width:100%;border-radius:6px;object-fit:cover;display:block;margin:0 auto 8px">'; }
      if (box) { box.style.opacity = '1'; box.style.borderColor = V; box.style.background = V + '08'; }
      mostraToast('✅ Copertina caricata');
    } catch(err) { alert('Errore upload: ' + err.message); if (box) box.style.opacity = '1'; }
  };

  window._tastingUploadLogo = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    const box = document.getElementById('upload-box-logo');
    if (box) box.style.opacity = '0.5';
    try {
      const url = await uploadTastingMedia(file, 'loghi');
      document.getElementById('ev-logo').value = url;
      const prev = document.getElementById('upload-preview-logo');
      if (prev) { prev.outerHTML = '<img id="upload-preview-logo" src="' + url + '" style="max-height:80px;max-width:100%;border-radius:6px;object-fit:contain;display:block;margin:0 auto 8px">'; }
      if (box) { box.style.opacity = '1'; box.style.borderColor = A; box.style.background = A + '08'; }
      mostraToast('✅ Logo caricato');
    } catch(err) { alert('Errore upload: ' + err.message); if (box) box.style.opacity = '1'; }
  };
}

// ============================================
// TAB CATEGORIE PREZZO
// ============================================
async function renderTabCategorie(body) {
  if (!eventoCorrente) {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:#aaa">Salva prima l'evento per aggiungere categorie biglietti</div>`;
    return;
  }

  const { data: cats } = await supa().from('ticket_categorie_prezzo')
    .select('*').eq('evento_id', eventoCorrente.id).order('ordine');

  body.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <div style="font-size:15px;font-weight:500;color:#1a1a1a">Categorie biglietti</div>
        <div style="font-size:12px;color:#888;margin-top:2px">Es. Ingresso €10, 3 Pizze €9, 5 Pizze + Vino €14, VIP €25</div>
      </div>
      <button onclick="window._tastingNuovaCategoria()" style="background:${V};color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer">+ Aggiungi</button>
    </div>
    <div id="lista-categorie">
      ${!cats?.length ? `<div style="text-align:center;padding:40px;color:#aaa;background:#fafafa;border-radius:10px">Nessuna categoria — aggiungi la prima</div>` :
        cats.map(c => renderCategoriaCard(c)).join('')}
    </div>
  `;

  window._tastingNuovaCategoria = () => apriFormCategoria(null);
  window._tastingEditCategoria = (id) => apriFormCategoria(id);
  window._tastingDeleteCategoria = async (id) => {
    if (!confirm('Eliminare questa categoria?')) return;
    await supa().from('ticket_categorie_prezzo').delete().eq('id', id);
    renderTabCategorie(body);
  };
  window._tastingToggleCategoria = async (id, val) => {
    await supa().from('ticket_categorie_prezzo').update({ attiva: val }).eq('id', id);
    renderTabCategorie(body);
  };
}

function renderCategoriaCard(c) {
  const icona = c.icona || (c.consumazioni_incluse ? '🍽️' : '🎫');
  return `
    <div style="background:#fff;border:1px solid #eee;border-radius:10px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:14px">
      <div style="width:44px;height:44px;border-radius:10px;background:${c.colore || V}22;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${icona}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:15px;font-weight:500;color:#1a1a1a">${c.nome}</span>
          ${c.in_evidenza ? `<span style="font-size:10px;background:${A}22;color:${A};border-radius:4px;padding:1px 6px;font-weight:500">⭐ Più scelto</span>` : ''}
          ${!c.attiva ? `<span style="font-size:10px;background:#f0f0f0;color:#999;border-radius:4px;padding:1px 6px">Disattivato</span>` : ''}
        </div>
        <div style="font-size:12px;color:#888;margin-top:3px;display:flex;gap:12px;flex-wrap:wrap">
          <span>€${parseFloat(c.prezzo).toFixed(2)}</span>
          ${c.consumazioni_incluse ? `<span>🍽️ ${c.consumazioni_incluse} consumazioni</span>` : '<span>🎫 Solo ingresso</span>'}
          <span>📦 ${c.quantita_venduta}/${c.quantita_disponibile} venduti</span>
          ${c.data_fine_vendita ? `<span>⏰ fino al ${new Date(c.data_fine_vendita).toLocaleDateString('it-IT')}</span>` : ''}
        </div>
        ${c.descrizione ? `<div style="font-size:12px;color:#aaa;margin-top:2px">${c.descrizione}</div>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button onclick="window._tastingToggleCategoria('${c.id}',${!c.attiva})"
          style="padding:5px 10px;border:1px solid #ddd;border-radius:6px;background:#fff;font-size:12px;cursor:pointer">
          ${c.attiva ? 'Disattiva' : 'Attiva'}
        </button>
        <button onclick="window._tastingEditCategoria('${c.id}')"
          style="padding:5px 10px;background:${BG};color:${V};border:1px solid ${V};border-radius:6px;font-size:12px;cursor:pointer">Modifica</button>
        <button onclick="window._tastingDeleteCategoria('${c.id}')"
          style="padding:5px 8px;background:#fff0f0;color:#e53e3e;border:1px solid #fca5a5;border-radius:6px;font-size:12px;cursor:pointer">🗑</button>
      </div>
    </div>`;
}

async function apriFormCategoria(catId) {
  let cat = {};
  if (catId) {
    const { data } = await supa().from('ticket_categorie_prezzo').select('*').eq('id', catId).single();
    cat = data || {};
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px`;
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:24px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 style="margin:0;font-size:16px;font-weight:500;color:${V}">${catId ? 'Modifica' : 'Nuova'} categoria</h3>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#aaa">✕</button>
      </div>
      <div style="display:grid;gap:14px">
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Nome *</label>
          <input id="cat-nome" value="${cat.nome || ''}" placeholder="es. 3 Pizze, VIP, Ingresso"
            style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Descrizione</label>
          <input id="cat-desc" value="${cat.descrizione || ''}" placeholder="es. Inclusi: 3 pizze a scelta + 1 bibita"
            style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#666;font-weight:500">Prezzo (€) *</label>
            <input id="cat-prezzo" type="number" step="0.50" value="${cat.prezzo || ''}" placeholder="0.00"
              style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:12px;color:#666;font-weight:500">Consumazioni incluse</label>
            <input id="cat-cons" type="number" value="${cat.consumazioni_incluse || ''}" placeholder="vuoto = solo ingresso"
              style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#666;font-weight:500">Quantità disponibile</label>
            <input id="cat-qty" type="number" value="${cat.quantita_disponibile || 100}"
              style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:12px;color:#666;font-weight:500">Icona</label>
            <input id="cat-icona" value="${cat.icona || ''}" placeholder="🍕 🍷 🎫 ⭐"
              style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#666;font-weight:500">Colore card</label>
            <div style="display:flex;gap:8px;margin-top:4px">
              ${[V, A, T, '#e53e3e', '#1a1a1a'].map(col => `
                <div onclick="document.getElementById('cat-colore').value='${col}';this.parentElement.querySelectorAll('div').forEach(d=>d.style.outline='none');this.style.outline='2px solid #333'"
                  style="width:28px;height:28px;border-radius:6px;background:${col};cursor:pointer;outline:${(cat.colore||V)===col?'2px solid #333':'none'}"></div>`).join('')}
              <input id="cat-colore" type="color" value="${cat.colore || V}" style="width:28px;height:28px;padding:0;border:1px solid #ddd;border-radius:6px;cursor:pointer">
            </div>
          </div>
          <div>
            <label style="font-size:12px;color:#666;font-weight:500">Fine vendita</label>
            <input id="cat-fine-vendita" type="datetime-local" value="${cat.data_fine_vendita ? cat.data_fine_vendita.slice(0,16) : ''}"
              style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
          </div>
        </div>
        <div style="display:flex;gap:20px">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
            <input type="checkbox" id="cat-evidenza" ${cat.in_evidenza ? 'checked' : ''}> Badge "Più scelto"
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
            <input type="checkbox" id="cat-online" ${cat.vendita_online !== false ? 'checked' : ''}> Vendita online
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
            <input type="checkbox" id="cat-cassa" ${cat.vendita_cassa !== false ? 'checked' : ''}> Vendita cassa
          </label>
        </div>
        <button onclick="window._tastingSalvaCategoria('${catId || ''}')"
          style="padding:12px;background:${V};color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;width:100%">
          ${catId ? 'Salva modifiche' : 'Aggiungi categoria'}
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  window._tastingSalvaCategoria = async (id) => {
    const payload = {
      evento_id: eventoCorrente.id,
      nome: document.getElementById('cat-nome').value.trim(),
      descrizione: document.getElementById('cat-desc').value.trim() || null,
      prezzo: parseFloat(document.getElementById('cat-prezzo').value) || 0,
      consumazioni_incluse: parseInt(document.getElementById('cat-cons').value) || null,
      quantita_disponibile: parseInt(document.getElementById('cat-qty').value) || 100,
      icona: document.getElementById('cat-icona').value.trim() || null,
      colore: document.getElementById('cat-colore').value,
      in_evidenza: document.getElementById('cat-evidenza').checked,
      vendita_online: document.getElementById('cat-online').checked,
      vendita_cassa: document.getElementById('cat-cassa').checked,
      data_fine_vendita: document.getElementById('cat-fine-vendita').value || null,
    };
    if (!payload.nome || !payload.prezzo) { alert('Nome e prezzo obbligatori'); return; }
    try {
      if (id) {
        await supa().from('ticket_categorie_prezzo').update(payload).eq('id', id);
      } else {
        await supa().from('ticket_categorie_prezzo').insert(payload);
      }
      overlay.remove();
      renderTabCategorie(document.getElementById('modal-body'));
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  };
}

// ============================================

// ============================================
// TAB SLOT
// ============================================
async function renderTabSlot(body) {
  if (!eventoCorrente) {
    body.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa">Salva prima l&#39;evento per configurare gli slot</div>';
    return;
  }

  const { data: slots } = await supa().from('ticket_slot')
    .select('id,data,ora_inizio,ora_fine,capacita_totale,venduti_totale,attivo,evento_id,ticket_slot_categorie(id,capacita,venduti,categoria_id)')
    .eq('evento_id', eventoCorrente.id)
    .order('data').order('ora_inizio');

  const { data: cats } = await supa().from('ticket_categorie_prezzo')
    .select('id,nome,colore,icona,consumazioni_incluse')
    .eq('evento_id', eventoCorrente.id)
    .eq('attiva', true)
    .order('ordine');

  const capTotale = eventoCorrente.capacita_totale || 100;
  const nCats = cats ? cats.length : 1;
  const dataI = eventoCorrente.data_inizio ? eventoCorrente.data_inizio.slice(0,10) : '';
  const dataF = eventoCorrente.data_fine ? eventoCorrente.data_fine.slice(0,10) : '';
  const oraI = eventoCorrente.data_inizio ? new Date(eventoCorrente.data_inizio).toTimeString().slice(0,5) : '18:00';
  const oraF = eventoCorrente.data_fine ? new Date(eventoCorrente.data_fine).toTimeString().slice(0,5) : '22:00';
  const intervConsigliato = Math.max(10, Math.ceil(capTotale / 4 / 5) * 5);

  let catHtml = '';
  if (cats && cats.length > 0) {
    cats.forEach(function(c) {
      const isVip = (c.icona === '⭐') || c.nome.toLowerCase().includes('vip');
      const perc = isVip ? 15 : Math.floor(100 / nCats);
      const pax = Math.floor(capTotale * perc / 100);
      catHtml += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'
        + '<span style="font-size:16px">' + (c.icona || '🎫') + '</span>'
        + '<span style="font-size:13px;font-weight:500;min-width:120px;color:#333">' + c.nome + '</span>'
        + '<input type="number" id="sl-cat-' + c.id + '" value="' + pax + '" min="0" oninput="window._tastingAggiornaConsiglio()" style="width:80px;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:13px">'
        + '<span style="font-size:12px;color:#aaa">posti/slot</span>'
        + '<span id="sl-cat-perc-' + c.id + '" style="font-size:11px;color:' + (c.colore || '#7C3AED') + ';background:' + (c.colore || '#7C3AED') + '22;border-radius:4px;padding:2px 6px">' + perc + '%</span>'
        + '</div>';
    });
  }

  let slotsHtml = '';
  if (!slots || slots.length === 0) {
    slotsHtml = '<div style="text-align:center;padding:40px;color:#aaa;background:#fafafa;border-radius:10px"><div style="font-size:32px;margin-bottom:10px">⏱️</div>Nessuno slot — usa il generatore</div>';
  } else {
    slotsHtml = renderSlotPerGiorno(slots);
  }

  body.innerHTML = ''
    + '<div style="background:#F5F3FF;border:1.5px solid #7C3AED;border-radius:12px;padding:20px;margin-bottom:24px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">'
    + '<span style="font-size:18px">🤖</span>'
    + '<div><div style="font-size:14px;font-weight:500;color:#7C3AED">Generatore automatico slot</div>'
    + '<div style="font-size:12px;color:#888">Consiglio basato su capienza evento (' + capTotale + ' pax)</div></div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px">'
    + '<div><label style="font-size:11px;color:#666;font-weight:500">Data inizio</label><input id="sl-data-inizio" type="date" value="' + dataI + '" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box"></div>'
    + '<div><label style="font-size:11px;color:#666;font-weight:500">Data fine</label><input id="sl-data-fine" type="date" value="' + dataF + '" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box"></div>'
    + '<div><label style="font-size:11px;color:#666;font-weight:500">Ora inizio</label><input id="sl-ora-inizio" type="time" value="' + oraI + '" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box"></div>'
    + '<div><label style="font-size:11px;color:#666;font-weight:500">Ora fine</label><input id="sl-ora-fine" type="time" value="' + oraF + '" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box"></div>'
    + '<div><label style="font-size:11px;color:#666;font-weight:500">Intervallo (min) — consigliato: ' + intervConsigliato + ' min</label><input id="sl-intervallo" type="number" value="' + intervConsigliato + '" min="5" max="120" step="5" oninput="window._tastingAggiornaConsiglio()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box"></div>'
    + '<div><label style="font-size:11px;color:#666;font-weight:500">Capienza per slot</label><input id="sl-capacita" type="number" value="' + capTotale + '" min="1" oninput="window._tastingAggiornaConsiglio()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box"></div>'
    + '</div>'
    + (cats && cats.length > 0
        ? '<div style="background:#fff;border-radius:8px;padding:14px;margin-bottom:14px"><div style="font-size:12px;font-weight:500;color:#555;margin-bottom:10px">Distribuzione capienza per categoria</div>' + catHtml + '<div id="sl-totale-check" style="margin-top:10px;font-size:12px;padding:8px;border-radius:6px;background:#f0fdf4;color:#16a34a">✓ Distribuzione configurata</div></div>'
        : '<div style="font-size:12px;color:#aaa;margin-bottom:14px">⚠️ Aggiungi prima le categorie biglietti</div>')
    + '<div id="sl-preview" style="font-size:12px;color:#666;margin-bottom:14px;padding:10px;background:#fff;border-radius:8px"></div>'
    + '<button onclick="window._tastingGeneraSlot()" style="width:100%;padding:12px;background:#7C3AED;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer">⚡ Genera slot automaticamente</button>'
    + '</div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
    + '<div style="font-size:14px;font-weight:500;color:#333">Slot configurati (' + (slots ? slots.length : 0) + ')</div>'
    + (slots && slots.length > 0 ? '<button onclick="window._tastingEliminaSlot()" style="padding:6px 14px;background:#fff0f0;color:#e53e3e;border:1px solid #fca5a5;border-radius:8px;font-size:12px;cursor:pointer">🗑 Elimina tutti e rigenera</button>' : '')
    + '</div>'
    + '<div id="lista-slot">' + slotsHtml + '</div>';

  window._tastingAggiornaConsiglio = function() { aggiornaPreviewSlot(cats); };
  window._tastingGeneraSlot = function() { generaSlot(cats); };
  window._tastingEliminaSlot = function() { eliminaTuttiSlot(); };
  window._tastingToggleSlot = async function(id, val) {
    await supa().from('ticket_slot').update({ attiva: val }).eq('id', id);
    renderTabSlot(body);
  };
  aggiornaPreviewSlot(cats);
}

function renderSlotPerGiorno(slots) {
  var perGiorno = {};
  slots.forEach(function(s) {
    if (!perGiorno[s.data]) perGiorno[s.data] = [];
    perGiorno[s.data].push(s);
  });
  var html = '';
  Object.keys(perGiorno).sort().forEach(function(data) {
    var slotG = perGiorno[data];
    var dataFmt = new Date(data + 'T12:00:00').toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' });
    var totV = slotG.reduce(function(s, sl) { return s + (sl.venduti_totale || 0); }, 0);
    var totC = slotG.reduce(function(s, sl) { return s + sl.capacita_totale; }, 0);
    html += '<div style="margin-bottom:16px">'
      + '<div style="font-size:13px;font-weight:500;color:#555;padding:8px 0;border-bottom:1px solid #eee;margin-bottom:8px;display:flex;justify-content:space-between">'
      + '<span>📅 ' + dataFmt + '</span><span style="color:#aaa;font-size:12px">' + totV + '/' + totC + ' venduti</span></div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px">';
    slotG.forEach(function(sl) {
      var perc = sl.capacita_totale > 0 ? Math.round((sl.venduti_totale / sl.capacita_totale) * 100) : 0;
      var colBar = perc >= 90 ? '#e53e3e' : perc >= 70 ? '#B45309' : '#0D9488';
      html += '<div style="background:#fff;border:1px solid ' + (sl.attiva ? '#eee' : '#f5f5f5') + ';border-radius:10px;padding:12px;opacity:' + (sl.attiva ? 1 : 0.6) + '">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
        + '<span style="font-size:15px;font-weight:600">' + sl.ora_inizio.slice(0,5) + (sl.ora_fine ? ' → ' + sl.ora_fine.slice(0,5) : '') + '</span>'
        + '<span style="width:8px;height:8px;border-radius:50%;background:' + (sl.attiva ? '#0D9488' : '#ccc') + ';display:inline-block"></span></div>'
        + '<div style="font-size:12px;color:#888;margin-bottom:6px">' + (sl.venduti_totale || 0) + '/' + sl.capacita_totale + ' posti</div>'
        + '<div style="height:4px;background:#f0f0f0;border-radius:4px;overflow:hidden;margin-bottom:8px">'
        + '<div style="height:100%;width:' + perc + '%;background:' + colBar + ';border-radius:4px"></div></div>'
        + '<button onclick="window._tastingToggleSlot(\"' + sl.id + '\",'+(!sl.attiva)+')" style="width:100%;padding:4px;border:1px solid #ddd;border-radius:6px;background:#fff;font-size:11px;cursor:pointer;color:#666">'
        + (sl.attiva ? 'Disattiva' : 'Riattiva') + '</button></div>';
    });
    html += '</div></div>';
  });
  return html;
}

function aggiornaPreviewSlot(cats) {
  var dataI = document.getElementById('sl-data-inizio') ? document.getElementById('sl-data-inizio').value : '';
  var dataF = document.getElementById('sl-data-fine') ? document.getElementById('sl-data-fine').value : '';
  var oraI = document.getElementById('sl-ora-inizio') ? document.getElementById('sl-ora-inizio').value : '';
  var oraF = document.getElementById('sl-ora-fine') ? document.getElementById('sl-ora-fine').value : '';
  var interv = parseInt(document.getElementById('sl-intervallo') ? document.getElementById('sl-intervallo').value : 20) || 20;
  var cap = parseInt(document.getElementById('sl-capacita') ? document.getElementById('sl-capacita').value : 100) || 100;
  var preview = document.getElementById('sl-preview');
  if (!preview || !dataI || !oraI || !oraF) return;

  var d1 = new Date(dataI + 'T12:00:00');
  var d2 = new Date((dataF || dataI) + 'T12:00:00');
  var giorni = Math.floor((d2 - d1) / 86400000) + 1;
  var oraIParts = oraI.split(':').map(Number);
  var oraFParts = oraF.split(':').map(Number);
  var minTot = (oraFParts[0] * 60 + oraFParts[1]) - (oraIParts[0] * 60 + oraIParts[1]);
  var slotPerGiorno = minTot > 0 ? Math.floor(minTot / interv) : 0;
  var totSlot = slotPerGiorno * giorni;

  if (cats) {
    cats.forEach(function(c) {
      var input = document.getElementById('sl-cat-' + c.id);
      var percEl = document.getElementById('sl-cat-perc-' + c.id);
      if (input && percEl) percEl.textContent = cap > 0 ? Math.round(parseInt(input.value || 0) / cap * 100) + '%' : '0%';
    });
    var totCheck = document.getElementById('sl-totale-check');
    if (totCheck) {
      var somma = cats.reduce(function(s, c) { return s + (parseInt(document.getElementById('sl-cat-' + c.id) ? document.getElementById('sl-cat-' + c.id).value : 0) || 0); }, 0);
      var ok = somma === cap;
      totCheck.style.background = ok ? '#f0fdf4' : '#fff0f0';
      totCheck.style.color = ok ? '#16a34a' : '#e53e3e';
      totCheck.textContent = ok ? '✓ Totale: ' + somma + ' posti/slot' : '⚠️ Totale: ' + somma + '/' + cap + (somma < cap ? ' — mancano ' + (cap - somma) : ' — eccesso di ' + (somma - cap)) + ' posti';
    }
  }

  preview.innerHTML = totSlot > 0
    ? '📊 <strong>' + totSlot + ' slot</strong> (' + slotPerGiorno + '/giorno × ' + giorni + ' giorn' + (giorni === 1 ? 'o' : 'i') + ') · <strong>' + (totSlot * cap).toLocaleString('it-IT') + ' posti totali</strong>'
    : '⚠️ Controlla date e orari';
}

async function generaSlot(cats) {
  var dataI = document.getElementById('sl-data-inizio') ? document.getElementById('sl-data-inizio').value : '';
  var dataF = document.getElementById('sl-data-fine') ? document.getElementById('sl-data-fine').value : '';
  var oraI = document.getElementById('sl-ora-inizio') ? document.getElementById('sl-ora-inizio').value : '';
  var oraF = document.getElementById('sl-ora-fine') ? document.getElementById('sl-ora-fine').value : '';
  var interv = parseInt(document.getElementById('sl-intervallo') ? document.getElementById('sl-intervallo').value : 20) || 20;
  var cap = parseInt(document.getElementById('sl-capacita') ? document.getElementById('sl-capacita').value : 100) || 100;
  if (!dataI || !oraI || !oraF) { alert('Compila data, ora inizio e ora fine'); return; }

  var oraIParts = oraI.split(':').map(Number);
  var oraFParts = oraF.split(':').map(Number);
  var minTot = (oraFParts[0] * 60 + oraFParts[1]) - (oraIParts[0] * 60 + oraIParts[1]);
  if (minTot <= 0) { alert('Ora fine deve essere dopo ora inizio'); return; }

  var distCats = [];
  if (cats) {
    cats.forEach(function(c) {
      var el = document.getElementById('sl-cat-' + c.id);
      var v = el ? (parseInt(el.value) || 0) : 0;
      if (v > 0) distCats.push({ categoria_id: c.id, capacita: v });
    });
  }

  var d1 = new Date(dataI + 'T12:00:00');
  var d2 = new Date((dataF || dataI) + 'T12:00:00');
  var slotsToInsert = [];
  for (var d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
    var dataStr = d.toISOString().slice(0, 10);
    var minCurr = oraIParts[0] * 60 + oraIParts[1];
    var minFine = oraFParts[0] * 60 + oraFParts[1];
    while (minCurr + interv <= minFine) {
      var hI = String(Math.floor(minCurr / 60)).padStart(2, '0');
      var mI = String(minCurr % 60).padStart(2, '0');
      var minNext = minCurr + interv;
      var hF = String(Math.floor(minNext / 60)).padStart(2, '0');
      var mF = String(minNext % 60).padStart(2, '0');
      slotsToInsert.push({ evento_id: eventoCorrente.id, azienda_id: aziendaId, data: dataStr, ora_inizio: hI + ':' + mI, ora_fine: hF + ':' + mF, capacita_totale: cap, venduti_totale: 0, attivo: true });
      minCurr = minNext;
    }
  }

  if (!slotsToInsert.length) { alert('Nessuno slot da generare'); return; }
  try {
    var btn = document.querySelector('[onclick="window._tastingGeneraSlot()"]');
    if (btn) { btn.textContent = 'Generazione in corso...'; btn.disabled = true; }
    var res = await supa().from('ticket_slot').insert(slotsToInsert).select('id');
    if (res.error) throw res.error;
    var slotCreati = res.data;
    if (distCats.length && slotCreati && slotCreati.length) {
      var catRows = [];
      slotCreati.forEach(function(sl) {
        distCats.forEach(function(dc) { catRows.push({ slot_id: sl.id, categoria_id: dc.categoria_id, capacita: dc.capacita, venduti: 0 }); });
      });
      if (catRows.length) await supa().from('ticket_slot_categorie').insert(catRows);
    }
    mostraToast('✅ ' + slotCreati.length + ' slot generati');
    renderTabSlot(document.getElementById('modal-body'));
  } catch(err) { alert('Errore: ' + err.message); }
}

async function eliminaTuttiSlot() {
  if (!confirm('Eliminare tutti gli slot?')) return;
  try {
    await supa().from('ticket_slot').delete().eq('evento_id', eventoCorrente.id);
    mostraToast('🗑 Slot eliminati');
    renderTabSlot(document.getElementById('modal-body'));
  } catch(err) { alert('Errore: ' + err.message); }
}

// TAB POSTAZIONI
// ============================================
async function renderTabPostazioni(body) {
  if (!eventoCorrente) {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:#aaa">Salva prima l'evento per aggiungere postazioni</div>`;
    return;
  }
  if (eventoCorrente.tipo !== 'consumazione') {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:#aaa;background:#fafafa;border-radius:10px">
      <div style="font-size:32px;margin-bottom:10px">🎫</div>
      Le postazioni sono disponibili solo per eventi di tipo <strong>A consumazione</strong>
    </div>`;
    return;
  }

  const { data: posts } = await supa().from('ticket_postazioni')
    .select('*').eq('evento_id', eventoCorrente.id).order('ordine');

  body.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <div style="font-size:15px;font-weight:500">Postazioni percorso</div>
        <div style="font-size:12px;color:#888;margin-top:2px">Ogni postazione è un banco che l'ospite visita scansionando il QR</div>
      </div>
      <button onclick="window._tastingNuovaPostazione()" style="background:${T};color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer">+ Aggiungi postazione</button>
    </div>
    <div id="lista-postazioni">
      ${!posts?.length ? `<div style="text-align:center;padding:40px;color:#aaa;background:#fafafa;border-radius:10px">
        <div style="font-size:32px;margin-bottom:10px">🍕</div>
        Nessuna postazione — aggiungi Pizza, Vino, Birra...
      </div>` : posts.map(p => renderPostazioneCard(p)).join('')}
    </div>
  `;

  window._tastingNuovaPostazione = () => apriFormPostazione(null);
  window._tastingEditPostazione = (id) => apriFormPostazione(id);
  window._tastingDeletePostazione = async (id) => {
    if (!confirm('Eliminare questa postazione?')) return;
    await supa().from('ticket_postazioni').delete().eq('id', id);
    renderTabPostazioni(body);
  };
  window._tastingTogglePostazione = async (id, val) => {
    await supa().from('ticket_postazioni').update({ attiva: val }).eq('id', id);
    renderTabPostazioni(body);
  };
}

function renderPostazioneCard(p) {
  return `
    <div style="background:#fff;border:1px solid #eee;border-radius:10px;padding:14px 16px;margin-bottom:10px;display:flex;gap:14px;align-items:center">
      <div style="width:48px;height:48px;border-radius:10px;background:${p.colore || T}22;overflow:hidden;flex-shrink:0">
        ${p.immagine_url
          ? `<img src="${p.immagine_url}" style="width:100%;height:100%;object-fit:cover">`
          : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:24px">🍽️</div>`}
      </div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:15px;font-weight:500">${p.nome}</span>
          <span style="width:8px;height:8px;border-radius:50%;background:${p.attiva ? T : '#ccc'};display:inline-block"></span>
          ${!p.attiva ? `<span style="font-size:11px;color:#aaa">Disattivata</span>` : ''}
        </div>
        ${p.sottotitolo ? `<div style="font-size:12px;color:#888;margin-top:2px">${p.sottotitolo}</div>` : ''}
        ${p.produttore ? `<div style="font-size:12px;color:${T};margin-top:2px">👤 ${p.produttore}</div>` : ''}
        ${p.max_per_biglietto ? `<div style="font-size:11px;color:#aaa;margin-top:2px">Max ${p.max_per_biglietto} per biglietto</div>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button onclick="window._tastingTogglePostazione('${p.id}',${!p.attiva})"
          style="padding:5px 10px;border:1px solid #ddd;border-radius:6px;background:#fff;font-size:12px;cursor:pointer">
          ${p.attiva ? 'Disattiva' : 'Attiva'}
        </button>
        <button onclick="window._tastingEditPostazione('${p.id}')"
          style="padding:5px 10px;background:#e6faf7;color:${T};border:1px solid ${T};border-radius:6px;font-size:12px;cursor:pointer">Modifica</button>
        <button onclick="window._tastingDeletePostazione('${p.id}')"
          style="padding:5px 8px;background:#fff0f0;color:#e53e3e;border:1px solid #fca5a5;border-radius:6px;font-size:12px;cursor:pointer">🗑</button>
      </div>
    </div>`;
}

async function apriFormPostazione(postId) {
  let p = {};
  if (postId) {
    const { data } = await supa().from('ticket_postazioni').select('*').eq('id', postId).single();
    p = data || {};
  }
  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px`;
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:24px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 style="margin:0;font-size:16px;font-weight:500;color:${T}">${postId ? 'Modifica' : 'Nuova'} postazione</h3>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#aaa">✕</button>
      </div>
      <div style="display:grid;gap:14px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#666;font-weight:500">Nome postazione *</label>
            <input id="p-nome" value="${p.nome || ''}" placeholder="Pizza Margherita DOC"
              style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:12px;color:#666;font-weight:500">Sottotitolo</label>
            <input id="p-sotto" value="${p.sottotitolo || ''}" placeholder="Forno a legna, impasto 48h"
              style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Descrizione (storia, ingredienti...)</label>
          <textarea id="p-desc" rows="3" placeholder="Racconta la storia di questa postazione..."
            style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box;resize:vertical">${p.descrizione || ''}</textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#666;font-weight:500">Produttore / Chef</label>
            <input id="p-prod" value="${p.produttore || ''}" placeholder="Mastro Enzo, dal 1987"
              style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:12px;color:#666;font-weight:500">Max consumazioni per biglietto</label>
            <input id="p-max" type="number" value="${p.max_per_biglietto || ''}" placeholder="vuoto = illimitato"
              style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Bio produttore</label>
          <textarea id="p-bio" rows="2" placeholder="La storia del produttore..."
            style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box;resize:vertical">${p.bio_produttore || ''}</textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="font-size:12px;color:#666;font-weight:500">Foto principale</label>
            <div id="upload-post-foto-html"></div>
            <input id="p-foto" type="hidden" value="${p.immagine_url || ''}">
          </div>
          <div>
            <label style="font-size:12px;color:#666;font-weight:500">Foto produttore</label>
            <div id="upload-post-prod-html"></div>
            <input id="p-foto-prod" type="hidden" value="${p.foto_produttore_url || ''}">
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">URL video (YouTube/Vimeo)</label>
          <input id="p-video" value="${p.video_url || ''}" placeholder="https://youtube.com/embed/..."
            style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Colore card</label>
          <div style="display:flex;gap:8px;margin-top:6px">
            ${[T, V, A, '#e53e3e', '#8B5CF6'].map(col => `
              <div onclick="document.getElementById('p-colore').value='${col}'"
                style="width:28px;height:28px;border-radius:6px;background:${col};cursor:pointer;outline:${(p.colore||T)===col?'2px solid #333':'none'}"></div>`).join('')}
            <input id="p-colore" type="color" value="${p.colore || T}" style="width:28px;height:28px;padding:0;border:1px solid #ddd;border-radius:6px;cursor:pointer">
          </div>
        </div>
        <button onclick="window._tastingSalvaPostazione('${postId || ''}')"
          style="padding:12px;background:${T};color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;width:100%">
          ${postId ? 'Salva modifiche' : 'Aggiungi postazione'}
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const upPostEl = document.getElementById('upload-post-foto-html');
  const upProdEl = document.getElementById('upload-post-prod-html');
  if (upPostEl) upPostEl.innerHTML = renderUploadBox('post-foto', '', p.immagine_url || '', 'window._tastingUploadPostFoto(event)', '#0D9488');
  if (upProdEl) upProdEl.innerHTML = renderUploadBox('post-prod', '', p.foto_produttore_url || '', 'window._tastingUploadPostProd(event)', '#0D9488');

  window._tastingUploadPostFoto = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const url = await uploadTastingMedia(file, 'postazioni');
      document.getElementById('p-foto').value = url;
      const prev = document.getElementById('upload-preview-post-foto');
      if (prev) prev.outerHTML = '<img id="upload-preview-post-foto" src="' + url + '" style="max-height:80px;max-width:100%;border-radius:6px;object-fit:cover;display:block;margin:0 auto 8px">';
      mostraToast('✅ Foto caricata');
    } catch(err) { alert('Errore: ' + err.message); }
  };
  window._tastingUploadPostProd = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const url = await uploadTastingMedia(file, 'produttori');
      document.getElementById('p-foto-prod').value = url;
      const prev = document.getElementById('upload-preview-post-prod');
      if (prev) prev.outerHTML = '<img id="upload-preview-post-prod" src="' + url + '" style="max-height:80px;max-width:100%;border-radius:6px;object-fit:contain;display:block;margin:0 auto 8px">';
      mostraToast('✅ Foto produttore caricata');
    } catch(err) { alert('Errore: ' + err.message); }
  };

  window._tastingSalvaPostazione = async (id) => {
    const payload = {
      evento_id: eventoCorrente.id,
      azienda_id: aziendaId,
      nome: document.getElementById('p-nome').value.trim(),
      sottotitolo: document.getElementById('p-sotto').value.trim() || null,
      descrizione: document.getElementById('p-desc').value.trim() || null,
      produttore: document.getElementById('p-prod').value.trim() || null,
      bio_produttore: document.getElementById('p-bio').value.trim() || null,
      immagine_url: document.getElementById('p-foto').value.trim() || null,
      foto_produttore_url: document.getElementById('p-foto-prod').value.trim() || null,
      video_url: document.getElementById('p-video').value.trim() || null,
      colore: document.getElementById('p-colore').value,
      max_per_biglietto: parseInt(document.getElementById('p-max').value) || null,
    };
    if (!payload.nome) { alert('Nome obbligatorio'); return; }
    try {
      if (id) {
        await supa().from('ticket_postazioni').update(payload).eq('id', id);
      } else {
        await supa().from('ticket_postazioni').insert(payload);
      }
      overlay.remove();
      renderTabPostazioni(document.getElementById('modal-body'));
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  };
}

// ============================================
// TAB FOTO
// ============================================
async function renderTabFoto(body) {
  if (!eventoCorrente) {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:#aaa">Salva prima l'evento</div>`;
    return;
  }
  const { data: foto } = await supa().from('ticket_foto')
    .select('*').eq('evento_id', eventoCorrente.id).order('ordine');

  body.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:15px;font-weight:500">Galleria foto</div>
        <div style="font-size:12px;color:#888;margin-top:2px">Foto evento, territorio, produttori con copyright</div>
      </div>
      <button onclick="window._tastingNuovaFoto()" style="background:${A};color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer">+ Aggiungi foto</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px" id="griglia-foto">
      ${!foto?.length ? `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#aaa;background:#fafafa;border-radius:10px">
        <div style="font-size:32px;margin-bottom:10px">📸</div>Nessuna foto ancora
      </div>` : foto.map(f => `
        <div style="background:#fff;border:1px solid #eee;border-radius:10px;overflow:hidden">
          <div style="height:130px;background:#f5f5f5;overflow:hidden;position:relative">
            ${f.url ? `<img src="${f.url}" style="width:100%;height:100%;object-fit:cover">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:32px">🖼️</div>`}
            ${f.in_evidenza ? `<span style="position:absolute;top:6px;left:6px;background:${A};color:#fff;border-radius:4px;padding:1px 6px;font-size:10px">⭐ Hero</span>` : ''}
            <span style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,.5);color:#fff;border-radius:4px;padding:1px 6px;font-size:10px">${f.tipo}</span>
          </div>
          <div style="padding:10px">
            ${f.titolo ? `<div style="font-size:13px;font-weight:500;color:#1a1a1a;margin-bottom:2px">${f.titolo}</div>` : ''}
            ${f.didascalia ? `<div style="font-size:11px;color:#888;margin-bottom:4px">${f.didascalia}</div>` : ''}
            ${f.copyright ? `<div style="font-size:10px;color:#aaa">© ${f.copyright}</div>` : ''}
            <div style="display:flex;gap:6px;margin-top:8px">
              <button onclick="window._tastingEditFoto('${f.id}')"
                style="flex:1;padding:4px;background:#fef3c7;color:${A};border:1px solid ${A};border-radius:6px;font-size:11px;cursor:pointer">Modifica</button>
              <button onclick="window._tastingDeleteFoto('${f.id}')"
                style="padding:4px 8px;background:#fff0f0;color:#e53e3e;border:1px solid #fca5a5;border-radius:6px;font-size:11px;cursor:pointer">🗑</button>
            </div>
          </div>
        </div>`).join('')}
    </div>`;

  window._tastingNuovaFoto = () => apriFormFoto(null);
  window._tastingEditFoto = (id) => apriFormFoto(id);
  window._tastingDeleteFoto = async (id) => {
    if (!confirm('Eliminare questa foto?')) return;
    await supa().from('ticket_foto').delete().eq('id', id);
    renderTabFoto(body);
  };
}

async function apriFormFoto(fotoId) {
  let f = {};
  if (fotoId) {
    const { data } = await supa().from('ticket_foto').select('*').eq('id', fotoId).single();
    f = data || {};
  }
  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px`;
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:24px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 style="margin:0;font-size:16px;font-weight:500;color:${A}">${fotoId ? 'Modifica' : 'Nuova'} foto</h3>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#aaa">✕</button>
      </div>
      <div style="display:grid;gap:14px">
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Foto *</label>
          <div id="upload-foto-html"></div>
          <input id="f-url" type="hidden" value="${f.url || ''}">
          <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;color:#aaa">oppure URL diretto:</span>
            <input id="f-url-text" value="${f.url || ''}" placeholder="https://..."
              oninput="document.getElementById('f-url').value=this.value"
              style="flex:1;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px">
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Tipo</label>
          <select id="f-tipo" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
            ${['evento','territorio','produttore','edizioni','backstage','sponsor'].map(t =>
              `<option value="${t}" ${f.tipo===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Titolo</label>
          <input id="f-titolo" value="${f.titolo || ''}" placeholder="La piazza al tramonto"
            style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Didascalia</label>
          <input id="f-didascalia" value="${f.didascalia || ''}" placeholder="Descrizione breve della foto"
            style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Copyright</label>
          <input id="f-copyright" value="${f.copyright || ''}" placeholder="Mario Rossi Photography 2026"
            style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
          <div style="font-size:11px;color:#aaa;margin-top:3px">Apparirà come "© Mario Rossi Photography 2026"</div>
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Autore / Fonte</label>
          <input id="f-autore" value="${f.autore || ''}" placeholder="Nome fotografo o agenzia"
            style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Link autore</label>
          <input id="f-link" value="${f.link_autore || ''}" placeholder="https://instagram.com/fotografo"
            style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
          <input type="checkbox" id="f-evidenza" ${f.in_evidenza?'checked':''}> Foto in evidenza (hero gallery)
        </label>
        <button onclick="window._tastingSalvaFoto('${fotoId||''}')"
          style="padding:12px;background:${A};color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;width:100%">
          ${fotoId ? 'Salva modifiche' : 'Aggiungi foto'}
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  // Init upload box foto
  const uploadFotoEl = document.getElementById('upload-foto-html');
  if (uploadFotoEl) uploadFotoEl.innerHTML = renderUploadBox('foto-gallery', 'Carica foto', f.url || '', 'window._tastingUploadFotoGallery(event)', '#B45309');
  window._tastingUploadFotoGallery = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    const box = document.getElementById('upload-box-foto-gallery');
    if (box) box.style.opacity = '0.5';
    try {
      const url = await uploadTastingMedia(file, 'galleria');
      document.getElementById('f-url').value = url;
      const urlText = document.getElementById('f-url-text');
      if (urlText) urlText.value = url;
      const prev = document.getElementById('upload-preview-foto-gallery');
      if (prev) { prev.outerHTML = '<img id="upload-preview-foto-gallery" src="' + url + '" style="max-height:80px;max-width:100%;border-radius:6px;object-fit:cover;display:block;margin:0 auto 8px">'; }
      if (box) { box.style.opacity = '1'; box.style.borderColor = '#B45309'; box.style.background = '#B4530908'; }
      mostraToast('✅ Foto caricata');
    } catch(err) { alert('Errore upload: ' + err.message); if (box) box.style.opacity = '1'; }
  };

  window._tastingSalvaFoto = async (id) => {
    const payload = {
      evento_id: eventoCorrente.id,
      azienda_id: aziendaId,
      url: document.getElementById('f-url').value.trim(),
      tipo: document.getElementById('f-tipo').value,
      titolo: document.getElementById('f-titolo').value.trim() || null,
      didascalia: document.getElementById('f-didascalia').value.trim() || null,
      copyright: document.getElementById('f-copyright').value.trim() || null,
      autore: document.getElementById('f-autore').value.trim() || null,
      link_autore: document.getElementById('f-link').value.trim() || null,
      in_evidenza: document.getElementById('f-evidenza').checked,
    };
    if (!payload.url) { alert('URL foto obbligatorio'); return; }
    try {
      if (id) {
        await supa().from('ticket_foto').update(payload).eq('id', id);
      } else {
        await supa().from('ticket_foto').insert(payload);
      }
      overlay.remove();
      renderTabFoto(document.getElementById('modal-body'));
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  };
}

// ============================================
// TAB SEZIONI CUSTOM
// ============================================
async function renderTabSezioni(body) {
  if (!eventoCorrente) {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:#aaa">Salva prima l'evento</div>`;
    return;
  }
  const { data: sezioni } = await supa().from('ticket_sezioni')
    .select('*').eq('evento_id', eventoCorrente.id).order('ordine');

  const tipiLabel = {
    testo:'📝 Testo', immagine:'🖼️ Immagine', gallery:'📸 Gallery', video:'🎬 Video',
    programma:'📅 Programma', territorio:'🗺️ Territorio', sponsor:'🏷️ Sponsor',
    ospiti:'👤 Ospiti', faq:'❓ FAQ', countdown:'⏱️ Countdown', cta:'🎫 CTA acquisto'
  };

  body.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:15px;font-weight:500">Contenuti pagina pubblica</div>
        <div style="font-size:12px;color:#888;margin-top:2px">Blocchi che compongono la pagina dell'evento</div>
      </div>
      <button onclick="window._tastingNuovaSezione()" style="background:${V};color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer">+ Aggiungi blocco</button>
    </div>
    <div id="lista-sezioni">
      ${!sezioni?.length ? `<div style="text-align:center;padding:40px;color:#aaa;background:#fafafa;border-radius:10px">
        <div style="font-size:32px;margin-bottom:10px">📄</div>Nessun blocco contenuto ancora
      </div>` : sezioni.map((s, i) => `
        <div style="background:#fff;border:1px solid #eee;border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
          <span style="color:#ccc;cursor:grab;font-size:16px">⠿</span>
          <span style="font-size:13px;background:${BG};color:${V};border-radius:6px;padding:3px 10px;white-space:nowrap">${tipiLabel[s.tipo] || s.tipo}</span>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:500;color:#1a1a1a">${s.titolo || '—'}</div>
            ${s.contenuto ? `<div style="font-size:12px;color:#aaa;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px">${s.contenuto.substring(0,80)}...</div>` : ''}
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
            <span style="width:8px;height:8px;border-radius:50%;background:${s.visibile ? T : '#ccc'}"></span>
            <button onclick="window._tastingToggleSezione('${s.id}',${!s.visibile})"
              style="padding:4px 8px;border:1px solid #ddd;border-radius:6px;background:#fff;font-size:11px;cursor:pointer">
              ${s.visibile ? 'Nascondi' : 'Mostra'}
            </button>
            <button onclick="window._tastingEditSezione('${s.id}')"
              style="padding:4px 8px;background:${BG};color:${V};border:1px solid ${V};border-radius:6px;font-size:11px;cursor:pointer">Modifica</button>
            <button onclick="window._tastingDeleteSezione('${s.id}')"
              style="padding:4px 8px;background:#fff0f0;color:#e53e3e;border:1px solid #fca5a5;border-radius:6px;font-size:11px;cursor:pointer">🗑</button>
          </div>
        </div>`).join('')}
    </div>`;

  window._tastingNuovaSezione = () => apriFormSezione(null);
  window._tastingEditSezione = (id) => apriFormSezione(id);
  window._tastingDeleteSezione = async (id) => {
    if (!confirm('Eliminare questo blocco?')) return;
    await supa().from('ticket_sezioni').delete().eq('id', id);
    renderTabSezioni(body);
  };
  window._tastingToggleSezione = async (id, val) => {
    await supa().from('ticket_sezioni').update({ visibile: val }).eq('id', id);
    renderTabSezioni(body);
  };
}

async function apriFormSezione(sezId) {
  let s = {};
  if (sezId) {
    const { data } = await supa().from('ticket_sezioni').select('*').eq('id', sezId).single();
    s = data || {};
  }
  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px`;
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:24px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 style="margin:0;font-size:16px;font-weight:500;color:${V}">${sezId ? 'Modifica' : 'Nuovo'} blocco</h3>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#aaa">✕</button>
      </div>
      <div style="display:grid;gap:14px">
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Tipo blocco *</label>
          <select id="s-tipo" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
            ${Object.entries({testo:'📝 Testo libero',immagine:'🖼️ Immagine fullwidth',gallery:'📸 Galleria foto',video:'🎬 Video embed',programma:'📅 Programma / orari',territorio:'🗺️ Info territorio',sponsor:'🏷️ Sponsor',ospiti:'👤 Ospiti / Chef',faq:'❓ Domande frequenti',countdown:'⏱️ Countdown evento',cta:'🎫 Bottone acquisto ticket'})
              .map(([v,l]) => `<option value="${v}" ${s.tipo===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Titolo sezione</label>
          <input id="s-titolo" value="${s.titolo || ''}" placeholder="es. Il programma della serata"
            style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">Contenuto / testo</label>
          <textarea id="s-contenuto" rows="5" placeholder="Testo della sezione, supporta markdown..."
            style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box;resize:vertical">${s.contenuto || ''}</textarea>
        </div>
        <div>
          <label style="font-size:12px;color:#666;font-weight:500">URL immagine</label>
          <input id="s-immagine" value="${s.immagine_url || ''}" placeholder="https://..."
            style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-top:4px;box-sizing:border-box">
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
          <input type="checkbox" id="s-visibile" ${s.visibile!==false?'checked':''}> Visibile nella pagina pubblica
        </label>
        <button onclick="window._tastingSalvaSezione('${sezId||''}')"
          style="padding:12px;background:${V};color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;width:100%">
          ${sezId ? 'Salva modifiche' : 'Aggiungi blocco'}
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  window._tastingSalvaSezione = async (id) => {
    const payload = {
      evento_id: eventoCorrente.id,
      azienda_id: aziendaId,
      tipo: document.getElementById('s-tipo').value,
      titolo: document.getElementById('s-titolo').value.trim() || null,
      contenuto: document.getElementById('s-contenuto').value.trim() || null,
      immagine_url: document.getElementById('s-immagine').value.trim() || null,
      visibile: document.getElementById('s-visibile').checked,
    };
    try {
      if (id) {
        await supa().from('ticket_sezioni').update(payload).eq('id', id);
      } else {
        await supa().from('ticket_sezioni').insert(payload);
      }
      overlay.remove();
      renderTabSezioni(document.getElementById('modal-body'));
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  };
}

// ============================================
// SALVA EVENTO
// ============================================
async function salvaEvento() {
  const nome = document.getElementById('ev-nome')?.value.trim();
  const slug = document.getElementById('ev-slug')?.value.trim();
  const dataInizio = document.getElementById('ev-data-inizio')?.value;
  const dataFine = document.getElementById('ev-data-fine')?.value;

  if (!nome || !slug || !dataInizio || !dataFine) {
    alert('Compila: nome, slug, data inizio e data fine');
    return;
  }

  const payload = {
    azienda_id: aziendaId,
    nome,
    slug,
    sottotitolo: document.getElementById('ev-sottotitolo')?.value.trim() || null,
    tipo: document.getElementById('ev-tipo')?.value || 'ingresso',
    data_inizio: dataInizio,
    data_fine: dataFine,
    luogo: document.getElementById('ev-luogo')?.value.trim() || null,
    indirizzo: document.getElementById('ev-indirizzo')?.value.trim() || null,
    capacita_totale: parseInt(document.getElementById('ev-capacita')?.value) || 100,
    organizzatore: document.getElementById('ev-organizzatore')?.value.trim() || null,
    descrizione: document.getElementById('ev-descrizione')?.value.trim() || null,
    storia: document.getElementById('ev-storia')?.value.trim() || null,
    immagine_url: document.getElementById('ev-immagine')?.value.trim() || null,
    logo_url: document.getElementById('ev-logo')?.value.trim() || null,
    video_url: document.getElementById('ev-video')?.value.trim() || null,
    meta_descrizione: document.getElementById('ev-meta')?.value.trim() || null,
  };

  try {
    if (eventoCorrente) {
      const { data, error } = await supa().from('ticket_eventi').update(payload).eq('id', eventoCorrente.id).select().single();
      if (error) throw error;
      eventoCorrente = data;
    } else {
      payload.stato = 'bozza';
      const { data, error } = await supa().from('ticket_eventi').insert(payload).select().single();
      if (error) throw error;
      eventoCorrente = data;
      document.getElementById('modal-titolo').textContent = 'Modifica evento';
      document.getElementById('btn-pubblica').style.display = 'inline-block';
    }
    aggiornaStatoBadge();
    mostraToast('✅ Evento salvato');
    await caricaLista(filtroCorrente);
    await caricaKPI();
  } catch (err) {
    alert('Errore: ' + err.message);
  }
}

// ============================================
// PUBBLICA / TOGGLE STATO
// ============================================
async function pubblicaEvento() {
  if (!eventoCorrente) return;
  await toggleStato(eventoCorrente.id, 'pubblicato');
  eventoCorrente.stato = 'pubblicato';
  aggiornaStatoBadge();
  document.getElementById('btn-pubblica').style.display = 'none';
  mostraToast('🚀 Evento pubblicato!');
}

async function toggleStato(id, stato) {
  try {
    await supa().from('ticket_eventi').update({ stato }).eq('id', id);
    await caricaLista(filtroCorrente);
    await caricaKPI();
    mostraToast(`✅ Stato aggiornato: ${stato}`);
  } catch (err) {
    alert('Errore: ' + err.message);
  }
}

// ============================================
// ELIMINA EVENTO
// ============================================
async function eliminaEvento(id) {
  if (!confirm('Eliminare questo evento? Verranno eliminati anche biglietti, ordini e postazioni.')) return;
  try {
    await supa().from('ticket_eventi').delete().eq('id', id);
    await caricaLista(filtroCorrente);
    await caricaKPI();
    mostraToast('🗑 Evento eliminato');
  } catch (err) {
    alert('Errore: ' + err.message);
  }
}

// ============================================
// TOAST
// ============================================
function mostraToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.3);transition:opacity .3s`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2500);
}
