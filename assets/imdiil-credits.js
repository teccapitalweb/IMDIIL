// ═══════════════════════════════════════════════════════════════════
// IMDIIL · Créditos ganados por actividad + cartera (como IMFRA / ICADEM)
//
//   · Tras cada sincronización del avance (imdiil:learning-progress-synced)
//     pide al servidor que pague clases y evaluaciones nuevas (/credits/sync).
//   · Al resolver un reto, el servidor valida la respuesta (/credits/reto).
//   · Todo crédito ganado se muestra con el cofre de monedas.
//   · window.IMDIILCredits.openWallet() abre la cartera con su historial.
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const API = () => String(window.WEBHOOK_URL || '').replace(/\/$/, '');
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = n => Number(n || 0).toLocaleString('es-MX');
  const guest = () => { const S = window.UserState || {}; return !S.uid || S.modo === 'invitado' || window.__isDemoMode; };

  async function idToken() {
    let user = window.__auth?.currentUser || window.__currentUser;
    for (let i = 0; !user && i < 50; i += 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
      user = window.__auth?.currentUser || window.__currentUser;
    }
    if (!user) throw new Error('Inicia sesión para continuar.');
    return user.getIdToken();
  }

  async function request(path, options) {
    const opts = options || {};
    const headers = Object.assign({ Authorization: `Bearer ${await idToken()}` }, opts.headers || {});
    if (opts.body) headers['Content-Type'] = 'application/json';
    const response = await fetch(API() + path, Object.assign({ cache: 'no-store' }, opts, { headers }));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || 'No pudimos completar la operación.'), { status: response.status });
    return data;
  }

  async function afterAward(data) {
    if (!data || !(Number(data.credits) > 0)) return data;
    const balance = Math.max(0, Number(data.balance) || 0);
    if (window.UserState) window.UserState.creditos = balance;
    window.dispatchEvent(new CustomEvent('imdiil:credits-changed', { detail: { balance } }));
    window.dispatchEvent(new CustomEvent('imdiil:credits-earned', { detail: data }));
    // El servidor crea el aviso en la misma transacción del saldo. Lo leemos
    // inmediatamente para que el cofre acompañe al resultado del juego.
    await window.__checkCreditNotices?.(true);
    return data;
  }

  // ─── Clases y evaluaciones (desde el avance guardado en el servidor) ───
  let syncTimer = null;
  let syncing = null;
  async function syncNow(options) {
    if (guest()) return Promise.resolve(null);
    // Una sincronización iniciada antes de terminar el juego puede devolver
    // cero aun cuando el avance nuevo ya esté guardado. `fresh` espera esa
    // petición y ejecuta otra con el estado definitivo del servidor.
    if (syncing) {
      const current = await syncing;
      return options?.fresh ? syncNow() : current;
    }
    syncing = request('/credits/sync', { method: 'POST', body: '{}' })
      .then(afterAward)
      .catch(error => { console.warn('[créditos] No se pudo sincronizar', error.message); return null; })
      .finally(() => { syncing = null; });
    return syncing;
  }
  function syncSoon(delay) {
    if (guest()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, delay == null ? 1200 : delay);
  }
  window.addEventListener('imdiil:learning-progress-synced', () => syncSoon());

  // ─── Retos: la respuesta se valida en el servidor ───
  async function reto(id, selected) {
    if (guest()) return null;
    try { return afterAward(await request('/credits/reto', { method: 'POST', body: JSON.stringify({ id, selected }) })); }
    catch (error) { console.warn('[créditos] Reto sin premio', error.message); return null; }
  }

  // ─── Cartera (estilo ICADEM) ───
  const TYPE_ICON = { class_complete: '▶', quiz_pass: '✓', reto_complete: '◎', welcome_credits: '🎁', admin_gift: '★', reward_redemption: '⇄' };
  function walletMarkup(data, filter) {
    const credits = data?.credits || {};
    const rules = Array.isArray(data?.earnRules) ? data.earnRules : [];
    const all = Array.isArray(data?.recentMovements) ? data.recentMovements : [];
    const list = filter === 'earned' ? all.filter(item => item.amount > 0) : filter === 'spent' ? all.filter(item => item.amount < 0) : all;
    const cap = Number(credits.dailyCap) || 0;
    const today = Number(credits.earnedToday) || 0;
    return `<div class="icw-grid">
      <section class="icw-vault"><span class="icw-vault__coins" aria-hidden="true"><i>C</i><i>C</i><i>C</i></span><div><small>Saldo disponible</small><strong><b>${fmt(credits.balance)}</b> créditos</strong><p>Tu saldo IMDIIL, validado y listo para canjear.</p></div>
        <div class="icw-vault__stats"><span><b>${fmt(credits.lifetimeEarned)}</b> ganados</span><span><b>${fmt(credits.lifetimeSpent)}</b> canjeados</span></div>
        ${cap ? `<div class="icw-cap"><span>Ganados hoy</span><i><b style="width:${Math.min(100, Math.round(today / cap * 100))}%"></b></i><small>${fmt(today)} / ${fmt(cap)}</small></div>` : ''}
      </section>
      <section class="icw-panel"><header><span>Cómo sumar créditos</span><small>Cada premio se valida una sola vez</small></header><div class="icw-rules">${rules.map(rule => `<article><i>+${fmt(rule.amount)}</i><span><strong>${esc(rule.label)}</strong><small>${esc(rule.detail || '')}</small></span></article>`).join('')}</div></section>
      <section class="icw-panel"><header><span>Usa tus créditos</span><small>Quedan en tu cuenta para siempre</small></header><div class="icw-dest"><button type="button" data-icw-go="libros"><b>▤</b><span><strong>Libros</strong><small>Biblioteca técnica</small></span><em>→</em></button><button type="button" data-icw-go="pdfs"><b>⚙</b><span><strong>Materiales</strong><small>Herramientas premium</small></span><em>→</em></button></div></section>
      <section class="icw-panel icw-panel--history"><header><span>Movimientos</span><div class="icw-tabs" role="tablist">${[['all', 'Todos'], ['earned', 'Ganados'], ['spent', 'Canjes']].map(([key, label]) => `<button type="button" role="tab" data-icw-filter="${key}" class="${(filter || 'all') === key ? 'is-active' : ''}">${label}</button>`).join('')}</div></header>
        <div class="icw-history">${list.length ? list.map(item => `<article><span class="icw-ico ${item.amount >= 0 ? 'is-plus' : 'is-minus'}">${TYPE_ICON[item.type] || '•'}</span><div><strong>${esc(item.label)}</strong><small>${item.createdAt ? new Date(item.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Fecha pendiente'}</small></div><b class="${item.amount >= 0 ? 'is-plus' : 'is-minus'}">${item.amount >= 0 ? '+' : '−'}${fmt(Math.abs(item.amount))}</b></article>`).join('') : '<p class="icw-empty">Aún no hay movimientos aquí.</p>'}</div>
      </section>
    </div>`;
  }

  async function openWallet() {
    document.querySelector('.icw-modal')?.remove();
    const root = document.createElement('div');
    root.className = 'icw-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'icw-title');
    root.innerHTML = `<div class="icw-veil" data-icw-close></div><section class="icw-shell"><header class="icw-head"><div><span>Créditos IMDIIL</span><h2 id="icw-title">Mi cartera</h2></div><button type="button" class="icw-close" data-icw-close aria-label="Cerrar">×</button></header><div class="icw-body"><div class="icw-loading"><i></i>Cargando tu cartera…</div></div></section>`;
    document.body.appendChild(root);
    document.body.classList.add('icw-open');
    const close = () => { root.remove(); document.body.classList.remove('icw-open'); document.removeEventListener('keydown', onKey, true); };
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    document.addEventListener('keydown', onKey, true);
    root.addEventListener('click', event => {
      if (event.target.closest('[data-icw-close]')) return close();
      const go = event.target.closest('[data-icw-go]');
      if (go) { close(); window.navigateToSection?.(go.dataset.icwGo); }
    });
    let data = null;
    const draw = filter => {
      root.querySelector('.icw-body').innerHTML = walletMarkup(data, filter);
      root.querySelectorAll('[data-icw-filter]').forEach(button => button.addEventListener('click', () => draw(button.dataset.icwFilter)));
    };
    try {
      if (guest()) throw new Error('Inicia sesión para ver tu cartera.');
      data = await request('/credits/wallet');
      if (!root.isConnected) return;
      draw('all');
    } catch (error) {
      root.querySelector('.icw-body').innerHTML = `<p class="icw-empty">${esc(error.message || 'No pudimos cargar tu cartera.')}</p>`;
    }
  }

  // Casos de planta: el servidor paga lo guardado en training_progress (una vez por caso).
  let trainingTimer = null;
  function earn(payload) {
    if (guest() || payload?.source !== 'training-case') return;
    clearTimeout(trainingTimer);
    const run = () => request('/credits/training-sync', { method: 'POST', body: '{}' }).then(afterAward).catch(error => console.warn('[créditos] Casos sin premio', error.message));
    // Espera a que el avance del caso llegue al servidor (PUT /training/me).
    trainingTimer = setTimeout(() => { run().then(data => { if (!(Number(data?.credits) > 0)) setTimeout(run, 6000); }); }, 3000);
  }

  window.IMDIILCredits = { sync: syncNow, award: afterAward, reto, openWallet, earn };
}());
