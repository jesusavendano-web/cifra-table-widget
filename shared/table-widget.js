/*
  CifraTableWidget · widget de dashboard para custom reports con visualización "Display table".

  Nativo (Polaris Web Components 2.0-rc):
    s-table (+ header-row/header/body/row/cell) → tabla, paginación (paginate/hasNextPage/nextpage),
                                                    estado loading y variante "list" en anchos chicos
    s-modal size="large-100"                     → expansión del widget a vista completa (animación nativa)
    s-button loading                             → "Load more" con feedback nativo
    s-thumbnail, s-text, s-link, s-banner, s-search-field, s-menu, s-clickable
  Custom (data-custom):
    contenedor de card, scroll vertical interno, prioridad de columnas según ancho del widget, footer de filas.

  Alternativas de volumen de filas (opts.mode):
    A  → 25 filas fijas + "View full report"                   (paridad con Shopify)
    B  → primeras 100 filas con scroll interno
    C  → paginación nativa de s-table, 10 por página, máx. 100
    D  → "Load more" incremental 25 → 50 → 75 → 100
    E  → 25 filas de preview + expandir a modal con todas las filas
*/
(function () {
  const R = () => window.CifraReport;
  const CAP = 100;
  let uid = 0;

  // Miniaturas de producto (mock) — el resto usa el placeholder nativo de s-thumbnail
  const thumb = (c) => 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#fff"/><rect x="16" y="3" width="8" height="34" rx="4" fill="${c}"/><rect x="18" y="8" width="4" height="4" rx="1" fill="#fff" opacity=".7"/><rect x="18" y="16" width="4" height="10" rx="1" fill="#fff" opacity=".5"/></svg>`);
  const IMG = { teal: thumb('#36c2b4'), violet: thumb('#5b3fd6') };

  // Columnas visibles según ancho del widget. Mínimo 4 (Month, Order, Product, Total sales).
  function maxPriority(width) {
    if (width < 760) return 1;
    if (width < 1040) return 2;
    if (width < 1300) return 3;
    return 4;
  }

  function headerRow(cols) {
    return `<s-table-header-row>${cols.map((c) =>
      `<s-table-header format="${c.format}" listSlot="${c.listSlot}">${c.label}</s-table-header>`).join('')}</s-table-header-row>`;
  }

  function cell(c, row) {
    const v = row[c.key];
    if (c.key === 'product') {
      const src = row.img ? ` src="${IMG[row.img]}"` : '';
      return `<s-table-cell><span class="c-tw__product"><s-thumbnail size="small-200" alt="${v || 'No product'}"${src}></s-thumbnail><span class="c-tw__ellipsis" title="${v || 'None'}">${v || 'None'}</span></span></s-table-cell>`;
    }
    if (c.format === 'currency') return `<s-table-cell>${R().fmt(v)}</s-table-cell>`;
    return `<s-table-cell>${v}</s-table-cell>`;
  }

  // compact: en widgets angostos el rango de fechas ensancha la primera columna, se usa "Total"
  function totalsRow(cols, compact) {
    const rep = R();
    return `<s-table-row>${cols.map((c, i) => {
      if (c.format === 'currency') return `<s-table-cell><s-text fontWeight="bold">${rep.fmt(rep.totals[c.key])}</s-text></s-table-cell>`;
      return `<s-table-cell>${i === 0 ? `<s-text fontWeight="bold">${compact ? 'Total' : rep.range}</s-text>` : ''}</s-table-cell>`;
    }).join('')}</s-table-row>`;
  }

  function table(cols, rows, attrs = '') {
    const compact = cols.length <= 4;
    return `<s-table ${attrs}>${headerRow(cols)}<s-table-body>${totalsRow(cols, compact)}${rows.map((r) =>
      `<s-table-row>${cols.map((c) => cell(c, r)).join('')}</s-table-row>`).join('')}</s-table-body></s-table>`;
  }

  function mount(host, opts = {}) {
    const id = ++uid;
    const modalId = `tw-modal-${id}`;
    const menuId = `tw-menu-${id}`;
    const st = {
      mode: opts.mode || 'A',
      state: opts.state || 'data', // data | loading | empty | error | locked
      page: 0,
      loaded: 25,
      prio: 1,
      narrow: false,
      modalPage: 0,
      modalQuery: '',
    };

    host.classList.add('c-tw');
    host.setAttribute('data-custom', 'TableWidget (custom report · Display table)');

    function visibleCols() { return R().columns.filter((c) => c.priority <= st.prio); }

    function body() {
      const rep = R();
      const cols = visibleCols();
      const variant = st.narrow ? 'list' : 'auto';
      if (st.state === 'loading') return `<div class="c-tw__scroll">${table(cols, [], `variant="${variant}" loading`)}</div>`;
      if (st.state === 'empty') return `<div class="c-chart-empty">No data found for this date range</div>`;
      if (st.state === 'error') return `<s-banner tone="critical" heading="This report couldn't load">
          <s-paragraph>Something went wrong while fetching the data. Try again in a moment.</s-paragraph>
          <s-button slot="secondary-actions" data-tw="retry">Try again</s-button></s-banner>`;
      // Sin permisos: no se piden datos ni se muestran columnas/totales (podrían filtrar información)
      if (st.state === 'locked') return `<div class="c-tw__locked"><s-stack gap="small-200" alignItems="center">
          <s-icon type="lock"></s-icon>
          <s-heading>You don't have access to this report</s-heading>
          <s-paragraph color="subdued">This custom report uses data your role can't view. Ask the store owner to give you access to Reports.</s-paragraph>
          <s-button data-tw="request">${st.requested ? 'Access requested' : 'Request access'}</s-button>
        </s-stack></div>`;

      const all = rep.rows.slice(0, CAP);
      if (st.mode === 'A') return `<div class="c-tw__scroll">${table(cols, rep.rows.slice(0, 25), `variant="${variant}"`)}</div>`;
      if (st.mode === 'B') return `<div class="c-tw__scroll">${table(cols, all, `variant="${variant}"`)}</div>`;
      if (st.mode === 'C') {
        const per = 10, pages = Math.ceil(all.length / per);
        st.page = Math.min(st.page, pages - 1);
        const a = [`variant="${variant}"`, 'paginate'];
        if (st.page < pages - 1) a.push('hasNextPage');
        if (st.page > 0) a.push('hasPreviousPage');
        return table(cols, all.slice(st.page * per, st.page * per + per), a.join(' '));
      }
      if (st.mode === 'D') {
        const more = st.loaded < CAP;
        return `<div class="c-tw__scroll">${table(cols, all.slice(0, st.loaded), `variant="${variant}"`)}
          ${more ? `<div class="c-tw__more"><s-button data-tw="more">Show ${Math.min(25, CAP - st.loaded)} more rows</s-button></div>` : ''}</div>`;
      }
      // E
      return `<div class="c-tw__scroll">${table(cols, rep.rows.slice(0, 25), `variant="${variant}"`)}</div>`;
    }

    function footer() {
      const rep = R();
      const total = rep.rows.length;
      if (st.state !== 'data') return '';
      let left = '', right = '';
      if (st.mode === 'A') { left = '25 rows'; right = `<s-link href="#" data-tw="report">View full report</s-link>`; }
      if (st.mode === 'B') { left = `First ${CAP} of ${total} rows`; right = `<s-link href="#" data-tw="report">View full report</s-link>`; }
      if (st.mode === 'C') { const s = st.page * 10 + 1; left = `${s}–${Math.min(s + 9, CAP)} of ${CAP} rows`; right = `<s-link href="#" data-tw="report">View full report</s-link>`; }
      if (st.mode === 'D') { left = `${st.loaded} of ${CAP} rows`; right = st.loaded >= CAP ? `<s-link href="#" data-tw="report">View all ${total} in report</s-link>` : ''; }
      if (st.mode === 'E') { left = `25 of ${total} rows`; right = `<s-button variant="tertiary" icon="maximize" commandFor="${modalId}" command="--show">View all ${total} rows</s-button>`; }
      // Columnas ocultas por ancho: se avisa en el footer; el modal y el reporte muestran todas
      const shown = visibleCols().length, all = rep.columns.length;
      if (shown < all) left += ` · ${shown} of ${all} columns`;
      return `<footer class="c-card__footer c-tw__footer"><s-text color="subdued">${left}</s-text>${right}</footer>`;
    }

    function modalBody() {
      const rep = R();
      const per = 50;
      const q = st.modalQuery.trim().toLowerCase();
      const rows = q ? rep.rows.filter((r) => [r.order, r.product || 'none', r.saleId, r.month].some((v) => v.toLowerCase().includes(q))) : rep.rows;
      const pages = Math.max(1, Math.ceil(rows.length / per));
      st.modalPage = Math.min(st.modalPage, pages - 1);
      const a = ['paginate'];
      if (st.modalPage < pages - 1) a.push('hasNextPage');
      if (st.modalPage > 0) a.push('hasPreviousPage');
      const s = st.modalPage * per;
      return table(rep.columns, rows.slice(s, s + per), a.join(' ')).replace('<s-table-header-row>',
          `<s-search-field slot="filters" label="Search rows" labelAccessibilityVisibility="exclusive" placeholder="Search by order, product or sale ID" value="${st.modalQuery}" data-tw="search"></s-search-field><s-table-header-row>`)
        + `<s-box paddingBlockStart="small"><s-text color="subdued">${rows.length ? `${s + 1}–${Math.min(s + per, rows.length)} of ${rows.length} rows` : 'No rows match your search'}</s-text></s-box>`;
    }

    function render() {
      const scroller = host.querySelector('.c-tw__scroll');
      const keep = scroller ? scroller.scrollTop : 0;
      const locked = st.state === 'locked';
      host.innerHTML = `
        <div class="c-tw__head">
          <h3 class="c-card__title c-tw__title">${locked ? R().title : `<s-link href="#" data-tw="report">${R().title}</s-link>`}</h3>
          ${locked ? '<s-badge icon="lock">Locked</s-badge>' : ''}
          ${opts.editable || locked ? '' : `<s-button variant="tertiary" icon="maximize" accessibilityLabel="Expand ${R().title}" commandFor="${modalId}" command="--show"></s-button>`}
          ${opts.headExtra || ''}
        </div>
        <div class="c-tw__body">${body()}</div>
        ${footer()}
        <s-modal id="${modalId}" heading="${R().title}" size="large-100">
          <div data-tw="modal-body"></div>
          <s-button slot="secondary-actions" commandFor="${modalId}" command="--hide">Close</s-button>
          <s-button slot="primary-action" variant="primary" data-tw="report">Open report</s-button>
        </s-modal>`;
      const sc = host.querySelector('.c-tw__scroll');
      if (sc) sc.scrollTop = keep;
      wire();
    }

    function renderModal() {
      const mb = host.querySelector('[data-tw="modal-body"]');
      if (!mb) return;
      mb.innerHTML = modalBody();
      const t = mb.querySelector('s-table');
      const go = (d) => { t.setAttribute('loading', ''); setTimeout(() => { st.modalPage += d; renderModal(); }, 250); };
      t.addEventListener('nextpage', () => go(1));
      t.addEventListener('previouspage', () => go(-1));
      const sf = mb.querySelector('[data-tw="search"]');
      sf.addEventListener('input', (e) => {
        st.modalQuery = e.target.value || ''; st.modalPage = 0;
        clearTimeout(sf._t); sf._t = setTimeout(() => { renderModal(); const n = host.querySelector('[data-tw="search"]'); n && n.focus(); }, 250);
      });
    }

    function wire() {
      const t = host.querySelector('.c-tw__body s-table');
      if (t && st.mode === 'C') {
        const go = (d) => { t.setAttribute('loading', ''); setTimeout(() => { st.page += d; render(); }, 250); };
        t.addEventListener('nextpage', () => go(1));
        t.addEventListener('previouspage', () => go(-1));
      }
      const modal = host.querySelector('s-modal');
      modal.addEventListener('show', () => { st.modalPage = 0; st.modalQuery = ''; renderModal(); });
    }

    host.addEventListener('click', (e) => {
      const a = e.target.closest('[data-tw]');
      if (!a) return;
      const k = a.dataset.tw;
      if (k === 'report') { e.preventDefault(); opts.onOpenReport ? opts.onOpenReport() : null; }
      if (k === 'request' && !st.requested) { st.requested = true; render(); }
      if (k === 'retry') { st.state = 'loading'; render(); setTimeout(() => { st.state = 'data'; render(); }, 900); }
      if (k === 'more') {
        a.setAttribute('loading', '');
        setTimeout(() => { st.loaded = Math.min(CAP, st.loaded + 25); render(); }, 500);
      }
    });

    // Columnas y variante según el ancho real del widget (resize en el grid, cambio de span, viewport)
    function measure(force) {
      const w = host.clientWidth || 600;
      const prio = maxPriority(w), narrow = w < 380;
      host.toggleAttribute('data-compact', w < 560);
      if (force || prio !== st.prio || narrow !== st.narrow) { st.prio = prio; st.narrow = narrow; render(); }
    }
    const ro = new ResizeObserver(() => measure());
    measure(true);
    ro.observe(host);

    return {
      measure,
      setMode(m) { st.mode = m; st.page = 0; st.loaded = 25; render(); },
      setState(s) { st.state = s; render(); },
      columnsVisible() { return visibleCols().length; },
      destroy() { ro.disconnect(); },
    };
  }

  window.CifraTableWidget = { mount };
})();
