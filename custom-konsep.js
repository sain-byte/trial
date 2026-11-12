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

  // ---- Konsep berbasis bonus (4 dan 5) ----
  // Dasar produktivitas maks 40 poin (dari backend). QA maks 100% -> 50 poin, absensi maks 100% -> 10 poin.
  // BONUS_BATAS (Konsep 4): kelebihan target yang dihitung. 0.5 = sampai 150% dari target. Infinity = tanpa batas.
  const BONUS_BATAS = 0.5;
  function skorBonus(d, o) {   // semua dalam poin persen (40 = 40%)
    const t = String(d.prodTgt == null ? '' : d.prodTgt).split('/').map(x => parseFloat(x) || 0), tK = t[0] || 0, tS = t[1] || 0, dual = tS > 0;
    const lebih = (ach, tgt) => tgt > 0 ? Math.max(0, num(ach) / tgt - 1) : 0;
    const hitung = r => o.bertingkat
      ? Math.min(r, o.bertingkat[0]) + 0.5 * Math.max(0, Math.min(r, o.bertingkat[1]) - o.bertingkat[0])   // penuh sampai batas 1, setengah sampai batas 2
      : Math.min(r, o.batas);
    let bonus = hitung(lebih(d.prodKapture, tK)) * (dual ? 20 : 40) + (dual ? hitung(lebih(d.prodSociomile, tS)) * 20 : 0);
    const prod = num(d.prodResult), qa = Math.min(num(d.qaAch), 100), atd = Math.min(num(d.atdAch), 100);
    if (o.syaratQA && qa < (num(d.qaTgt) || 90)) bonus = 0;                                           // kualitas harus memenuhi target QA
    if (o.syaratRules && !/^(no\s*rules?)?$/i.test(String(d.cxRules || '').trim())) bonus = 0;       // tidak sedang kena rules
    if (o.syaratSemuaTarget && ((tK > 0 && num(d.prodKapture) < tK) || (dual && num(d.prodSociomile) < tS))) bonus = 0;   // semua target produk tercapai
    return { prod: prod, bonus: bonus, qa: qa, atd: atd, total: prod + qa * 0.5 + atd * 0.1 + bonus };
  }
  function konsepBonus(desc, o, detail) {
    return {
      desc: desc,
      detail: detail,
      key: d => { const s = skorBonus(d, o); return Math.min(800000, Math.round(s.total * 100)) * 1e10 + Math.round(s.qa * 100) * 1e5 + Math.round(s.atd * 100); },
      decorate: d => { const s = skorBonus(d, o); if (s.bonus >= 0.005) d.prodResult = s.prod.toFixed(2) + '% +' + s.bonus.toFixed(2) + '%'; d.allResult = s.total.toFixed(2) + '%'; }
    };
  }

  // ---- Penjelasan lengkap tiap konsep (muncul lewat "Baca selengkapnya") ----
  // Angka di tabel contoh dihitung dari pengaturan, jadi ikut berubah kalau BONUS_BATAS atau tingkat bonus diubah.
  const fmt = n => String(parseFloat(n.toFixed(2)));
  const p = t => '<p>' + t + '</p>';
  const h = t => '<h4>' + t + '</h4>';
  const ol = a => '<ol>' + a.map(x => '<li>' + x + '</li>').join('') + '</ol>';
  const ul = a => '<ul>' + a.map(x => '<li>' + x + '</li>').join('') + '</ul>';
  const tbl = (head, rows) => '<div class="kt"><table><tr>' + head.map(x => '<th>' + x + '</th>').join('') + '</tr>' +
    rows.map(r => '<tr>' + r.map(x => '<td>' + x + '</td>').join('') + '</tr>').join('') + '</table></div>';
  const OPT4 = { batas: BONUS_BATAS };
  const OPT5 = { bertingkat: [0.2, 0.5], syaratQA: true, syaratRules: true, syaratSemuaTarget: true };
  const bonusAt = (o, cap) => skorBonus({ prodTgt: '100', prodKapture: cap, prodSociomile: 0, prodResult: '40.00%', qaAch: '100.00%', qaTgt: '90%', atdAch: '100.00%', cxRules: 'No Rules' }, o);
  const contoh = (o, caps) => tbl(['Capaian (target 100)', 'Bonus', 'Prod Result', 'Total*'], caps.map(c => {
    const s = bonusAt(o, c), b = s.bonus >= 0.005 ? '+' + fmt(s.bonus) + '%' : '';
    return [c + '%', b || '0', '40%' + (b ? ' ' + b : ''), fmt(s.total) + '%'];
  }));
  const maksTxt = o => (o.bertingkat || isFinite(o.batas)) ? '+' + fmt(bonusAt(o, 100000).bonus) + '%' : 'tidak ada batas';
  const batasTxt = isFinite(BONUS_BATAS) ? 'sampai ' + fmt((1 + BONUS_BATAS) * 100) + '% dari target' : 'tanpa batas';
  const URUTAN = h('Urutan pembandingnya');
  const DETAIL = {
    1: () =>
      p('Ini cara ranking yang dipakai dari awal dan tidak ada yang diubah. Agen diurutkan dari poin tertinggi (maksimal 10). Kalau poinnya sama, pembandingnya persentase hasil total dengan semua desimalnya.') +
      p('Hasil total itu gabungan tiga bagian: produktivitas maksimal 40%, QA maksimal 50%, dan absensi maksimal 10%. Produktivitas dan absensi dibatasi 100%, jadi kelebihan dari target tidak dihitung.') +
      p('Karena itu banyak agen yang sama-sama 100% dan poin 10. Kalau sudah begitu, urutannya ikut urutan data di sheet, jadi belum ada pembeda yang jelas. Konsep 2 sampai 5 dibuat untuk menjawab hal ini.'),
    2: () =>
      p('Agen yang sama-sama poin 10 dibedakan dari kualitasnya dulu, baru volume kerjanya.') +
      URUTAN + ol(['QA tertinggi', 'Total produktivitas (kolom TOTAL ACH) tertinggi', 'Absensi tertinggi']) +
      p('Angka di nomor 2 dipakai apa adanya, yaitu Kapture ditambah Sociomile. Akibatnya section yang targetnya besar cenderung selalu di atas section bertarget kecil, walaupun persentase capaiannya lebih rendah. Hal ini diperbaiki di Konsep 3.') +
      h('Contoh') +
      tbl(['Agen', 'QA', 'TOTAL ACH', 'Target', 'Urutan'], [['A', '100%', '1726', '1300 (133%)', '1'], ['B', '100%', '229', '110 (208%)', '2'], ['C', '98%', '3000', '1300 (231%)', '3']]) +
      p('A dan B sama-sama QA 100%, jadi dilihat volumenya. 1726 mengalahkan 229 padahal capaian B terhadap targetnya lebih tinggi. C paling bawah karena QA-nya lebih rendah, sebesar apa pun volumenya.'),
    3: () =>
      p('Sama seperti Konsep 2, kualitas dulu. Bedanya, volume kerja dibandingkan dalam persen capaian terhadap target section masing-masing, bukan angka mentah. Dengan begitu section bertarget kecil tidak otomatis kalah.') +
      URUTAN + ol(['QA tertinggi', 'Persentase capaian target tertinggi', 'Absensi tertinggi']) +
      h('Cara menghitung capaian') +
      ul(['Satu produk: Kapture dibagi target Kapture.', 'Dua produk: rata-rata capaian Kapture dan Sociomile (50:50, sesuai bobot 20% + 20%).', 'Sociomile di section yang hanya punya target Kapture tidak ikut dihitung.', 'Capaian tidak dibatasi 100%, supaya yang melebihi target tetap kelihatan bedanya.']) +
      h('Contoh (QA sama-sama 100%)') +
      tbl(['Agen', 'Capaian', 'Persen', 'Urutan'], [['C (dua produk)', 'Kapture 100 dari 100, Sociomile 100 dari 50', '(100% + 200%) / 2 = 150%', '1'], ['A', '1726 dari 1300', '133%', '2'], ['B', '136 dari 110', '124%', '3']]),
    4: () =>
      p('Agen yang sama-sama poin 10 dibandingkan lewat persentase total yang boleh lebih dari 100%. Kelebihannya datang dari bonus produktivitas, karena QA dan absensi sudah mentok di 100%.') +
      URUTAN + ol(['Persentase total tertinggi (dasar + bonus)', 'QA tertinggi', 'Absensi tertinggi']) +
      h('Cara menghitung bonus') +
      p('Bonus = kelebihan capaian dari target x bobot produk (40% untuk satu produk, 20% + 20% untuk dua produk). Bonus dihitung ' + batasTxt + ', lebihnya tidak bertambah. Poin tidak ikut berubah.') +
      contoh(OPT4, [100, 110, 125, 150, 200]) +
      p('*dengan QA dan absensi 100%. Bonus maksimal: ' + maksTxt(OPT4) + '.') +
      p('Konsep ini tidak punya syarat tambahan, jadi agen yang QA-nya rendah pun tetap dapat bonus kalau volumenya tinggi. Konsep 5 menutup celah itu.'),
    5: () =>
      p('Dasarnya sama dengan Konsep 4: poin sama-sama 10 dibandingkan lewat persentase total yang bisa lebih dari 100%. Bedanya, bonus tidak diberikan begitu saja. Ada syaratnya, dan hitungannya bertingkat supaya satu angka yang terlalu besar tidak menentukan semuanya.') +
      URUTAN + ol(['Persentase total tertinggi (dasar + bonus)', 'QA tertinggi', 'Absensi tertinggi']) +
      h('Syarat bonus (semuanya harus terpenuhi)') +
      ul(['Semua target produk tercapai. Untuk section dua produk, Kapture dan Sociomile sama-sama minimal 100%.', 'QA memenuhi target (90%).', 'Tidak sedang kena rules.']) +
      p('Kalau ada satu saja yang tidak terpenuhi, bonusnya nol dan yang dihitung hanya nilai dasar.') +
      h('Cara menghitung bonus') +
      p('Bonus = kelebihan capaian dari target x bobot produk (40%, atau 20% + 20% untuk dua produk). Kelebihan sampai 20% dihitung penuh, dari 20% sampai 50% dihitung setengah, lebih dari itu tidak bertambah.') +
      contoh(OPT5, [100, 110, 120, 135, 150, 200]) +
      p('*dengan QA dan absensi 100%. Bonus maksimal: ' + maksTxt(OPT5) + '.') +
      h('Bedanya dengan Konsep 4') +
      tbl(['', 'Konsep 4', 'Konsep 5'], [['Syarat bonus', 'Tidak ada', 'Tiga syarat di atas'], ['Cara hitung', 'Penuh ' + batasTxt, 'Penuh sampai 120%, setengah sampai 150%'], ['Bonus maksimal', maksTxt(OPT4), maksTxt(OPT5)]])
  };

  // Kunci urutan saat POIN SAMA (makin besar makin tinggi ranknya).
  // Konsep 2: QA tertinggi -> total produktivitas tertinggi -> absensi tertinggi.
  const KONSEP = {
    1: { desc: 'Cara lama: poin dulu, kalau sama dilihat hasil total sampai desimalnya.', detail: DETAIL[1], key: null },
    2: { desc: 'Poin sama dibedakan dari QA tertinggi, lalu total produktivitas, lalu absensi.', detail: DETAIL[2],
         key: d => Math.round(num(d.qaAch) * 100) * 1e11 + Math.min(999999, Math.round(num(d.prodAch))) * 1e5 + Math.round(num(d.atdAch) * 100) },
    // Konsep 3: adil antar section. Capaian = % dari target (1 produk: Kapture; 2 produk: Kapture & Sociomile 50:50 seperti bobot 20%+20%), tanpa batas 100%.
    3: { desc: 'Seperti Konsep 2, tapi volume dibandingkan dalam persen capaian target, jadi section bertarget kecil tidak otomatis kalah.', detail: DETAIL[3],
         key: d => {
           const tg = String(d.prodTgt == null ? '' : d.prodTgt).split('/').map(x => parseFloat(x) || 0), tK = tg[0] || 0, tS = tg[1] || 0;
           const kR = tK > 0 ? num(d.prodKapture) / tK : 0, sR = tS > 0 ? num(d.prodSociomile) / tS : 0, ratio = tS > 0 ? (kR + sR) / 2 : kR;
           return Math.round(num(d.qaAch) * 100) * 1e10 + Math.min(99999, Math.round(ratio * 10000)) * 1e5 + Math.min(99999, Math.round(num(d.atdAch) * 100));
         } },
    4: konsepBonus('Poin sama dibedakan lewat persentase total yang boleh lebih dari 100% berkat bonus kelebihan target.', OPT4, DETAIL[4]),
    // Konsep 5 = Konsep 4 yang lebih adil: bonus hanya jika semua target produk tercapai, QA >= target QA, tanpa rules;
    // bonus penuh sampai 120% target, setengah sampai 150%, setelah itu tidak bertambah (menahan data pencilan).
    5: konsepBonus('Seperti Konsep 4, tapi bonus lebih ketat: hanya jika semua target tercapai, QA memenuhi target, tanpa rules, dan bertingkat.', OPT5, DETAIL[5])
    // === TEMPLATE konsep baru (tambahkan koma di atas, salin, ganti angka 6, 7, 8 ...): ===
    // 6: { desc: 'keterangan 1 baris', detail: () => '<p>penjelasan lengkap (opsional)</p>', key: d => (angka; makin besar makin tinggi ranknya saat poin sama), decorate: d => { /* opsional: ubah teks tampilan */ } }
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

  function detail(open) {
    const box = document.getElementById('konsepDetail'), more = document.getElementById('konsepMore'); if (!box || !more) return;
    const fn = KONSEP[cur()].detail;
    more.style.display = fn ? '' : 'none';
    if (open && fn) { box.innerHTML = fn(); box.hidden = false; more.textContent = 'Tutup \u25B4'; }
    else { box.hidden = true; more.textContent = 'Baca selengkapnya \u25BE'; }
  }
  function paint() {
    document.querySelectorAll('.konsep-bar button[data-k]').forEach(b => b.classList.toggle('active', +b.dataset.k === cur()));
    const d = document.getElementById('konsepDesc'); if (d) d.textContent = 'Konsep ' + cur() + ': ' + KONSEP[cur()].desc;
    detail(false);
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
      '.konsep-btns{display:flex;gap:8px;flex-wrap:wrap}.konsep-info{display:flex;gap:8px;align-items:baseline;margin-top:8px;font-size:11px}.konsep-line{flex:1;min-width:0;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.konsep-more{flex:none;color:#007bff;font-weight:bold;text-decoration:none;cursor:pointer}.konsep-detail{margin-top:10px;padding-top:10px;border-top:1px dashed var(--border-color,var(--border));font-size:12px;line-height:1.55;animation:kfade .2s}@keyframes kfade{from{opacity:0;transform:translateY(-4px)}}.konsep-detail p{margin:0 0 8px}.konsep-detail h4{margin:10px 0 4px;font-size:12px}.konsep-detail ol,.konsep-detail ul{margin:0 0 8px;padding-left:20px}.konsep-detail .kt{overflow-x:auto;margin:4px 0 8px}.konsep-detail table{border-collapse:collapse;font-size:11.5px}.konsep-detail th,.konsep-detail td{border:1px solid var(--border-color,var(--border));padding:4px 9px;text-align:left;white-space:nowrap}.konsep-detail th{background:rgba(127,127,127,.12)}';
    document.head.appendChild(css);

    const hd = document.querySelector('.top-header');
    if (hd) {
      const bar = document.createElement('div'); bar.className = 'konsep-bar';
      bar.innerHTML = '<div class="konsep-btns">' + Object.keys(KONSEP).map(Number).sort((a, b) => a - b).map(n => `<button type="button" class="nav-btn" data-k="${n}">Konsep ${n}</button>`).join('') + '</div><div class="konsep-info"><span class="konsep-line" id="konsepDesc"></span><a href="#" class="konsep-more" id="konsepMore">Baca selengkapnya</a></div><div class="konsep-detail" id="konsepDetail" hidden></div>';
      hd.insertAdjacentElement('afterend', bar);
      bar.onclick = e => {
        const b = e.target.closest('button[data-k]'); if (b) return setKonsep(+b.dataset.k);
        if (e.target.id === 'konsepMore') { e.preventDefault(); detail(document.getElementById('konsepDetail').hidden); }
      };
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
  window.KonsepStudio = { view: view, setKonsep: setKonsep, tidyText: tidyText, konsep: KONSEP };
})();
