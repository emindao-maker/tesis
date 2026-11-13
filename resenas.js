/* Comentarios: inicio de sesión con Google y calificación de 1 a 5 estrellas */
(function () {
  var C = window.TRABAJOS_CONFIG || {};
  var lista = document.getElementById("rv-list");
  if (!lista) return;
  var listo = !!(C.supabaseUrl && C.supabaseKey && window.supabase && window.supabase.createClient);
  var sb = null;
  if (listo) {
    try {
      sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {
        auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true, storageKey: "tesis-resenas" }
      });
    } catch (e) { listo = false; }
  }

  var $ = function (id) { return document.getElementById(id); };
  var form = $("rv-form"), fuera = $("rv-out"), estado = $("rv-status");
  var POR_PAGINA = 12, mostradas = POR_PAGINA;
  var todas = [], usuario = null, mia = null;
  var TEXTOS = { 1: "Malo", 2: "Regular", 3: "Bueno", 4: "Muy bueno", 5: "Excelente" };

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function svg(id, cls) { var s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("aria-hidden", "true"); if (cls) s.setAttribute("class", cls); var u = document.createElementNS("http://www.w3.org/2000/svg", "use"); u.setAttribute("href", "#" + id); s.appendChild(u); return s; }
  function estrellas(n, cont) {
    cont.textContent = "";
    var r = Math.round(n);
    for (var i = 1; i <= 5; i++) cont.appendChild(svg("i-star", i <= r ? "" : "off"));
    return cont;
  }
  function fecha(iso) {
    try { return new Date(iso).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; }
  }
  function avatar(url) {
    if (url) { var im = el("img", "rv-av"); im.alt = ""; im.referrerPolicy = "no-referrer"; im.loading = "lazy"; im.src = url; im.onerror = function () { im.replaceWith(ph()); }; return im; }
    return ph();
  }
  function ph() { var s = el("span", "rv-av"); s.appendChild(svg("i-user")); return s; }

  /* ---------- Resumen y lista ---------- */
  function pintarResumen() {
    var n = todas.length, suma = 0, cuenta = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    todas.forEach(function (r) { suma += r.estrellas; cuenta[r.estrellas]++; });
    var prom = n ? suma / n : 0;
    $("rv-avg").textContent = n ? prom.toFixed(1).replace(".", ",") : "–";
    estrellas(prom, $("rv-avg-stars"));
    $("rv-count").textContent = n ? "Promedio de " + n + (n === 1 ? " opinión" : " opiniones") : "Aún no hay opiniones";
    var bars = $("rv-bars"); bars.textContent = "";
    for (var k = 5; k >= 1; k--) {
      var li = el("li"); li.appendChild(el("span", null, k + (k === 1 ? " estrella" : " estrellas")));
      var i = el("i"); var b = el("b"); b.style.width = (n ? Math.round(cuenta[k] / n * 100) : 0) + "%"; i.appendChild(b); li.appendChild(i);
      li.appendChild(el("span", null, String(cuenta[k]))); bars.appendChild(li);
    }
  }

  function pintarLista() {
    lista.textContent = "";
    var orden = todas.slice().sort(function (a, b) { return (b.creado_en > a.creado_en) ? 1 : -1; });
    if (mia) orden = [mia].concat(orden.filter(function (r) { return r.id !== mia.id; }));
    orden.slice(0, mostradas).forEach(function (r) {
      var li = el("li", "rv-item"), head = el("div", "rv-head");
      head.appendChild(avatar(r.avatar_url));
      var who = el("div"); who.appendChild(el("b", null, r.nombre || "Usuario de Google"));
      who.appendChild(el("small", null, fecha(r.creado_en) + (r.actualizado_en && r.actualizado_en.slice(0, 16) !== r.creado_en.slice(0, 16) ? " · editado" : "")));
      head.appendChild(who);
      if (usuario && r.user_id === usuario.id) head.appendChild(el("span", "rv-mine", "TU COMENTARIO"));
      li.appendChild(head);
      var st = el("span", "stars"); st.setAttribute("role", "img"); st.setAttribute("aria-label", r.estrellas + " de 5 estrellas");
      li.appendChild(estrellas(r.estrellas, st));
      li.appendChild(el("p", null, r.comentario));
      lista.appendChild(li);
    });
    $("rv-empty").hidden = todas.length > 0;
    $("rv-more").hidden = todas.length <= mostradas;
  }
  $("rv-more").addEventListener("click", function () { mostradas += POR_PAGINA; pintarLista(); });

  function cargar() {
    if (!listo) { pintarResumen(); pintarLista(); $("rv-count").textContent = "Los comentarios no están disponibles en este momento"; return Promise.resolve(); }
    return sb.from("resenas").select("id,creado_en,actualizado_en,user_id,nombre,avatar_url,estrellas,comentario")
      .order("creado_en", { ascending: false }).limit(500)
      .then(function (r) {
        if (r.error) throw r.error;
        todas = r.data || [];
        mia = usuario ? (todas.filter(function (x) { return x.user_id === usuario.id; })[0] || null) : null;
        pintarResumen(); pintarLista(); prepararFormulario();
      })
      .catch(function () { $("rv-count").textContent = "No pudimos cargar los comentarios. Vuelve a abrir la página en un momento."; });
  }

  /* ---------- Sesión ---------- */
  function prepararFormulario() {
    var on = !!usuario;
    fuera.hidden = on; form.hidden = !on;
    if (!on) return;
    var meta = usuario.user_metadata || {};
    $("rv-me-name").textContent = meta.full_name || meta.name || usuario.email || "Tu cuenta de Google";
    var img = $("rv-me-img");
    if (meta.avatar_url) { img.src = meta.avatar_url; img.hidden = false; $("rv-me-ph").hidden = true; }
    else { img.hidden = true; $("rv-me-ph").hidden = false; }
    if (mia && !form.dataset.tocado) {
      var radio = $("rv-s" + mia.estrellas); if (radio) radio.checked = true;
      $("rv-text").value = mia.comentario;
      textoEstrellas();
      contar();
    }
    $("rv-send").querySelector("span").textContent = mia ? "Guardar cambios" : "Publicar comentario";
    $("rv-del").hidden = !mia;
  }

  $("rv-login").addEventListener("click", function () {
    $("rv-login-err").textContent = "";
    if (!listo) { $("rv-login-err").textContent = "El inicio de sesión no está disponible en este momento."; return; }
    try { sessionStorage.setItem("tesis-ir-a", "comentarios"); } catch (e) {}
    sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } })
      .then(function (r) { if (r.error) throw r.error; })
      .catch(function () { $("rv-login-err").textContent = "No se pudo abrir el inicio de sesión con Google. Inténtalo otra vez en un momento."; });
  });
  $("rv-logout").addEventListener("click", function () { sb.auth.signOut(); });

  /* ---------- Formulario ---------- */
  function elegida() { var c = form.querySelector('input[name="estrellas"]:checked'); return c ? Number(c.value) : 0; }
  function textoEstrellas() { var n = elegida(); $("rv-pick-txt").textContent = n ? n + (n === 1 ? " estrella · " : " estrellas · ") + TEXTOS[n] : "Elige de 1 a 5 estrellas"; }
  function contar() { $("rv-chars").textContent = $("rv-text").value.length; }
  form.addEventListener("change", function (e) { if (e.target.name === "estrellas") { textoEstrellas(); $("rv-e-stars").textContent = ""; form.dataset.tocado = "1"; } });
  $("rv-text").addEventListener("input", function () { contar(); $("rv-e-text").textContent = ""; form.dataset.tocado = "1"; });
  function aviso(tipo, msg) { estado.className = "tru-status " + tipo; estado.textContent = msg; estado.hidden = !msg; }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var n = elegida(), txt = $("rv-text").value.trim(), ok = true;
    if (!n) { $("rv-e-stars").textContent = "Elige cuántas estrellas le das al servicio."; ok = false; }
    if (txt.length < 5) { $("rv-e-text").textContent = "Escribe un comentario de al menos 5 letras."; ok = false; }
    else if (/(https?:\/\/|www\.|<\s*[a-z\/])/i.test(txt)) { $("rv-e-text").textContent = "Por seguridad, el comentario no puede llevar enlaces ni código."; ok = false; }
    if (!ok) return;
    var btn = $("rv-send"); btn.disabled = true; aviso("", "");
    var q = mia
      ? sb.from("resenas").update({ estrellas: n, comentario: txt }).eq("id", mia.id)
      : sb.from("resenas").insert({ estrellas: n, comentario: txt });
    var eraNueva = !mia;
    q.then(function (r) {
      if (r.error) throw r.error;
      delete form.dataset.tocado;
      aviso("ok", eraNueva ? "Gracias, tu comentario ya está publicado." : "Listo, guardamos los cambios de tu comentario.");
      return cargar();
    }).catch(function (e) {
      var m = ((e && e.code) || "") + " " + ((e && e.message) || "");
      var txtErr = "No se pudo guardar tu comentario. Revisa tu conexión e inténtalo otra vez.";
      if (/23505|duplicate/i.test(m)) txtErr = "Ya tienes un comentario publicado. Recarga la página para editarlo.";
      else if (/BLQ:/.test(m)) txtErr = m.split("BLQ:")[1].trim();
      else if (/429|demasiadas|too many/i.test(m)) txtErr = "Hubo demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.";
      aviso("bad", txtErr);
    }).then(function () { btn.disabled = false; });
  });

  var confirmando = false;
  $("rv-del").addEventListener("click", function () {
    var b = $("rv-del");
    if (!mia) return;
    if (!confirmando) { confirmando = true; b.textContent = "Pulsa otra vez para eliminar"; setTimeout(function () { confirmando = false; b.textContent = "Eliminar mi comentario"; }, 4000); return; }
    confirmando = false; b.disabled = true;
    sb.from("resenas").delete().eq("id", mia.id).then(function (r) {
      if (r.error) throw r.error;
      mia = null; form.reset(); delete form.dataset.tocado; textoEstrellas(); contar();
      aviso("ok", "Eliminamos tu comentario.");
      return cargar();
    }).catch(function () { aviso("bad", "No se pudo eliminar tu comentario. Inténtalo otra vez."); })
      .then(function () { b.disabled = false; b.textContent = "Eliminar mi comentario"; });
  });

  /* ---------- Inicio ---------- */
  pintarResumen();
  if (!listo) { cargar(); return; }
  sb.auth.onAuthStateChange(function (_ev, sesion) {
    var antes = usuario && usuario.id;
    usuario = sesion ? sesion.user : null;
    if ((usuario && usuario.id) !== antes) {
      if (!usuario) { mia = null; form.reset(); delete form.dataset.tocado; textoEstrellas(); contar(); aviso("", ""); }
      cargar();
    }
  });
  sb.auth.getSession().then(function (r) {
    usuario = r.data && r.data.session ? r.data.session.user : null;
    return cargar();
  }).then(function () {
    var ir = null; try { ir = sessionStorage.getItem("tesis-ir-a"); sessionStorage.removeItem("tesis-ir-a"); } catch (e) {}
    if (ir === "comentarios" || location.hash === "#comentarios") { var s = $("comentarios"); if (s) s.scrollIntoView(); }
  });
})();
