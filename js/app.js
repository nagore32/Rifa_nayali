(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var digits = function (s) { return String(s || '').replace(/\D/g, ''); };
  var sortN = function (a) { return Array.from(a).sort(function (x, y) { return x - y; }); };

  var total = function () { return Math.max(1, parseInt(CONFIG.total, 10) || 300); };
  var money = function (v) {
    var sep = CONFIG.thousands === '.' ? '.' : ',';
    return (CONFIG.symbol || '') + String(Math.round(+v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  };
  var waNum = function (phone) {
    var d = digits(phone), cc = digits(CONFIG.countryCode);
    if (cc && d.length && d.length <= 10 && d.indexOf(cc) !== 0) d = cc + d;
    return d;
  };

  var sel = new Set();
  var taken = {}; // { "23": "reserved" | "paid" }

  /* ---------- pintar la parte que no cambia ---------- */
  function paintStatic() {
    $('#title').textContent = CONFIG.title;
    $('#price').textContent = money(CONFIG.price);
    $('#price').setAttribute('aria-label', 'Valor de cada número: ' + money(CONFIG.price));
    if (CONFIG.message) $('#message').textContent = CONFIG.message;
    else $('#message').remove();
    var wn = waNum(CONFIG.whatsapp);
    if (wn) {
      var a = $('#phone'); a.href = 'https://wa.me/' + wn; a.textContent = CONFIG.whatsapp;
    } else $('#phone').remove();

    var pg = $('#pgrid');
    (CONFIG.prizes || []).forEach(function (p, i) {
      var art = document.createElement('article'); art.className = 'prize';
      art.innerHTML = '<span class="p-num k' + (i % 8 + 1) + '" aria-hidden="true">' + (i + 1) + '</span>' +
        (p.img ? '<div class="p-img"><img src="' + esc(p.img) + '" alt="" loading="lazy" onerror="this.closest(\'.p-img\').classList.add(\'noimg\')"></div>' : '') +
        '<p class="p-name"><span class="sr">Premio ' + (i + 1) + ': </span>' + esc(p.name) + '</p>';
      pg.appendChild(art);
    });
    if (!CONFIG.prizes || !CONFIG.prizes.length) $('#prizes').hidden = true;

    var foot = $('#foot'), any = false;
    if (CONFIG.drawDate) { $('#drawDate').textContent = 'Sorteo: ' + CONFIG.drawDate; any = true; } else $('#drawDate').remove();
    if (CONFIG.payInfo) { $('#payInfo').textContent = CONFIG.payInfo; any = true; } else $('#payInfo').remove();
    if (CONFIG.organizer) { $('#organizer').textContent = CONFIG.organizer; any = true; } else $('#organizer').remove();
    if (!any) foot.hidden = true;
  }

  /* ---------- pedir el estado del tablero a la base de datos ---------- */
  function looksConfigured() {
    return CONFIG.supabaseUrl && CONFIG.supabaseAnonKey &&
      CONFIG.supabaseUrl.indexOf('PEGA_AQUI') === -1 && CONFIG.supabaseAnonKey.indexOf('PEGA_AQUI') === -1;
  }
  function fetchTaken() {
    var url = CONFIG.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/' + encodeURIComponent(CONFIG.publicView) +
      '?select=number,status&status=neq.free&order=number';
    return fetch(url, {
      headers: { apikey: CONFIG.supabaseAnonKey, Authorization: 'Bearer ' + CONFIG.supabaseAnonKey }
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (rows) {
      var t = {};
      rows.forEach(function (r) {
        var n = +r.number;
        if (n >= 1 && n <= total()) t[n] = r.status === 'paid' ? 'paid' : 'reserved';
      });
      return t;
    });
  }

  /* ---------- tablero ---------- */
  function counts() {
    var p = 0, r = 0;
    Object.keys(taken).forEach(function (n) { if (taken[n] === 'paid') p++; else r++; });
    return { p: p, r: r, f: total() - p - r };
  }
  function cellHtml(n) {
    var st = taken[n], isSel = sel.has(n);
    var cls = st === 'paid' ? 'paid' : st === 'reserved' ? 'resv' : 'free';
    var label = st === 'paid' ? 'pagado' : st === 'reserved' ? 'apartado' : 'disponible';
    return '<button class="cell ' + cls + (isSel ? ' sel' : '') + '" data-n="' + n + '"' + (st ? ' disabled' : '') +
      ' aria-pressed="' + isSel + '" aria-label="Número ' + n + ', ' + label + '">' + n + '</button>';
  }
  function renderBoard() {
    var k = counts();
    var pct = function (x) { return (x / total() * 100).toFixed(2) + '%'; };
    $('#pbar').style.width = pct(k.p); $('#rbar').style.width = pct(k.r);
    $('#lfree').textContent = 'Libre ' + k.f; $('#lresv').textContent = 'Apartado ' + k.r; $('#lpaid').textContent = 'Pagado ' + k.p;
    var h = ''; for (var n = 1; n <= total(); n++) h += cellHtml(n);
    $('#grid').innerHTML = h;
  }
  function toggle(n) {
    if (taken[n]) return;
    if (sel.has(n)) sel.delete(n); else sel.add(n);
    var b = $('.cell[data-n="' + n + '"]');
    if (b) { b.classList.toggle('sel', sel.has(n)); b.setAttribute('aria-pressed', sel.has(n)); }
    renderBar();
  }
  function selMessage() {
    var ns = sortN(sel);
    var name = $('#myname') ? $('#myname').value.trim() : '';
    return 'Hola! Quiero apartar ' + (ns.length > 1 ? 'los números ' : 'el número ') + ns.join(', ') +
      ' (' + money(ns.length * (+CONFIG.price || 0)) + ') de "' + CONFIG.title + '".' + (name ? ' Soy ' + name + '.' : '');
  }
  function renderBar() {
    var bar = $('#bar'), ns = sortN(sel);
    if (!ns.length) { bar.className = 'bar'; bar.innerHTML = ''; return; }
    bar.className = 'bar on';
    var wn = waNum(CONFIG.whatsapp);
    var link = wn ? 'https://wa.me/' + wn + '?text=' + encodeURIComponent(selMessage()) : null;
    bar.innerHTML = '<div class="bar-in"><div class="bar-txt"><b>' + ns.length + '</b> número' + (ns.length > 1 ? 's' : '') +
      ' elegido' + (ns.length > 1 ? 's' : '') + ', total <b>' + money(ns.length * (+CONFIG.price || 0)) + '</b>' +
      '<span class="nums">' + ns.join(', ') + '</span></div>' +
      '<input id="myname" autocomplete="name" placeholder="Tu nombre (opcional)" aria-label="Tu nombre">' +
      '<div class="bar-act"><button class="btn ghost" id="clearsel">Limpiar</button>' +
      (link ? '<a class="btn" id="wa" target="_blank" rel="noopener noreferrer" href="' + esc(link) + '">Apartar por WhatsApp</a>'
            : '<button class="btn" id="copysel">Copiar mi selección</button>') + '</div></div>';
    $('#clearsel').onclick = function () { sel.clear(); renderBoard(); renderBar(); };
    var cp = $('#copysel'); if (cp) cp.onclick = function () {
      navigator.clipboard.writeText(selMessage()).then(function () { toast('Copiado. Envíaselo al organizador.'); },
        function () { toast('No se pudo copiar. Anota tus números: ' + ns.join(', ')); });
    };
    var nm = $('#myname'); if (nm) nm.addEventListener('input', function () {
      var wa = $('#wa'); if (wa) wa.href = 'https://wa.me/' + wn + '?text=' + encodeURIComponent(selMessage());
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.cell'); if (b && !b.disabled) toggle(+b.getAttribute('data-n'));
    if (e.target.closest('#goboard')) $('#tablero').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (e.target.closest('#refresh')) load(true);
  });

  var toastT;
  function toast(msg) {
    var el = $('#toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 3200);
  }

  /* ---------- carga y refresco automático ---------- */
  function load(manual) {
    if (!looksConfigured()) {
      $('#grid').innerHTML = '';
      $('#boardmsg').className = 'msg err';
      $('#boardmsg').textContent = 'Falta conectar la base de datos: edita js/config.js con tu URL y tu clave de Supabase (ver README.md).';
      return;
    }
    if (manual) toast('Actualizando...');
    fetchTaken().then(function (t) {
      taken = t; sel.forEach(function (n) { if (taken[n]) sel.delete(n); });
      $('#boardmsg').textContent = ''; $('#boardmsg').className = 'msg';
      renderBoard(); renderBar();
      if (manual) toast('Tablero actualizado');
    }).catch(function (err) {
      $('#boardmsg').className = 'msg err';
      $('#boardmsg').textContent = 'No se pudo cargar el tablero. Revisa tu conexión o la configuración de la base de datos.';
      if (manual) toast('No se pudo actualizar');
    });
  }

  paintStatic(); renderBoard(); renderBar(); load(false);
  setInterval(function () { load(false); }, 25000);
})();
