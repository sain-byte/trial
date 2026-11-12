/* filter-ui.js — merapikan panel filter (halaman yang punya .filter-card, mis. custom.html)
   - Mode/Tahun/Periode sebaris; filter multi jadi tombol ringkas + daftar centang (cari, Semua)
   - Header expand/hide + ringkasan filter aktif; panel menutup otomatis setelah Tampilkan
   Elemen select asli tetap ada (disembunyikan), jadi kode halaman tidak berubah. */
(function () {
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);
  const allOpt = sel => Array.from(sel.options).find(o => o.value === 'All');
  const labelOf = sel => {
    const v = Array.from(sel.selectedOptions).filter(o => o.value !== 'All');
    if (!v.length) { const a = allOpt(sel); return a ? a.text : 'Semua'; }
    return v.length === 1 ? v[0].text : v.length + ' dipilih';
  };
  const closeAll = () => document.querySelectorAll('.msw-pop').forEach(p => { p.hidden = true; });

  function enhance(sel) {
    const wrap = document.createElement('div'); wrap.className = 'msw';
    wrap.innerHTML = '<button type="button" class="msw-btn"><span class="msw-t"></span><span>▾</span></button><div class="msw-pop" hidden><input class="msw-q" placeholder="Cari…"><button type="button" class="msw-all">Semua</button><div class="msw-list"></div></div>';
    sel.insertAdjacentElement('afterend', wrap); sel.style.display = 'none';
    const btn = wrap.querySelector('.msw-btn'), pop = wrap.querySelector('.msw-pop'), list = wrap.querySelector('.msw-list'), q = wrap.querySelector('.msw-q');
    const sync = () => { list.querySelectorAll('input').forEach(c => { c.checked = sel.options[c.dataset.i].selected; }); wrap.querySelector('.msw-t').textContent = labelOf(sel); };
    const build = () => {
      list.innerHTML = Array.from(sel.options).map((o, i) => `<label data-t="${esc(o.text.toLowerCase())}"><input type="checkbox" data-i="${i}"> ${esc(o.text)}</label>`).join('');
      q.value = ''; sync();
    };
    const fire = () => { sync(); sel.dispatchEvent(new Event('change', { bubbles: true })); };
    list.onchange = e => {
      const i = +e.target.dataset.i, opts = Array.from(sel.options), a = allOpt(sel);
      if (opts[i].value === 'All') opts.forEach((o, k) => { o.selected = k === i && e.target.checked; });
      else { opts[i].selected = e.target.checked; if (a) a.selected = false; }
      if (a && !opts.some(o => o.selected)) a.selected = true;
      fire();
    };
    wrap.querySelector('.msw-all').onclick = () => { Array.from(sel.options).forEach(o => { o.selected = o.value === 'All'; }); fire(); };
    q.oninput = () => list.querySelectorAll('label').forEach(l => { l.style.display = l.dataset.t.indexOf(q.value.toLowerCase()) >= 0 ? '' : 'none'; });
    btn.onclick = e => {
      e.stopPropagation(); const open = pop.hidden; closeAll(); pop.hidden = !open;
      if (open) { pop.style.left = '0'; pop.style.right = 'auto'; if (pop.getBoundingClientRect().right > innerWidth - 8) { pop.style.left = 'auto'; pop.style.right = '0'; } }
    };
    pop.onclick = e => e.stopPropagation();
    new MutationObserver(build).observe(sel, { childList: true });
    build();
  }

  function build() {
    const css = document.createElement('style');
    css.textContent =
      '.filter-card{padding:10px 12px !important}' +
      '.filter-grid{grid-template-columns:repeat(3,minmax(0,1fr)) !important;gap:8px 10px !important}' +
      '.filter-grid .form-group{min-width:0}.filter-grid .form-group:last-child{grid-column:1/-1}' +
      '.filter-grid label{font-size:10.5px !important;margin-bottom:2px !important}' +
      '.filter-grid select:not([multiple]){padding:6px 8px !important;font-size:12px !important;width:100%}' +
      '@media(min-width:900px){.filter-grid{grid-template-columns:repeat(7,minmax(0,1fr)) !important}.filter-grid .form-group:last-child{grid-column:auto}}' +
      '.msw{position:relative}' +
      '.msw-btn{width:100%;display:flex;justify-content:space-between;align-items:center;gap:6px;padding:6px 8px;font-size:12px;border:1px solid var(--border-color);border-radius:6px;background:var(--card-bg);color:var(--text-color);cursor:pointer;text-align:left}' +
      '.msw-t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.msw-pop{position:absolute;z-index:50;top:calc(100% + 4px);min-width:100%;width:max-content;max-width:min(300px,86vw);background:var(--card-bg);color:var(--text-color);border:1px solid var(--border-color);border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.22);padding:8px}' +
      '.msw-pop[hidden]{display:none}' +
      '.msw-q{width:calc(100% - 64px);padding:5px 8px;font-size:12px;border:1px solid var(--border-color);border-radius:6px;background:var(--bg-color);color:var(--text-color)}' +
      '.msw-all{width:58px;margin-left:6px;padding:5px 0;font-size:11px;border:1px solid var(--border-color);border-radius:6px;background:var(--card-bg);color:var(--text-color);cursor:pointer}' +
      '.msw-list{max-height:200px;overflow:auto;margin-top:6px}' +
      '.msw-list label{display:flex;gap:8px;align-items:center;padding:5px 2px;font-size:12px;cursor:pointer;margin:0}';
    document.head.appendChild(css);
    document.addEventListener('click', closeAll);

    const card = document.querySelector('.filter-card'), grid = card && card.querySelector('.filter-grid');
    if (!card || !grid) return;
    grid.querySelectorAll('select[multiple]').forEach(enhance);

    const h = document.createElement('div'); h.className = 'card-header-toggle';
    h.innerHTML = '<div><strong style="font-size:12px;color:#e91e63;">🔎 Filter Data (Klik untuk Expand/Hide)</strong><div id="filterSummary" style="font-size:11px;opacity:.75;margin-top:2px"></div></div><span id="filterToggleIcon" style="font-size:14px;font-weight:bold;">▲</span>';
    card.insertBefore(h, grid);
    const set = (open, keep) => {
      grid.style.display = open ? '' : 'none'; h.style.marginBottom = open ? '10px' : '0';
      h.querySelector('#filterToggleIcon').textContent = open ? '▲' : '▼'; if (keep !== false) store.set('kpiFilterOpen', open ? '1' : '0');
    };
    set(store.get('kpiFilterOpen') !== '0');
    h.onclick = () => set(grid.style.display === 'none');
    const go = card.querySelector('.btn-submit'); if (go) go.addEventListener('click', () => set(false, false));

    const txt = id => { const e = $(id); return e && e.selectedIndex >= 0 ? e.options[e.selectedIndex].text : ''; };
    const multi = (id, nm) => { const e = $(id); return e ? ' · ' + nm + ': ' + labelOf(e) : ''; };
    let t = 0;
    const upd = () => { cancelAnimationFrame(t); t = requestAnimationFrame(() => { $('filterSummary').textContent = [txt('filterMode'), txt('filterYear'), txt('filterValue')].filter(Boolean).join(' · ') + multi('filterTl', 'TL') + multi('filterSkill', 'Skill') + multi('filterKat', 'Kategori'); }); };
    card.addEventListener('change', upd);
    new MutationObserver(upd).observe(grid, { childList: true, subtree: true });
    upd();
  }
  document.addEventListener('DOMContentLoaded', build);
})();
