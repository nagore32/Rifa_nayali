(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var total = function () { return Math.max(1, parseInt(CONFIG.total, 10) || 300); };
  var money = function (v) {
    var sep = CONFIG.thousands === '.' ? '.' : ',';
    return (CONFIG.symbol || '') + String(Math.round(+v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  };

  var SS_KEY = 'rifa_admin_session';
  var session = null;     // { access_token, expires_at, email }
  var rows = {};          // { "23": {status, buyer_name, buyer_phone, note} }
  var editing = null;
  var base = function () { return CONFIG.supabaseUrl.replace(/\/+$/, ''); };

  function toast(msg) {
    var el = $('#toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('on'); }, 3200);
  }
  function looksConfigured() {
    return CONFIG.supabaseUrl && CONFIG.supabaseAnonKey &&
      CONFIG.supabaseUrl.indexOf('PEGA_AQUI') === -1 && CONFIG.supabaseAnonKey.indexOf('PEGA_AQUI') === -1;
  }

  /* ---------------- sesión ---------------- */
  function saveSession(s) { session = s; try { sessionStorage.setItem(SS_KEY, JSON.stringify(s)); } catch (e) {} }
  function loadSession() {
    try {
      var s = JSON.parse(sessionStorage.getItem(SS_KEY) || 'null');
      if (s && s.expires_at > Date.now()) return s;
    } catch (e) {}
    return null;
  }
  function clearSession() { session = null; try { sessionStorage.removeItem(SS_KEY); } catch (e) {} }

  function login(email, pass) {
    return fetch(base() + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CONFIG.supabaseAnonKey },
      body: JSON.stringify({ email: email, password: pass })
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data && data.error_description || data && data.msg || 'No se pudo entrar.');
        saveSession({ access_token: data.access_token, expires_at: Date.now() + (data.expires_in || 3600) * 1000, email: email });
      });
    });
  }
  function logout() { clearSession(); showLogin(); }

  /* ---------------- api de datos (tabla completa, requiere sesión) ---------------- */
  function authHeaders() {
    return { apikey: CONFIG.supabaseAnonKey, Authorization: 'Bearer ' + session.access_token };
  }
  function loadRows() {
    var url = base() + '/rest/v1/' + encodeURIComponent(CONFIG.table) + '?select=number,status,buyer_name,buyer_phone,note&status=neq.free&order=number';
    return fetch(url, { headers: authHeaders() }).then(function (res) {
      if (res.status === 401) { clearSession(); throw { expired: true }; }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (list) {
      rows = {};
      list.forEach(function (r) { rows[r.number] = r; });
    });
  }
  function saveRow(n, patch) {
    var url = base() + '/rest/v1/' + encodeURIComponent(CONFIG.table) + '?number=eq.' + n;
    return fetch(url, {
      method: 'PATCH',
      headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }, authHeaders()),
      body: JSON.stringify(patch)
    }).then(function (res) {
      if (res.status === 401) { clearSession(); throw { expired: true }; }
      if (!res.ok) throw new Error('HTTP ' + res.status);
    });
  }

  /* ---------------- pantallas ---------------- */
  function showLogin() {
    $('#panel').hidden = true; $('#loginBox').hidden = false;
    $('#loginErr').textContent = '';
    $('#pass').value = '';
  }
  function showPanel() {
    $('#loginBox').hidden = true; $('#panel').hidden = false;
    refresh();
  }

  function counts() {
    var p = 0, r = 0;
    Object.keys(rows).forEach(function (n) { if (rows[n].status === 'paid') p++; else r++; });
    return { p: p, r: r, f: total() - p - r };
  }
  function renderStats() {
    var k = counts(), price = +CONFIG.price || 0;
    $('#stats').innerHTML =
      '<div class="stat"><b>' + money(k.p * price) + '</b><span>Recaudado<br>' + k.p + ' pagados</span></div>' +
      '<div class="stat"><b>' + money(k.r * price) + '</b><span>Por cobrar<br>' + k.r + ' apartados</span></div>' +
      '<div class="stat"><b>' + k.f + '</b><span>Libres<br>de ' + total() + '</span></div>';
  }
  function matches(n, q) {
    if (!q) return true;
    if (String(n).indexOf(q) === 0) return true;
    var r = rows[n]; if (!r) return false;
    return ((r.buyer_name || '') + ' ' + (r.buyer_phone || '')).toLowerCase().indexOf(q.toLowerCase()) >= 0;
  }
  function renderGrid() {
    var q = $('#search').value.trim(), h = '';
    for (var n = 1; n <= total(); n++) {
      var r = rows[n];
      if (!r && q) continue; // solo mostramos libres cuando no hay búsqueda, para no listar 300 botones vacíos
      if (r && !matches(n, q)) continue;
      var cls = r ? (r.status === 'paid' ? 'paid' : 'resv') : 'free';
      h += '<button class="cell ' + cls + (editing === n ? ' editing' : '') + '" data-n="' + n + '" aria-label="Número ' + n + '">' + n + '</button>';
    }
    $('#grid').innerHTML = h || '<p class="msg">Nada coincide con tu búsqueda.</p>';
  }
  function openEditor(n) {
    editing = n;
    var r = rows[n] || { status: 'free', buyer_name: '', buyer_phone: '', note: '' };
    $('#edNum').textContent = n;
    $('#edStatus').value = r.status || 'free';
    $('#edName').value = r.buyer_name || '';
    $('#edPhone').value = r.buyer_phone || '';
    $('#edNote').value = r.note || '';
    $('#edErr').textContent = '';
    $('#editor').hidden = false;
    renderGrid();
    $('#editor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function refresh() {
    $('#loadErr').textContent = '';
    loadRows().then(function () {
      renderStats(); renderGrid();
    }).catch(function (e) {
      if (e && e.expired) { toast('Tu sesión expiró, vuelve a entrar.'); showLogin(); return; }
      $('#loadErr').textContent = 'No se pudo cargar la lista. Intenta de nuevo.';
    });
  }

  /* ---------------- eventos ---------------- */
  $('#loginBtn').addEventListener('click', function () {
    var email = $('#email').value.trim(), pass = $('#pass').value;
    var btn = $('#loginBtn');
    if (!email || !pass) { $('#loginErr').textContent = 'Escribe tu correo y tu contraseña.'; return; }
    btn.disabled = true; $('#loginErr').textContent = '';
    login(email, pass).then(showPanel).catch(function (e) {
      $('#loginErr').textContent = 'No pudimos entrar: revisa tu correo y contraseña.';
    }).finally(function () { btn.disabled = false; });
  });
  $('#pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#loginBtn').click(); });
  $('#logoutBtn').addEventListener('click', logout);
  $('#search').addEventListener('input', renderGrid);
  $('#grid').addEventListener('click', function (e) {
    var b = e.target.closest('.cell'); if (b) openEditor(+b.getAttribute('data-n'));
  });
  $('#edSave').addEventListener('click', function () {
    if (editing == null) return;
    var status = $('#edStatus').value, name = $('#edName').value.trim(), phone = $('#edPhone').value.trim(), note = $('#edNote').value.trim();
    if (status !== 'free' && !name) { $('#edErr').textContent = 'Escribe el nombre del comprador.'; return; }
    var patch = status === 'free'
      ? { status: 'free', buyer_name: null, buyer_phone: null, note: null }
      : { status: status, buyer_name: name, buyer_phone: phone, note: note };
    var btn = $('#edSave'); btn.disabled = true;
    saveRow(editing, patch).then(function () {
      if (status === 'free') delete rows[editing]; else rows[editing] = Object.assign({ number: editing }, patch);
      renderStats(); renderGrid(); toast('Guardado: número ' + editing);
      $('#editor').hidden = true; editing = null;
    }).catch(function (e) {
      if (e && e.expired) { toast('Tu sesión expiró, vuelve a entrar.'); showLogin(); return; }
      $('#edErr').textContent = 'No se pudo guardar. Intenta de nuevo.';
    }).finally(function () { btn.disabled = false; });
  });

  /* ---------------- arranque ---------------- */
  session = loadSession();
  if (session) showPanel(); else showLogin();
  if (!looksConfigured()) {
    $('#loginErr').textContent = 'Falta conectar la base de datos: edita js/config.js (ver README.md).';
    $('#loginBtn').disabled = true;
  }
})();
