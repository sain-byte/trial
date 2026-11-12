/* kpi-core.js — drop-in untuk semua halaman. Tampilan custom.html TIDAK diubah.
   1) tema Light/Dark/Blue/Emerald  2) menu navigasi dari sheet app_nav (label/urutan/aktif)
   3) editor menu untuk admin (setelah PIN)  4) PIN dikirim lewat POST + catatan tersimpan ke baris yang benar */
(function () {
  const _f = window.fetch.bind(window);
  const THEMES = ['light', 'dark', 'blue', 'emerald'], NAMES = { light: 'Light', dark: 'Dark', blue: 'Blue', emerald: 'Emerald' };
  const DEFAULT_MENU = [['index', 'Dashboard'], ['summary', 'Summary'], ['breakdown', 'Breakdown'], ['custom', 'Custom'], ['analys', 'Analys']]
    .map((m, i) => ({ id: m[0], page_key: m[0], label: m[1], title: '', subtitle: '', order: i + 1, enabled: true }));
  // Menu yang disembunyikan dari tombol navigasi (halamannya tidak dipakai lagi). Kosongkan [] untuk menampilkannya lagi.
  const SEMBUNYIKAN = ['summary', 'breakdown'];
  let menu = null;
  const api = () => (typeof GAS_API_URL === 'string' ? GAS_API_URL : '');
  const q = s => document.querySelector(s);
  const val = id => { const e = document.getElementById(id); return e ? e.value : ''; };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const page = () => (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index';

  const css = document.createElement('style');
  css.textContent =
    'body.theme-blue{--bg-color:#0b1f3a;--card-bg:#102b4f;--text-color:#e6f0ff;--border-color:#1d3e6b;--header-th-bg:#1565c0;--header-th-border:#0d47a1;--row-even:#0e2747;--row-hover:#163861}' +
    'body.theme-emerald{--bg-color:#08201a;--card-bg:#0e2d25;--text-color:#e3f6ee;--border-color:#194237;--header-th-bg:#0f8a63;--header-th-border:#0b6b4c;--row-even:#0c2720;--row-hover:#143a30}' +
    '.core-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:12px}' +
    '.core-box{background:var(--card-bg);color:var(--text-color);border:1px solid var(--border-color);border-radius:8px;padding:16px;max-width:620px;width:100%;max-height:90vh;overflow:auto}' +
    '.core-box p{font-size:12px;opacity:.8;margin:6px 0 10px}.core-box table{width:100%;border-collapse:collapse}.core-box td{padding:4px}' +
    '.core-box input[type=text],.core-box input[type=number]{width:100%;padding:6px 8px;border:1px solid var(--border-color);border-radius:5px;background:var(--bg-color);color:var(--text-color)}' +
    '.core-act{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}';
  document.head.appendChild(css);


  // ---- samakan menu atas: halaman tanpa .nav-buttons (analys.html) dibuat sama dengan custom.html ----
  const HDR_CSS = ".top-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; background: var(--card-bg,var(--card)); padding: 12px 18px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); flex-wrap: wrap; gap: 10px; } .brand-title { font-size: 19px; font-weight: bold; text-transform: uppercase; display: flex; align-items: center; gap: 8px; }  .nav-buttons { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; } .nav-btn { padding: 7px 12px; border-radius: 6px; border: 1px solid #007bff; background: transparent; color: #007bff; font-weight: bold; font-size: 12px; cursor: pointer; text-decoration: none; transition: 0.2s; display: inline-block; } .nav-btn.active { background: #007bff; color: #fff; }  .nav-actions-right { display: flex; gap: 8px; align-items: center; border-left: 2px solid var(--border-color,var(--border)); padding-left: 10px; } .nav-btn-theme { padding: 7px 12px; border-radius: 6px; border: 1px solid #f39c12; background: transparent; color: #f39c12; font-weight: bold; font-size: 12px; cursor: pointer; } .nav-btn-admin { padding: 7px 12px; border-radius: 6px; border: 1px solid #dc3545; background: #dc3545; color: #fff; font-weight: bold; font-size: 12px; cursor: pointer; } .nav-btn-admin.logged-in { background: #28a745; border-color: #28a745; } .nav-btn-link { padding: 7px 12px; border-radius: 6px; border: 1px solid #6c757d; background: #6c757d; color: #fff; font-weight: bold; font-size: 12px; text-decoration: none; }";
  function unifyHeader() {
    const hd = q('header.top-header'), nav = hd && hd.querySelector('nav.nav');
    if (hd && nav && !hd.querySelector('.nav-buttons')) {
      const brand = hd.querySelector('.brand'), mark = brand && brand.querySelector('.brand-mark');
      const icon = mark ? mark.textContent : '📈', title = brand ? brand.textContent.replace(icon, '').trim() : 'KPI Agent';
      const ext = nav.querySelector('a.external'), themeBtn = nav.querySelector('#themeBtn');
      hd.innerHTML = '<div class="brand-title"><span>' + esc(icon) + '</span><span>' + esc(title) + '</span></div><div class="nav-buttons"><div class="nav-actions-right"></div></div>';
      const act = hd.querySelector('.nav-actions-right');
      if (themeBtn) { themeBtn.className = 'nav-btn-theme'; act.appendChild(themeBtn); }   // elemen yang sama, listener bawaan halaman tetap jalan
      const a = document.createElement('a'); a.className = 'nav-btn-link'; a.target = '_blank'; a.rel = 'noopener';
      a.href = ext ? ext.href : 'https://sain-byte.github.io/eskalasi/'; a.textContent = 'Eskalasi ↗'; act.appendChild(a);
      const st = document.createElement('style'); st.textContent = HDR_CSS; document.head.appendChild(st);
      if (themeBtn) {
        const lab = () => { themeBtn.textContent = '🎨 ' + (document.body.classList.contains('dark-mode') ? 'Dark' : 'Light'); };
        themeBtn.addEventListener('click', () => setTimeout(lab, 0)); lab();
      }
    }
    const ab = document.getElementById('btnAdmin');   // index.html: "🔒 Admin" -> "🔒 Login Admin"
    if (ab && /^🔒\s*Admin$/.test(ab.textContent.trim())) ab.textContent = '🔒 Login Admin';
  }

  // ---- tema ----
  function curTheme() { let t = null; try { t = localStorage.getItem('kpiTheme'); } catch (e) {} return THEMES.indexOf(t) >= 0 ? t : 'light'; }
  function applyTheme(t) {
    const b = document.body;
    b.classList.remove('dark-mode', 'theme-blue', 'theme-emerald');
    if (t !== 'light') b.classList.add('dark-mode');
    if (t === 'blue' || t === 'emerald') b.classList.add('theme-' + t);
    try { localStorage.setItem('kpiTheme', t); } catch (e) {}
    const btn = q('.nav-btn-theme'); if (btn && btn.id !== 'coreMenuBtn') btn.textContent = '🎨 ' + NAMES[t];
  }

  // ---- menu navigasi ----
  function renderNav(m) {
    const box = q('.nav-buttons'); if (!box) return;
    box.querySelectorAll('a.nav-btn').forEach(a => a.remove());
    const anchor = box.querySelector('.nav-actions-right');
    m.filter(x => x.enabled && SEMBUNYIKAN.indexOf(x.page_key) < 0).sort((a, b) => a.order - b.order).forEach(x => {
      const a = document.createElement('a'); a.className = 'nav-btn' + (x.page_key === page() ? ' active' : '');
      a.href = x.page_key + '.html'; a.textContent = x.label; box.insertBefore(a, anchor);
    });
    const cur = m.find(x => x.page_key === page()), bt = q('.brand-title span:last-child');
    if (cur && cur.title && bt) bt.textContent = cur.title;
  }
  function loadMenu() {
    let c = null; try { c = JSON.parse(localStorage.getItem('kpiMenu')); } catch (e) {}
    menu = Array.isArray(c) && c.length ? c : DEFAULT_MENU; renderNav(menu);
    if (!api()) return;
    _f(api() + '?action=getMenu').then(r => r.json()).then(m => {
      if (!Array.isArray(m) || !m.length) return;
      menu = m; try { localStorage.setItem('kpiMenu', JSON.stringify(m)); } catch (e) {}
      renderNav(m);
    }).catch(() => {});
  }

  // ---- editor menu (hanya tampil setelah admin login dengan PIN) ----
  function openEditor() {
    const rows = JSON.parse(JSON.stringify(menu || DEFAULT_MENU)).sort((a, b) => a.order - b.order);
    const ov = document.createElement('div'); ov.className = 'core-ov';
    ov.innerHTML = '<div class="core-box"><h3>Atur menu</h3><p>Ubah nama menu, judul halaman, urutan, dan status aktif. Alamat halaman tidak berubah.</p><table><tr><td></td><td>Nama menu</td><td>Judul halaman</td><td>Urutan</td><td>Aktif</td></tr>' +
      rows.map((r, i) => `<tr data-i="${i}"><td>${esc(r.page_key)}</td><td><input type="text" data-f="label" value="${esc(r.label)}"></td><td><input type="text" data-f="title" value="${esc(r.title)}"></td><td><input type="number" data-f="order" value="${esc(r.order)}" style="width:64px"></td><td><input type="checkbox" data-f="enabled" ${r.enabled ? 'checked' : ''}></td></tr>`).join('') +
      '</table><div class="core-act"><button class="nav-btn" data-a="x">Batal</button><button class="nav-btn active" data-a="s">Simpan</button></div></div>';
    document.body.appendChild(ov);
    ov.oninput = ov.onchange = e => { const t = e.target, tr = t.closest('tr'); if (tr && t.dataset.f) rows[tr.dataset.i][t.dataset.f] = t.type === 'checkbox' ? t.checked : t.value; };
    ov.onclick = async e => {
      const a = e.target.dataset.a; if (!a) return;
      if (a === 'x' || e.target === ov) return ov.remove();
      try {
        rows.forEach(r => r.order = Number(r.order) || 0);
        const res = await (await _f(api(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'saveMenu', pin: activeAdminPin, rows }) })).json();
        if (!res.success) return alert('Gagal simpan: ' + res.message);
        menu = rows; try { localStorage.setItem('kpiMenu', JSON.stringify(rows)); } catch (er) {}
        renderNav(rows); ov.remove();
      } catch (er) { alert('Gagal terhubung ke server.'); }
    };
  }
  setInterval(() => {
    const on = typeof isAdminLoggedIn !== 'undefined' && isAdminLoggedIn, box = q('.nav-actions-right'); if (!box) return;
    let b = document.getElementById('coreMenuBtn');
    if (on && !b) { b = document.createElement('button'); b.id = 'coreMenuBtn'; b.className = 'nav-btn-theme'; b.textContent = '✏️ Menu'; b.onclick = openEditor; box.insertBefore(b, box.firstChild); }
    if (!on && b) b.remove();
  }, 700);

  // ---- PIN lewat POST (bukan URL) + info periode saat simpan catatan ----
  window.fetch = function (u, o) {
    try {
      const url = String(u), base = api();
      if (base && url.indexOf(base) === 0) {
        const m = url.match(/[?&]action=checkPin&pin=([^&]*)/);
        if (m) return _f(base, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'checkPin', pin: decodeURIComponent(m[1]) }) });
        if (o && o.method === 'POST' && o.body) {
          const b = JSON.parse(o.body);
          if (b.fieldName && !b.mode) { b.mode = val('filterMode'); b.periode = val('filterValue'); if (!b.year) b.year = val('filterYear'); o = Object.assign({}, o, { body: JSON.stringify(b) }); }
        }
      }
    } catch (e) {}
    return _f(u, o);
  };

  document.addEventListener('DOMContentLoaded', () => {
    unifyHeader();
    const own = document.getElementById('themeBtn');   // analys.html: toggle terang/gelap bawaan halaman
    if (own) { let s = curTheme(); if (s === 'blue' || s === 'emerald') s = 'dark'; document.body.classList.toggle('dark-mode', s === 'dark'); }
    else {
      applyTheme(curTheme());
      const t = q('.nav-btn-theme');
      if (t) t.onclick = e => { e.preventDefault(); applyTheme(THEMES[(THEMES.indexOf(curTheme()) + 1) % THEMES.length]); };
    }
    loadMenu();
  });
})();
