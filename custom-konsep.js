/* custom-konsep.js — khusus custom.html (isi template tidak diubah)
   1) Sub-menu Konsep 1–5 di bawah menu atas: memilih logika RANK
   2) Filter "Kategori Section" multi-select + kolom Kategori Section di tabel/Custom Studio
   3) Angka persen tanpa nol di belakang koma (100.00% -> 100%)
   Cara kerja: fungsi tampilan halaman dibungkus; hitungan poin dan backend tidak diubah. */
(function () {
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const num = v => parseFloat(String(v == null ? '' : v).replace('%', '').replace(',', '.')) || 0;
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let orig = null, lastView = null;   // orig = data asli backend, lastView = data yang sedang ditampilkan

  // Konsep 4: bonus kelebihan target produktivitas. Dasar tetap di-cap seperti backend (maks 40%); QA maks 100% (bobot 50%), absensi maks 100% (bobot 10%).
  // BONUS_BATAS = batas kelebihan yang dihitung. Infinity = tanpa batas (sesuai permintaan client). Isi 0.5 bila bonus hanya sampai 150% dari target.
  const BONUS_BATAS = 0.5;
  function skor4(d) {   // semua dalam poin persen (40 = 40%)
    const t = String(d.prodTgt == null ? '' : d.prodTgt).split('/').map(x => parseFloat(x) || 0), tK = t[0] || 0, tS = t[1] || 0, dual = tS > 0;
    const lebih = (ach, tgt) => tgt > 0 ? Math.min(BONUS_BATAS, Math.max(0, num(ach) / tgt - 1)) : 0;
    const bonus = lebih(d.prodKapture, tK) * (dual ? 20 : 40) + (dual ? lebih(d.prodSociomile, tS) * 20 : 0);
    const prod = num(d.prodResult), qa = Math.min(num(d.qaAch), 100), atd = Math.min(num(d.atdAch), 100);
    return { prod: prod, bonus: bonus, qa: qa, atd: atd, total: prod + qa * 0.5 + atd * 0.1 + bonus };
  }

  // Kunci urutan saat POIN SAMA (makin besar makin tinggi ranknya).
  // Konsep 2: QA tertinggi -> total produktivitas tertinggi -> absensi tertinggi.
  const KONSEP = {
    1: { desc: 'Logika asli: poin, lalu desimal hasil.', key: null },
    2: { desc: 'Poin sama: QA tertinggi, lalu total produktivitas tertinggi, lalu absensi tertinggi.',
         key: d => Math.round(num(d.qaAch) * 100) * 1e11 + Math.min(999999, Math.round(num(d.prodAch))) * 1e5 + Math.round(num(d.atdAch) * 100) },
    // Konsep 3: adil antar section. Capaian = % dari target (1 produk: Kapture; 2 produk: Kapture & Sociomile 50:50 seperti bobot 20%+20%), tanpa batas 100%.
    3: { desc: 'Poin sama: QA tertinggi, lalu % capaian target produktivitas (Kapture saja, atau Kapture+Sociomile 50:50) tertinggi, lalu absensi tertinggi.',
         key: d => {
           const tg = String(d.prodTgt == null ? '' : d.prodTgt).split('/').map(x => parseFloat(x) || 0), tK = tg[0] || 0, tS = tg[1] || 0;
           const kR = tK > 0 ? num(d.prodKapture) / tK : 0, sR = tS > 0 ? num(d.prodSociomile) / tS : 0, ratio = tS > 0 ? (kR + sR) / 2 : kR;
           return Math.round(num(d.qaAch) * 100) * 1e10 + Math.min(99999, Math.round(ratio * 10000)) * 1e5 + Math.min(99999, Math.round(num(d.atdAch) * 100));
         } },
    4: { desc: 'Poin sama: persentase total tertinggi (dasar + bonus kelebihan target produktivitas, boleh lebih dari 100%), lalu QA tertinggi, lalu absensi tertinggi.',
         key: d => { const s = skor4(d); return Math.min(800000, Math.round(s.total * 100)) * 1e10 + Math.round(s.qa * 100) * 1e5 + Math.round(s.atd * 100); },
         decorate: d => { const s = skor4(d); if (s.bonus >= 0.005) d.prodResult = s.prod.toFixed(2) + '% +' + s.bonus.toFixed(2) + '%'; d.allResult = s.total.toFixed(2) + '%'; } },
    5: { desc: 'Belum diatur. Sementara memakai logika Konsep 1.', key: null }
  };
  const cur = () => { const n = +store.get('kpiKonsep'); return KONSEP[n] ? n : 1; };

  const katSelected = () => {
    const sel = document.getElementById('filterKat'); if (!sel) return [];
    const v = Array.from(sel.selectedOptions).map(o => o.value);
    return v.includes('All') ? [] : v;
  };

  function view(src) {
    let d = src.map(x => Object.assign({}, x));
    const k = KONSEP[cur()].key;
    if (k) d.forEach(x => { x.allResultRaw = k(x); });
    const dec = KONSEP[cur()].decorate; if (dec) d.forEach(dec);   // hanya mengubah teks tampilan salinan data
    const kat = katSelected();
    if (kat.length) d = d.filter(x => kat.indexOf(String(x.kategori_section || 'Unassigned')) >= 0);
    return d;
  }

  // data baru dari backend terdeteksi saat halaman memanggil renderExecutiveSummary/renderTable
  function intake() {
    if (typeof rawKpiData === 'undefined' || !Array.isArray(rawKpiData) || rawKpiData === lastView) return;
    orig = rawKpiData; katOptions();
    lastView = rawKpiData = view(orig);
  }
  function refresh() {
    if (!orig) return;
    lastView = rawKpiData = view(orig);
    renderExecutiveSummary(); renderTable();
  }

  const tidyText = s => s.replace(/(\d+)\.(\d+)%/g, (m, a, b) => { b = b.replace(/0+$/, ''); return a + (b ? '.' + b : '') + '%'; });
  function tidy() {
    const body = document.getElementById('tableBody'); if (!body) return;
    const w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (/\d\.\d+%/.test(n.nodeValue)) n.nodeValue = tidyText(n.nodeValue);
  }

  function paint() {
    document.querySelectorAll('.konsep-bar button[data-k]').forEach(b => b.classList.toggle('active', +b.dataset.k === cur()));
    const d = document.getElementById('konsepDesc'); if (d) d.textContent = 'Konsep ' + cur() + ': ' + KONSEP[cur()].desc;
  }
  function setKonsep(n) { store.set('kpiKonsep', String(n)); paint(); refresh(); }

  function katOptions() {
    const sel = document.getElementById('filterKat'); if (!sel || !orig) return;
    const prev = Array.from(sel.selectedOptions).map(o => o.value);
    const cats = Array.from(new Set(orig.map(x => String(x.kategori_section || 'Unassigned')))).sort();
    sel.innerHTML = '<option value="All">All Kategori</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    const keep = prev.filter(v => v === 'All' || cats.indexOf(v) >= 0);
    Array.from(sel.options).forEach(o => { o.selected = keep.length ? keep.indexOf(o.value) >= 0 : o.value === 'All'; });
  }

  // pastikan kolom Kategori Section ada di Custom Studio (tepat di kanan Section), walau konfigurasi lama tersimpan
  function ensureKatColumn() {
    if (typeof customColumns === 'undefined' || !Array.isArray(customColumns)) return;
    if (customColumns.some(c => c.key === 'kategori_section')) return;
    const sec = customColumns.find(c => c.key === 'section'); if (!sec) return;
    customColumns.forEach(c => { if (c.order > sec.order) c.order += 1; });
    customColumns.push({ key: 'kategori_section', label: 'KATEGORI SECTION', group: 'main', order: sec.order + 1, show: true });
    store.set('kpiCustomNewStructureV3', JSON.stringify(customColumns));
  }

  function wrap(name, fn) {
    const o = window[name]; if (typeof o !== 'function') return;
    window[name] = function () { return fn(o, this, arguments); };
  }

  function build() {
    ensureKatColumn();
    wrap('renderExecutiveSummary', (o, t, a) => { intake(); return o.apply(t, a); });
    wrap('renderTable', (o, t, a) => { intake(); const r = o.apply(t, a); tidy(); return r; });

    const css = document.createElement('style');
    css.textContent = '.konsep-bar{background:var(--card-bg);padding:10px 18px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:15px;border:1px solid var(--border-color)}' +
      '.konsep-btns{display:flex;gap:8px;flex-wrap:wrap}.konsep-desc{font-size:11px;opacity:.75;margin-top:8px}';
    document.head.appendChild(css);

    const hd = document.querySelector('.top-header');
    if (hd) {
      const bar = document.createElement('div'); bar.className = 'konsep-bar';
      bar.innerHTML = '<div class="konsep-btns">' + [1, 2, 3, 4, 5].map(n => `<button type="button" class="nav-btn" data-k="${n}">Konsep ${n}</button>`).join('') + '</div><div class="konsep-desc" id="konsepDesc"></div>';
      hd.insertAdjacentElement('afterend', bar);
      bar.onclick = e => { const b = e.target.closest('button[data-k]'); if (b) setKonsep(+b.dataset.k); };
      paint();
    }

    const sk = document.getElementById('filterSkill'), grp = sk && sk.closest('.form-group');
    if (grp) {
      const g = document.createElement('div'); g.className = 'form-group';
      g.innerHTML = '<label>Filter Kategori Section (Multi)</label><select id="filterKat" multiple class="filter-multi-select" title="Tahan Ctrl / Tap untuk pilih banyak"><option value="All" selected>All Kategori</option></select>';
      grp.insertAdjacentElement('afterend', g);
      g.querySelector('#filterKat').onchange = refresh;
    }
  }
  document.addEventListener('DOMContentLoaded', build);
  window.KonsepStudio = { view: view, setKonsep: setKonsep, tidyText: tidyText };
})();
