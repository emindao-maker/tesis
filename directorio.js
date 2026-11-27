/* Directorio de Abogados Ecuador · se abre dentro de la página de Tesis.
   Base de datos: Supabase (tablas abogados, calificaciones_abogados, dir_reportes).
   Todo el contenido se pinta con textContent (nunca con HTML de terceros). */
(function () {
  "use strict";
  var D = window.DIR_DATOS, C = window.TRABAJOS_CONFIG || {};
  var dlg = document.getElementById("dir-dlg");
  var cuerpo = document.getElementById("dir-body");
  var zonaCuenta = document.getElementById("dir-cuenta");
  if (!dlg || !cuerpo || !D) return;

  var WA = C.whatsapp || "593985568519";
  var PROVINCIAS = Object.keys(D.provincias);
  var ESPECIALIDADES = D.especialidades;
  var PAGINA = 12;
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var MOTIVOS = { falso: "Información falsa", ofensivo: "Contenido ofensivo", spam: "Spam o publicidad", suplantacion: "Suplantación de identidad", otro: "Otro motivo" };
  var CRITERIOS = [["trato", "Trato"], ["claridad", "Claridad"], ["puntualidad", "Puntualidad"]];

  /* ---------- Cliente de Supabase (comparte la sesión de "Comentarios") ---------- */
  var sb = window.TESIS_SB || null;
  if (!sb && C.supabaseUrl && C.supabaseKey && window.supabase && window.supabase.createClient) {
    try {
      sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {
        auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true, storageKey: "tesis-resenas" }
      });
    } catch (e) { sb = null; }
  }

  /* ---------- Utilidades de DOM ---------- */
  function el(tag, cls, txt, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    if (attrs) for (var k in attrs) if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    return e;
  }
  function add(padre) {
    for (var i = 1; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      padre.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return padre;
  }
  function icono(id, cls) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("class", "dir-ico" + (cls ? " " + cls : ""));
    var u = document.createElementNS("http://www.w3.org/2000/svg", "use");
    u.setAttribute("href", "#" + id);
    s.appendChild(u);
    return s;
  }
  function boton(txt, cls, fn, ico) {
    var b = el("button", cls || "dir-btn", null, { type: "button" });
    if (ico) b.appendChild(icono(ico));
    b.appendChild(document.createTextNode(txt));
    if (fn) b.addEventListener("click", fn);
    return b;
  }
  function botonDoble(largo, corto, cls, fn) {
    var b = el("button", cls, null, { type: "button" });
    add(b, el("span", "dir-t-l", largo), el("span", "dir-t-s", corto));
    b.addEventListener("click", fn);
    return b;
  }
  function enlace(txt, href, cls, ico, externo) {
    var a = el("a", cls || "dir-btn", null, { href: href });
    if (externo) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
    if (ico) a.appendChild(icono(ico));
    a.appendChild(document.createTextNode(txt));
    return a;
  }
  function vaciar(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function fecha(iso) {
    try { return new Date(iso).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; }
  }
  function corto(nombre) {
    var p = String(nombre || "Usuario").trim().split(/\s+/);
    return p.length > 1 ? p[0] + " " + p[p.length > 2 ? 1 : p.length - 1].charAt(0).toUpperCase() + "." : p[0];
  }
  function plural(n, uno, varios) { return n + " " + (n === 1 ? uno : varios); }
  function coma(n) { return Number(n).toFixed(1).replace(".", ","); }

  /* ---------- Iconos propios (se agregan una sola vez a la página) ---------- */
  (function () {
    if (document.getElementById("dir-sprite")) return;
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("id", "dir-sprite"); s.setAttribute("width", "0"); s.setAttribute("height", "0");
    s.setAttribute("style", "position:absolute"); s.setAttribute("aria-hidden", "true");
    var st = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
    s.innerHTML =
      '<symbol id="d-scale" viewBox="0 0 24 24"><g ' + st + '><path d="M12 3.5v17M7.5 20.5h9M4.5 7h15M4.5 7l-3 7a3.2 3.2 0 0 0 6 0ZM19.5 7l-3 7a3.2 3.2 0 0 0 6 0Z"/></g></symbol>' +
      '<symbol id="d-search" viewBox="0 0 24 24"><g ' + st + '><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></g></symbol>' +
      '<symbol id="d-pin" viewBox="0 0 24 24"><g ' + st + '><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/></g></symbol>' +
      '<symbol id="d-phone" viewBox="0 0 24 24"><g ' + st + '><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></g></symbol>' +
      '<symbol id="d-mail" viewBox="0 0 24 24"><g ' + st + '><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/></g></symbol>' +
      '<symbol id="d-share" viewBox="0 0 24 24"><g ' + st + '><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/></g></symbol>' +
      '<symbol id="d-check" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.6l2.3 1.6 2.8-.1 1 2.6 2.3 1.6-.9 2.7.9 2.7-2.3 1.6-1 2.6-2.8-.1L12 21.4l-2.3-1.6-2.8.1-1-2.6-2.3-1.6.9-2.7-.9-2.7 2.3-1.6 1-2.6 2.8.1Z"/><path d="m8.4 12.2 2.4 2.4 4.8-5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
      '<symbol id="d-flag" viewBox="0 0 24 24"><g ' + st + '><path d="M5 21V4M5 4.5h11l-2 4 2 4H5"/></g></symbol>' +
      '<symbol id="d-edit" viewBox="0 0 24 24"><g ' + st + '><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17Z"/></g></symbol>';
    document.body.appendChild(s);
  })();

  /* ---------- Estado ---------- */
  var est = { user: null, mi: null, resumen: null };
  var token = 0;

  /* ---------- Acceso a la base de datos ---------- */
  function rpc(nombre, args) {
    return sb.rpc(nombre, args || {}).then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  function mensajeError(e) {
    var m = (e && e.message) || "", c = e && e.code;
    if (c === "PGRST202" || c === "42P01" || /schema cache|Could not find|does not exist/i.test(m))
      return "El directorio se está activando. Vuelve a intentarlo en unos minutos.";
    if (c === "P0001") return m;
    if (c === "23505") {
      if (/matricula/i.test(m)) return "Ya existe un perfil registrado con esa matrícula. Si alguien usó tu matrícula, repórtalo como suplantación o escríbenos por WhatsApp.";
      if (/calificaciones/i.test(m)) return "Ya calificaste a este abogado. Puedes editar tu comentario.";
      if (/user_id/i.test(m)) return "Ya tienes un perfil registrado con esta cuenta.";
      return "Ese registro ya existe.";
    }
    if (c === "23514") {
      if (/celular/i.test(m)) return "El celular debe empezar con 09 y tener 10 dígitos.";
      if (/correo/i.test(m)) return "El correo no es válido.";
      if (/descripcion/i.test(m)) return "La descripción no puede tener enlaces y debe tener máximo 500 caracteres.";
      if (/comentario/i.test(m)) return "El comentario debe tener entre 10 y 1000 caracteres.";
      return "Revisa los datos del formulario: alguno no cumple el formato.";
    }
    if (c === "42501" || /JWT|permission denied|row-level security/i.test(m)) return "No tienes permiso para hacer esto o tu sesión venció. Ingresa de nuevo.";
    return "No se pudo completar la acción. Revisa tu conexión e inténtalo otra vez.";
  }

  /* ---------- Sesión ---------- */
  function cargarMi() {
    if (!sb || !est.user) { est.mi = null; return Promise.resolve(); }
    return sb.from("abogados").select("*").eq("user_id", est.user.id).maybeSingle()
      .then(function (r) { est.mi = r.error ? null : (r.data || null); });
  }
  function iniciarSesion() {
    if (!sb) return;
    try { sessionStorage.setItem("dir-volver", location.hash || "#directorio"); } catch (e) {}
    sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
  }
  function salir() {
    if (sb) sb.auth.signOut();
  }
  function pintarCuenta() {
    vaciar(zonaCuenta);
    if (!sb) return;
    if (!est.user) {
      zonaCuenta.appendChild(botonDoble("Ingresar con Google", "Ingresar", "dir-btn dir-btn-line", iniciarSesion));
      return;
    }
    if (est.mi) zonaCuenta.appendChild(boton("Mi perfil", "dir-btn dir-btn-line", function () { ir("#directorio/abogado/" + est.mi.id); }));
    else zonaCuenta.appendChild(botonDoble("Registrarme como abogado", "Registrarme", "dir-btn dir-btn-red", function () { ir("#directorio/registro"); }));
    zonaCuenta.appendChild(boton("Salir", "dir-link", salir));
  }
  function aplicarSesion(s) {
    var anterior = est.user && est.user.id;
    est.user = s && s.user ? s.user : null;
    var nuevo = est.user && est.user.id;
    if (anterior === nuevo && est.user) return Promise.resolve(false);
    est.mi = null;
    return cargarMi().then(function () { pintarCuenta(); return true; });
  }

  /* ---------- Rutas (todo vive en el hash: #directorio/...) ---------- */
  function ir(hash) {
    if (location.hash === hash) render(); else location.hash = hash;
  }
  function parsear() {
    var h = location.hash.replace(/^#/, ""), i = h.indexOf("?");
    var ruta = i < 0 ? h : h.slice(0, i);
    var qs;
    try { qs = new URLSearchParams(i < 0 ? "" : h.slice(i + 1)); } catch (e) { qs = new URLSearchParams(""); }
    return { p: ruta.split("/"), qs: qs };
  }
  function hashBusqueda(v) {
    var q = new URLSearchParams();
    ["q", "p", "c", "e", "o"].forEach(function (k) { if (v[k]) q.set(k, v[k]); });
    if (v.v) q.set("v", "1");
    var s = q.toString();
    return "#directorio/buscar" + (s ? "?" + s : "");
  }

  function abrir() {
    if (dlg.open) return;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    document.documentElement.classList.add("dir-abierto");
  }
  function cerrar() { if (dlg.open) dlg.close(); }
  dlg.addEventListener("close", function () {
    document.documentElement.classList.remove("dir-abierto");
    if (/^#directorio/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) cerrar(); });
  document.getElementById("dir-cerrar").addEventListener("click", cerrar);
  document.getElementById("dir-inicio").addEventListener("click", function () { ir("#directorio"); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-dir-abrir]"), function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      var m = document.getElementById("menu"); if (m && m.open) m.close();
      if (/^#directorio/.test(location.hash)) { abrir(); render(); } else location.hash = "#directorio";
    });
  });
  function sincronizar() {
    if (/^#directorio/.test(location.hash)) { abrir(); render(); }
    else if (dlg.open) { dlg.close(); }
  }
  window.addEventListener("hashchange", sincronizar);

  /* ---------- Piezas visuales ---------- */
  var COLORES = ["#0F1E3A", "#1B2F57", "#7A5A1E", "#2E5B4A", "#5A2E4F", "#2F4F6F"];
  function iniciales(n) {
    var p = String(n || "?").replace(/\b(abg|ab|dr|dra|lic|msc|phd)\.?\b/ig, "").trim().split(/\s+/);
    return ((p[0] || "?").charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : "")).toUpperCase();
  }
  function avatar(a, tam) {
    var cont = el("span", "dir-av dir-av-" + (tam || "m"));
    var suma = 0, s = String(a.nombres || a.nombre || "");
    for (var i = 0; i < s.length; i++) suma += s.charCodeAt(i);
    cont.style.background = COLORES[suma % COLORES.length];
    cont.textContent = iniciales(a.nombres || a.nombre);
    if (a.avatar_url && /^https:\/\//.test(a.avatar_url)) {
      var im = el("img"); im.alt = ""; im.referrerPolicy = "no-referrer"; im.loading = "lazy";
      im.addEventListener("load", function () { cont.textContent = ""; cont.appendChild(im); });
      im.src = a.avatar_url;
    }
    return cont;
  }
  function estrellas(n, grande) {
    var c = el("span", "dir-stars" + (grande ? " dir-stars-l" : ""), null, { "aria-hidden": "true" });
    var r = Math.round(Number(n) || 0);
    for (var i = 1; i <= 5; i++) c.appendChild(icono("i-star", i <= r ? "" : "off"));
    return c;
  }
  function calificacion(prom, total) {
    var c = el("span", "dir-rate");
    var lbl = total ? coma(prom) + " de 5, " + plural(total, "opinión", "opiniones") : "Sin opiniones todavía";
    c.setAttribute("aria-label", lbl);
    if (total) add(c, estrellas(prom), el("b", null, coma(prom)), el("small", null, "(" + total + ")"));
    else add(c, el("small", null, "Sin opiniones todavía"));
    return c;
  }
  function insignia(a) {
    var s = el("span", "dir-badge" + (a.verificado ? " ok" : ""));
    if (a.verificado) { s.appendChild(icono("d-check")); s.appendChild(document.createTextNode("Matrícula verificada")); }
    else s.appendChild(document.createTextNode("Registrado"));
    return s;
  }
  function chips(lista) {
    var u = el("ul", "dir-chips");
    (lista || []).forEach(function (t) { u.appendChild(el("li", null, t)); });
    return u;
  }
  function aviso(txt, tipo) { return el("p", "dir-aviso" + (tipo ? " " + tipo : ""), txt, { role: tipo === "bad" ? "alert" : "status" }); }
  function cargando(txt) { return el("p", "dir-cargando", txt || "Cargando…", { role: "status" }); }
  function volver(txt, hash) {
    var b = boton("← " + txt, "dir-link dir-volver", function () { if (hash) ir(hash); else history.length > 1 ? history.back() : ir("#directorio"); });
    return b;
  }
  function limpiarCuerpo() { vaciar(cuerpo); cuerpo.scrollTop = 0; }
  function falla(e, reintento) {
    var d = el("div", "dir-vacio");
    add(d, el("h3", null, "No pudimos cargar esta sección"), el("p", null, mensajeError(e)));
    if (reintento) d.appendChild(boton("Reintentar", "dir-btn dir-btn-line", reintento));
    return d;
  }
  function linkWA(num, txt) { return "https://wa.me/" + num + "?text=" + encodeURIComponent(txt); }
  function waAbogado(a, txt) { return linkWA("593" + String(a.celular).slice(1), txt || ("Hola " + a.nombres + ", te encontré en el Directorio de Abogados Ecuador y necesito una consulta.")); }
  function urlPerfil(id) { return location.origin + location.pathname + "#directorio/abogado/" + id; }

  /* ---------- Formulario de búsqueda ---------- */
  function opciones(sel, lista, vacio, actual) {
    sel.appendChild(el("option", null, vacio, { value: "" }));
    lista.forEach(function (t) { var o = el("option", null, t, { value: t }); if (t === actual) o.selected = true; sel.appendChild(o); });
  }
  function formBusqueda(v, completo) {
    var f = el("form", "dir-busca", null, { role: "search", novalidate: "novalidate" });
    var fila = el("div", "dir-busca-fila");
    var q = el("input", "dir-in", null, { type: "search", name: "q", maxlength: "120", placeholder: "Nombre, matrícula, especialidad o ciudad", "aria-label": "Buscar abogado", autocomplete: "off" });
    q.value = v.q || "";
    var cajaQ = el("label", "dir-in-ico"); cajaQ.appendChild(icono("d-search")); cajaQ.appendChild(q);
    var bus = boton("Buscar", "dir-btn dir-btn-red"); bus.type = "submit";
    add(fila, cajaQ, bus);
    f.appendChild(fila);

    var filtros = el("div", "dir-filtros");
    var sp = el("select", "dir-in", null, { name: "p", "aria-label": "Provincia" }); opciones(sp, PROVINCIAS, "Todas las provincias", v.p);
    var sc = el("select", "dir-in", null, { name: "c", "aria-label": "Cantón" });
    function pintarCantones() {
      vaciar(sc);
      opciones(sc, sp.value ? D.provincias[sp.value] : [], sp.value ? "Todos los cantones" : "Elige provincia", sp.value === v.p ? v.c : "");
      sc.disabled = !sp.value;
    }
    sp.addEventListener("change", pintarCantones);
    var se = el("select", "dir-in", null, { name: "e", "aria-label": "Especialidad" }); opciones(se, ESPECIALIDADES, "Todas las especialidades", v.e);
    add(filtros, sp, sc, se);
    pintarCantones();
    var so, cv;
    if (completo) {
      so = el("select", "dir-in", null, { name: "o", "aria-label": "Ordenar por" });
      [["relevancia", "Más relevantes"], ["calificacion", "Mejor calificados"], ["nombre", "Nombre (A-Z)"], ["recientes", "Recién registrados"]].forEach(function (o) {
        var op = el("option", null, o[1], { value: o[0] }); if ((v.o || "relevancia") === o[0]) op.selected = true; so.appendChild(op);
      });
      cv = el("label", "dir-check");
      var ck = el("input", null, null, { type: "checkbox", name: "v" }); ck.checked = !!v.v;
      add(cv, ck, el("span", null, "Solo con matrícula verificada"));
      add(filtros, so, cv);
    }
    f.appendChild(filtros);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = { q: q.value.trim(), p: sp.value, c: sc.value, e: se.value, o: so ? so.value : "", v: cv ? cv.querySelector("input").checked : false };
      if (d.o === "relevancia") d.o = "";
      ir(hashBusqueda(d));
    });
    if (!completo) {
      sp.addEventListener("change", function () { /* en inicio se busca con el botón */ });
    }
    return f;
  }

  /* ---------- Vista: inicio ---------- */
  function vistaInicio(t) {
    var hero = el("section", "dir-hero");
    add(hero,
      el("p", "dir-kicker", "Directorio nacional"),
      el("h2", null, "Encuentra a tu abogado en las 24 provincias del Ecuador"),
      el("p", "dir-sub", "Abogados con matrícula, ordenados por provincia y especialidad, con calificaciones y comentarios de sus clientes."),
      formBusqueda({}, false));
    cuerpo.appendChild(hero);

    var stats = el("ul", "dir-stats"); stats.hidden = true;
    cuerpo.appendChild(stats);

    var sec = el("section", "dir-sec");
    add(sec, el("h3", null, "Buscar por provincia"));
    var grid = el("ul", "dir-prov");
    var cuentas = {};
    PROVINCIAS.forEach(function (p) {
      var li = el("li"), b = el("a", "dir-prov-b", null, { href: hashBusqueda({ p: p }) });
      var n = el("small", null, "");
      add(b, el("b", null, p), n); cuentas[p] = n; li.appendChild(b); grid.appendChild(li);
    });
    sec.appendChild(grid);
    cuerpo.appendChild(sec);

    var cta = el("section", "dir-cta");
    var txt = el("div");
    add(txt, el("h3", null, "¿Eres abogado? Aparece en el directorio, gratis"),
      el("p", null, "Registra tu matrícula, tu especialidad y tus datos de contacto para que tus futuros clientes te encuentren por provincia."));
    cta.appendChild(txt);
    cta.appendChild(boton("Registrar mi perfil", "dir-btn dir-btn-white", function () { if (est.user) ir("#directorio/registro"); else { try { sessionStorage.setItem("dir-volver", "#directorio/registro"); } catch (e) {} iniciarSesion(); } }));
    cuerpo.appendChild(cta);

    cuerpo.appendChild(pie());

    if (!sb) { sec.insertBefore(aviso("El directorio no está disponible en este momento.", "bad"), grid); return; }
    rpc("dir_resumen").then(function (r) {
      if (t !== token) return;
      est.resumen = r;
      var pr = r.provincias || {};
      PROVINCIAS.forEach(function (p) { var n = pr[p] || 0; cuentas[p].textContent = n ? plural(n, "abogado", "abogados") : "Sin registros"; });
      vaciar(stats);
      [[r.abogados, "abogados registrados"], [r.verificados, "con matrícula verificada"], [r.calificaciones, "calificaciones"]].forEach(function (x) {
        var li = el("li"); add(li, el("b", null, String(x[0] || 0)), el("span", null, x[1])); stats.appendChild(li);
      });
      stats.hidden = false;
    }).catch(function (e) { if (t === token) sec.insertBefore(aviso(mensajeError(e), "bad"), grid); });
  }

  function pie() {
    var p = el("p", "dir-pie");
    p.textContent = "El Directorio de Abogados Ecuador es una guía informativa de Tesis. No presta asesoría legal ni garantiza resultados; los datos y las opiniones son responsabilidad de quienes los publican. La insignia “Matrícula verificada” indica que se comprobó la matrícula del abogado.";
    return p;
  }

  /* ---------- Vista: resultados ---------- */
  function tarjeta(a) {
    var li = el("li", "dir-card");
    li.appendChild(avatar(a, "m"));
    var info = el("div", "dir-card-info");
    var cab = el("div", "dir-card-cab");
    cab.appendChild(el("a", "dir-card-nombre", a.nombres, { href: "#directorio/abogado/" + a.id }));
    cab.appendChild(insignia(a));
    info.appendChild(cab);
    var ub = el("p", "dir-ubic"); ub.appendChild(icono("d-pin"));
    ub.appendChild(document.createTextNode(a.canton + ", " + a.provincia));
    info.appendChild(ub);
    info.appendChild(chips(a.especialidades));
    info.appendChild(calificacion(a.promedio, a.total_calificaciones));
    li.appendChild(info);
    var ac = el("div", "dir-card-ac");
    ac.appendChild(enlace("Ver perfil", "#directorio/abogado/" + a.id, "dir-btn dir-btn-line"));
    ac.appendChild(enlace("WhatsApp", waAbogado(a), "dir-btn dir-btn-wa", "i-wa", true));
    li.appendChild(ac);
    return li;
  }

  function vistaBuscar(qs, t) {
    var v = { q: qs.get("q") || "", p: qs.get("p") || "", c: qs.get("c") || "", e: qs.get("e") || "", o: qs.get("o") || "", v: qs.get("v") === "1" };
    if (v.p && PROVINCIAS.indexOf(v.p) < 0) v.p = "";
    if (v.e && ESPECIALIDADES.indexOf(v.e) < 0) v.e = "";
    if (v.p && v.c && D.provincias[v.p].indexOf(v.c) < 0) v.c = "";
    if (!v.p) v.c = "";
    if (["relevancia", "calificacion", "nombre", "recientes"].indexOf(v.o) < 0) v.o = "";

    var cab = el("section", "dir-resultados-cab");
    cab.appendChild(volver("Inicio del directorio", "#directorio"));
    cab.appendChild(formBusqueda(v, true));
    cuerpo.appendChild(cab);

    var titulo = el("h2", "dir-h2", v.p ? "Abogados en " + (v.c ? v.c + ", " : "") + v.p : "Resultados de la búsqueda");
    titulo.tabIndex = -1;
    var cuenta = el("p", "dir-cuenta", "", { role: "status" });
    var lista = el("ul", "dir-lista");
    var mas = el("div", "dir-mas");
    var zona = el("section", "dir-resultados");
    add(zona, titulo, cuenta, lista, mas);
    cuerpo.appendChild(zona);
    cuerpo.appendChild(pie());

    if (!sb) { cuenta.textContent = "El directorio no está disponible en este momento."; return; }
    var cargados = 0;
    function cargar() {
      vaciar(mas);
      mas.appendChild(cargando("Buscando…"));
      rpc("dir_buscar", { p_q: v.q, p_provincia: v.p || null, p_canton: v.c || null, p_especialidad: v.e || null, p_verificados: v.v, p_orden: v.o || "relevancia", p_limite: PAGINA, p_desde: cargados })
        .then(function (r) {
          if (t !== token) return;
          vaciar(mas);
          (r.items || []).forEach(function (a) { lista.appendChild(tarjeta(a)); });
          cargados += (r.items || []).length;
          cuenta.textContent = r.total ? plural(r.total, "abogado encontrado", "abogados encontrados") : "";
          if (cargados < r.total) mas.appendChild(boton("Mostrar más abogados", "dir-btn dir-btn-line", cargar));
          if (!r.total) {
            var vacio = el("div", "dir-vacio");
            add(vacio, el("h3", null, "Aún no hay abogados con esos criterios"),
              el("p", null, "Prueba con otra especialidad o provincia, o sé el primero en registrarte."),
              boton("Registrar mi perfil", "dir-btn dir-btn-red", function () { if (est.user) ir("#directorio/registro"); else { try { sessionStorage.setItem("dir-volver", "#directorio/registro"); } catch (e) {} iniciarSesion(); } }));
            mas.appendChild(vacio);
          }
        }).catch(function (e) { if (t === token) { vaciar(mas); mas.appendChild(falla(e, cargar)); } });
    }
    cargar();
  }

  /* ---------- Selector de estrellas ---------- */
  function selectorEstrellas(inicial, pequeno, etiqueta) {
    var val = inicial || 0, botones = [];
    var cont = el("div", "dir-pick" + (pequeno ? " sm" : ""), null, { role: "radiogroup", "aria-label": etiqueta });
    function pintar() {
      botones.forEach(function (b, i) {
        b.classList.toggle("on", i < val);
        b.setAttribute("aria-checked", String(i + 1 === val));
      });
    }
    for (var i = 1; i <= 5; i++) (function (n) {
      var b = el("button", "dir-pick-b", null, { type: "button", role: "radio", "aria-label": n + (n === 1 ? " estrella" : " estrellas") });
      b.appendChild(icono("i-star"));
      b.addEventListener("click", function () { val = (pequeno && val === n) ? 0 : n; pintar(); });
      botones.push(b); cont.appendChild(b);
    })(i);
    pintar();
    return { nodo: cont, valor: function () { return val; } };
  }

  /* ---------- Reportes ---------- */
  function abrirReporte(tipo, objetivo, ancla) {
    if (!est.user) { iniciarSesion(); return; }
    if (ancla.nextSibling && ancla.nextSibling.classList && ancla.nextSibling.classList.contains("dir-reporte")) { ancla.nextSibling.remove(); return; }
    var f = el("form", "dir-reporte");
    var sel = el("select", "dir-in", null, { "aria-label": "Motivo del reporte" });
    Object.keys(MOTIVOS).forEach(function (k) { sel.appendChild(el("option", null, MOTIVOS[k], { value: k })); });
    var det = el("input", "dir-in", null, { type: "text", maxlength: "300", placeholder: "Detalle (opcional)", "aria-label": "Detalle del reporte" });
    var msg = el("p", "dir-aviso", "", { role: "status" }); msg.hidden = true;
    var enviar = boton("Enviar reporte", "dir-btn dir-btn-line"); enviar.type = "submit";
    var cancelar = boton("Cancelar", "dir-link", function () { f.remove(); });
    add(f, sel, det, enviar, cancelar, msg);
    f.addEventListener("submit", function (e) {
      e.preventDefault(); enviar.disabled = true;
      sb.from("dir_reportes").insert({ user_id: est.user.id, tipo: tipo, objetivo: objetivo, motivo: sel.value, detalle: det.value.trim() || null })
        .then(function (r) {
          msg.hidden = false;
          if (r.error && r.error.code === "23505") { msg.className = "dir-aviso"; msg.textContent = "Ya enviaste un reporte sobre esto. Gracias."; }
          else if (r.error) { msg.className = "dir-aviso bad"; msg.textContent = mensajeError(r.error); enviar.disabled = false; }
          else { msg.className = "dir-aviso ok"; msg.textContent = "Gracias. Revisaremos tu reporte."; }
        });
    });
    ancla.parentNode.insertBefore(f, ancla.nextSibling);
    sel.focus();
  }

  /* ---------- Vista: perfil ---------- */
  function dato(etq, valor, ico) {
    var d = el("div", "dir-dato");
    var e = el("dt"); if (ico) e.appendChild(icono(ico)); e.appendChild(document.createTextNode(etq));
    add(d, e, el("dd", null, valor));
    return d;
  }
  function vistaPerfil(id, t) {
    cuerpo.appendChild(cargando("Cargando perfil…"));
    if (!sb || !UUID.test(id)) { limpiarCuerpo(); cuerpo.appendChild(noEncontrado()); return; }
    Promise.all([
      sb.from("abogados").select("*").eq("id", id).maybeSingle(),
      sb.from("calificaciones_abogados").select("*").eq("abogado_id", id).order("creado_en", { ascending: false }).limit(100)
    ]).then(function (res) {
      if (t !== token) return;
      if (res[0].error) throw res[0].error;
      limpiarCuerpo();
      var a = res[0].data;
      if (!a) { cuerpo.appendChild(noEncontrado()); return; }
      pintarPerfil(a, (res[1].data || []));
    }).catch(function (e) { if (t === token) { limpiarCuerpo(); cuerpo.appendChild(volver("Volver", "#directorio")); cuerpo.appendChild(falla(e, render)); } });
  }
  function noEncontrado() {
    var d = el("div", "dir-vacio");
    add(d, el("h3", null, "No encontramos este perfil"), el("p", null, "Puede que haya sido eliminado o que el enlace esté incompleto."),
      boton("Ir al directorio", "dir-btn dir-btn-red", function () { ir("#directorio"); }));
    return d;
  }

  function pintarPerfil(a, califs) {
    var esMio = !!(est.user && a.user_id === est.user.id);
    var publicadas = califs.filter(function (c) { return c.estado === "publicada"; });
    var miCal = est.user ? califs.filter(function (c) { return c.user_id === est.user.id; })[0] : null;

    cuerpo.appendChild(volver("Volver", null));

    if (esMio) {
      var banda = el("div", "dir-mio");
      var tx = el("p", null, a.estado === "oculto" ? "Este es tu perfil y está oculto: nadie más lo ve." : "Este es tu perfil. Así lo ven los demás.");
      banda.appendChild(tx);
      var acc = el("div", "dir-mio-ac");
      acc.appendChild(boton("Editar", "dir-btn dir-btn-line", function () { ir("#directorio/registro"); }, "d-edit"));
      acc.appendChild(boton(a.estado === "oculto" ? "Volver a mostrar" : "Ocultar mi perfil", "dir-btn dir-btn-line", function () {
        rpc("dir_ocultar_perfil", { p_ocultar: a.estado !== "oculto" }).then(function () { return cargarMi(); }).then(render).catch(function (e) { tx.textContent = mensajeError(e); });
      }));
      banda.appendChild(acc);
      cuerpo.appendChild(banda);
    }

    var cab = el("section", "dir-perfil-cab");
    cab.appendChild(avatar(a, "l"));
    var tit = el("div", "dir-perfil-tit");
    var h = el("h2", null, a.nombres); h.tabIndex = -1;
    add(tit, h, insignia(a), el("p", "dir-mat", "Matrícula: " + a.matricula), calificacion(a.promedio, a.total_calificaciones));
    cab.appendChild(tit);
    cuerpo.appendChild(cab);

    var contacto = el("div", "dir-contacto");
    contacto.appendChild(enlace("Escribir por WhatsApp", waAbogado(a), "dir-btn dir-btn-wa", "i-wa", true));
    contacto.appendChild(enlace("Llamar al " + a.celular, "tel:" + a.celular, "dir-btn dir-btn-line", "d-phone"));
    if (a.correo && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.correo)) contacto.appendChild(enlace("Correo", "mailto:" + a.correo, "dir-btn dir-btn-line", "d-mail"));
    var comp = boton("Copiar enlace", "dir-btn dir-btn-line", function () {
      var url = urlPerfil(a.id);
      var listo = function () { comp.lastChild.textContent = "¡Enlace copiado!"; setTimeout(function () { comp.lastChild.textContent = "Copiar enlace"; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(listo, function () {});
    }, "d-share");
    contacto.appendChild(comp);
    cuerpo.appendChild(contacto);

    var datos = el("dl", "dir-datos");
    add(datos,
      dato("Ubicación", a.canton + ", " + a.provincia, "d-pin"),
      dato("Dirección", a.direccion),
      dato("Modalidad", { presencial: "Presencial", virtual: "Virtual", ambas: "Presencial y virtual" }[a.modalidad] || ""),
      a.horario ? dato("Horario", a.horario) : null,
      a.universidad ? dato("Universidad", a.universidad) : null,
      a.anios_experiencia != null ? dato("Experiencia", plural(a.anios_experiencia, "año", "años")) : null,
      (a.provincias_atencion && a.provincias_atencion.length) ? dato("También atiende en", a.provincias_atencion.length >= 24 ? "Todo el país" : a.provincias_atencion.join(", ")) : null);
    var mapa = enlace("Ver en Google Maps", "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(a.direccion + ", " + a.canton + ", " + a.provincia + ", Ecuador"), "dir-link", "d-pin", true);
    var sec1 = el("section", "dir-sec");
    add(sec1, el("h3", null, "Especialidades"), chips(a.especialidades));
    if (a.descripcion) add(sec1, el("p", "dir-desc", a.descripcion));
    add(sec1, datos, mapa);
    cuerpo.appendChild(sec1);

    if (esMio && !a.verificado) {
      var ver = el("div", "dir-aviso");
      ver.textContent = "Tu perfil aún no tiene la insignia de matrícula verificada. ";
      ver.appendChild(enlace("Solicitar verificación por WhatsApp", linkWA(WA, "Hola, soy " + a.nombres + ". Quiero verificar mi perfil en el Directorio de Abogados Ecuador. Matrícula: " + a.matricula + ". Perfil: " + urlPerfil(a.id)), "dir-link", null, true));
      cuerpo.appendChild(ver);
    }

    cuerpo.appendChild(seccionOpiniones(a, publicadas, miCal, esMio, califs));

    if (!esMio) {
      var rep = el("div", "dir-rep-perfil");
      var bRep = boton("Reportar este perfil", "dir-link", function () { abrirReporte("abogado", a.id, rep.firstChild); }, "d-flag");
      rep.appendChild(bRep);
      cuerpo.appendChild(rep);
    }
    cuerpo.appendChild(pie());
    cuerpo.scrollTop = 0;
  }

  function seccionOpiniones(a, publicadas, miCal, esMio, todas) {
    var sec = el("section", "dir-sec dir-ops", null, { id: "dir-opiniones" });
    sec.appendChild(el("h3", null, "Calificaciones y comentarios"));

    var n = publicadas.length, suma = 0, cuenta = [0, 0, 0, 0, 0, 0];
    publicadas.forEach(function (c) { suma += c.estrellas; cuenta[c.estrellas]++; });
    var resumen = el("div", "dir-resumen");
    var prom = el("div", "dir-prom");
    add(prom, el("b", null, n ? coma(suma / n) : "–"), estrellas(n ? suma / n : 0, true), el("small", null, n ? plural(n, "opinión", "opiniones") : "Aún no hay opiniones"));
    resumen.appendChild(prom);
    var barras = el("ul", "dir-barras");
    for (var k = 5; k >= 1; k--) {
      var li = el("li"), i = el("i"), b = el("b");
      b.style.width = (n ? Math.round(cuenta[k] / n * 100) : 0) + "%"; i.appendChild(b);
      add(li, el("span", null, k + "★"), i, el("span", null, String(cuenta[k])));
      barras.appendChild(li);
    }
    resumen.appendChild(barras);
    if (n) {
      var crit = el("ul", "dir-crit");
      CRITERIOS.forEach(function (cr) {
        var vs = publicadas.map(function (c) { return c[cr[0]]; }).filter(function (x) { return x; });
        if (vs.length) { var li2 = el("li"); add(li2, el("span", null, cr[1]), el("b", null, coma(vs.reduce(function (s, x) { return s + x; }, 0) / vs.length))); crit.appendChild(li2); }
      });
      if (crit.children.length) resumen.appendChild(crit);
    }
    sec.appendChild(resumen);

    /* formulario */
    var cajaForm = el("div", "dir-calif-form");
    if (esMio) cajaForm.appendChild(aviso("No puedes calificar tu propio perfil."));
    else if (!est.user) {
      add(cajaForm, el("p", null, "Ingresa con tu cuenta de Google para calificar a este abogado y dejar tu comentario."),
        boton("Ingresar con Google", "dir-btn dir-btn-line", iniciarSesion));
    } else cajaForm.appendChild(formCalificar(a, miCal));
    sec.appendChild(cajaForm);

    /* lista */
    var lista = el("ul", "dir-ops-lista");
    var visibles = todas.filter(function (c) { return c.estado === "publicada" || (est.user && c.user_id === est.user.id); });
    visibles.forEach(function (c) { lista.appendChild(itemOpinion(a, c, esMio)); });
    sec.appendChild(lista);
    return sec;
  }

  function formCalificar(a, mi) {
    var f = el("form", "dir-calif", null, { novalidate: "novalidate" });
    f.appendChild(el("h4", null, mi ? "Tu calificación" : "Califica a este abogado"));
    var ge = el("div", "dir-calif-gen");
    ge.appendChild(el("span", null, "Calificación general"));
    var general = selectorEstrellas(mi ? mi.estrellas : 0, false, "Calificación general");
    ge.appendChild(general.nodo); f.appendChild(ge);
    var cr = el("div", "dir-calif-crit"), picks = {};
    CRITERIOS.forEach(function (c) {
      var d = el("div"); d.appendChild(el("span", null, c[1] + " (opcional)"));
      picks[c[0]] = selectorEstrellas(mi ? mi[c[0]] : 0, true, c[1]);
      d.appendChild(picks[c[0]].nodo); cr.appendChild(d);
    });
    f.appendChild(cr);
    var ta = el("textarea", "dir-in", null, { rows: "4", maxlength: "1000", placeholder: "Cuenta tu experiencia (mínimo 10 caracteres)", "aria-label": "Tu comentario" });
    ta.value = mi ? mi.comentario : "";
    f.appendChild(ta);
    f.appendChild(el("p", "dir-legal", "Escribe con respeto y sobre hechos que viviste. No se permiten insultos, enlaces ni teléfonos. Tu nombre se muestra abreviado."));
    var msg = el("p", "dir-aviso", "", { role: "status" }); msg.hidden = true;
    var fila = el("div", "dir-calif-ac");
    var enviar = boton(mi ? "Guardar cambios" : "Publicar calificación", "dir-btn dir-btn-red"); enviar.type = "submit";
    fila.appendChild(enviar);
    if (mi) {
      var borrar = boton("Eliminar mi calificación", "dir-link", function () {
        if (!borrar.dataset.seguro) { borrar.dataset.seguro = "1"; borrar.textContent = "¿Seguro? Pulsa de nuevo"; return; }
        sb.from("calificaciones_abogados").delete().eq("id", mi.id).then(function (r) {
          if (r.error) { msg.hidden = false; msg.className = "dir-aviso bad"; msg.textContent = mensajeError(r.error); } else render();
        });
      });
      fila.appendChild(borrar);
    }
    f.appendChild(fila); f.appendChild(msg);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var txt = ta.value.trim();
      var err = !general.valor() ? "Elige de 1 a 5 estrellas." : (txt.length < 10 ? "Escribe un comentario de al menos 10 caracteres." : "");
      msg.hidden = false;
      if (err) { msg.className = "dir-aviso bad"; msg.textContent = err; return; }
      enviar.disabled = true; msg.className = "dir-aviso"; msg.textContent = "Guardando…";
      var datos = { estrellas: general.valor(), trato: picks.trato.valor() || null, claridad: picks.claridad.valor() || null, puntualidad: picks.puntualidad.valor() || null, comentario: txt };
      var p = mi ? sb.from("calificaciones_abogados").update(datos).eq("id", mi.id)
                 : sb.from("calificaciones_abogados").insert(Object.assign({ abogado_id: a.id, user_id: est.user.id }, datos));
      p.then(function (r) {
        if (r.error) { enviar.disabled = false; msg.className = "dir-aviso bad"; msg.textContent = mensajeError(r.error); }
        else render();
      });
    });
    return f;
  }

  function itemOpinion(a, c, esMio) {
    var li = el("li", "dir-op");
    var cab = el("div", "dir-op-cab");
    cab.appendChild(avatar({ nombre: c.nombre, avatar_url: c.avatar_url }, "s"));
    var q = el("div");
    add(q, el("b", null, corto(c.nombre)), el("small", null, fecha(c.creado_en) + (c.actualizado_en && c.actualizado_en.slice(0, 16) !== c.creado_en.slice(0, 16) ? " · editado" : "")));
    cab.appendChild(q);
    cab.appendChild(estrellas(c.estrellas));
    li.appendChild(cab);
    if (c.estado !== "publicada") li.appendChild(aviso("Este comentario está en revisión y solo tú lo ves."));
    var cr = el("ul", "dir-chips dir-chips-s");
    CRITERIOS.forEach(function (x) { if (c[x[0]]) cr.appendChild(el("li", null, x[1] + " " + c[x[0]] + "/5")); });
    if (cr.children.length) li.appendChild(cr);
    li.appendChild(el("p", "dir-op-txt", c.comentario));
    if (c.respuesta) {
      var r = el("div", "dir-resp");
      add(r, el("b", null, "Respuesta del abogado"), el("small", null, c.respondido_en ? fecha(c.respondido_en) : ""), el("p", null, c.respuesta));
      li.appendChild(r);
    }
    var ac = el("div", "dir-op-ac");
    if (esMio && c.estado === "publicada") {
      ac.appendChild(boton(c.respuesta ? "Editar mi respuesta" : "Responder", "dir-link", function () { formRespuesta(li, c); }));
    }
    if (est.user && c.user_id !== est.user.id && !esMio) {
      var br = boton("Reportar", "dir-link", function () { abrirReporte("calificacion", c.id, br); }, "d-flag");
      ac.appendChild(br);
    }
    if (ac.children.length) li.appendChild(ac);
    return li;
  }
  function formRespuesta(li, c) {
    if (li.querySelector(".dir-resp-form")) return;
    var f = el("form", "dir-resp-form");
    var ta = el("textarea", "dir-in", null, { rows: "3", maxlength: "800", placeholder: "Responde con respeto y sin datos personales del cliente", "aria-label": "Tu respuesta" });
    ta.value = c.respuesta || "";
    var msg = el("p", "dir-aviso", "", { role: "status" }); msg.hidden = true;
    var ok = boton("Publicar respuesta", "dir-btn dir-btn-line"); ok.type = "submit";
    add(f, ta, ok, boton("Cancelar", "dir-link", function () { f.remove(); }), msg);
    f.addEventListener("submit", function (e) {
      e.preventDefault(); ok.disabled = true;
      rpc("dir_responder", { p_id: c.id, p_texto: ta.value }).then(render).catch(function (er) { ok.disabled = false; msg.hidden = false; msg.className = "dir-aviso bad"; msg.textContent = mensajeError(er); });
    });
    li.appendChild(f); ta.focus();
  }

  /* ---------- Vista: registro / edición de perfil ---------- */
  function campo(etq, control, ayuda, cls) {
    var d = el("div", "dir-campo" + (cls ? " " + cls : ""));
    var l = el("label"); l.appendChild(document.createTextNode(etq));
    if (control.id) l.setAttribute("for", control.id);
    d.appendChild(l); d.appendChild(control);
    if (ayuda) d.appendChild(el("small", null, ayuda));
    return d;
  }
  function normalizarCelular(s) {
    var d = String(s || "").replace(/\D/g, "");
    if (d.indexOf("593") === 0) d = "0" + d.slice(3);
    if (d.length === 9 && d.charAt(0) === "9") d = "0" + d;
    return d;
  }
  function vistaRegistro(t) {
    cuerpo.appendChild(volver("Volver", "#directorio"));
    if (!sb) { cuerpo.appendChild(aviso("El directorio no está disponible en este momento.", "bad")); return; }
    if (!est.user) {
      var d = el("div", "dir-vacio");
      add(d, el("h3", null, "Ingresa para registrar tu perfil"),
        el("p", null, "Usamos tu cuenta de Google para que cada abogado tenga un solo perfil y nadie pueda editar el tuyo."),
        boton("Ingresar con Google", "dir-btn dir-btn-red", iniciarSesion));
      cuerpo.appendChild(d); return;
    }
    var mi = est.mi, edita = !!mi;
    var meta = est.user.user_metadata || {};
    var f = el("form", "dir-form", null, { novalidate: "novalidate", autocomplete: "off" });
    var h = el("h2", null, edita ? "Editar mi perfil" : "Registrar mi perfil de abogado"); h.tabIndex = -1;
    add(f, h, el("p", "dir-sub", "Los datos que escribas aquí serán públicos en el directorio. Los campos con * son obligatorios."));

    var nombres = el("input", "dir-in", null, { id: "dr-nombres", type: "text", maxlength: "120", autocomplete: "name" }); nombres.value = mi ? mi.nombres : (meta.full_name || meta.name || "");
    var matricula = el("input", "dir-in", null, { id: "dr-mat", type: "text", maxlength: "30", placeholder: "Ej. 17-2015-123" }); matricula.value = mi ? mi.matricula : "";
    var celular = el("input", "dir-in", null, { id: "dr-cel", type: "tel", maxlength: "16", placeholder: "09XXXXXXXX", inputmode: "tel" }); celular.value = mi ? mi.celular : "";
    var prov = el("select", "dir-in", null, { id: "dr-prov" }); opciones(prov, PROVINCIAS, "Elige tu provincia", mi ? mi.provincia : "");
    var canton = el("select", "dir-in", null, { id: "dr-cant" });
    function pintarCantones(sel) { vaciar(canton); opciones(canton, prov.value ? D.provincias[prov.value] : [], prov.value ? "Elige tu cantón" : "Primero la provincia", sel || ""); canton.disabled = !prov.value; }
    pintarCantones(mi ? mi.canton : "");
    prov.addEventListener("change", function () { pintarCantones(""); });
    var dir = el("input", "dir-in", null, { id: "dr-dir", type: "text", maxlength: "200", placeholder: "Calle, número y referencia de tu oficina" }); dir.value = mi ? mi.direccion : "";
    add(f, el("div", "dir-grid2"));
    var g = f.lastChild;
    add(g, campo("Nombres y apellidos *", nombres), campo("Número de matrícula (Foro de Abogados) *", matricula, "Tal como aparece en tu carné. Se verifica en el Consejo de la Judicatura."),
      campo("Celular (WhatsApp) *", celular, "Se mostrará para que te contacten."), campo("Provincia *", prov), campo("Cantón *", canton), campo("Dirección de tu oficina *", dir, null, "dir-ancho"));

    var esp = el("fieldset", "dir-fs"); esp.appendChild(el("legend", null, "Especialidades * (elige hasta 5)"));
    var espGrid = el("div", "dir-checks");
    var espBox = [];
    ESPECIALIDADES.forEach(function (x, i) {
      var l = el("label", "dir-check"), c = el("input", null, null, { type: "checkbox", value: x });
      c.checked = !!(mi && mi.especialidades.indexOf(x) >= 0);
      c.addEventListener("change", function () {
        var n = espBox.filter(function (b) { return b.checked; }).length;
        if (n > 5) { c.checked = false; }
      });
      espBox.push(c); add(l, c, el("span", null, x)); espGrid.appendChild(l);
    });
    esp.appendChild(espGrid); f.appendChild(esp);

    var modalidad = el("select", "dir-in", null, { id: "dr-mod" });
    [["ambas", "Presencial y virtual"], ["presencial", "Solo presencial"], ["virtual", "Solo virtual"]].forEach(function (o) { var op = el("option", null, o[1], { value: o[0] }); if (mi && mi.modalidad === o[0]) op.selected = true; modalidad.appendChild(op); });
    var horario = el("input", "dir-in", null, { id: "dr-hor", type: "text", maxlength: "120", placeholder: "Ej. Lunes a viernes, 09h00 a 17h00" }); horario.value = mi && mi.horario || "";
    var univ = el("input", "dir-in", null, { id: "dr-uni", type: "text", maxlength: "100", placeholder: "Universidad donde te graduaste" }); univ.value = mi && mi.universidad || "";
    var anios = el("input", "dir-in", null, { id: "dr-anios", type: "number", min: "0", max: "70", inputmode: "numeric" }); anios.value = mi && mi.anios_experiencia != null ? mi.anios_experiencia : "";
    var correo = el("input", "dir-in", null, { id: "dr-mail", type: "email", maxlength: "120", autocomplete: "email" }); correo.value = mi && mi.correo || "";
    var desc = el("textarea", "dir-in", null, { id: "dr-desc", rows: "4", maxlength: "500", placeholder: "Cuéntale al cliente en qué casos puedes ayudarle (máximo 500 caracteres, sin enlaces)" }); desc.value = mi && mi.descripcion || "";
    var g2 = el("div", "dir-grid2");
    add(g2, campo("Modalidad de atención", modalidad), campo("Horario de atención", horario), campo("Universidad", univ), campo("Años de experiencia", anios),
      campo("Correo (opcional, será público)", correo), campo("Descripción de tu práctica", desc, null, "dir-ancho"));
    f.appendChild(g2);

    var at = el("details", "dir-fs dir-det");
    var res = el("summary", null, "También atiendo en otras provincias (opcional)");
    at.appendChild(res);
    var todo = el("label", "dir-check"); var todoC = el("input", null, null, { type: "checkbox" });
    add(todo, todoC, el("span", null, "Todo el país"));
    var atGrid = el("div", "dir-checks"), atBox = [];
    PROVINCIAS.forEach(function (p) { var l = el("label", "dir-check"), c = el("input", null, null, { type: "checkbox", value: p }); c.checked = !!(mi && mi.provincias_atencion.indexOf(p) >= 0); atBox.push(c); add(l, c, el("span", null, p)); atGrid.appendChild(l); });
    todoC.checked = atBox.every(function (c) { return c.checked; });
    todoC.addEventListener("change", function () { atBox.forEach(function (c) { c.checked = todoC.checked; }); });
    if (mi && mi.provincias_atencion.length) at.open = true;
    add(at, todo, atGrid); f.appendChild(at);

    var foto = el("label", "dir-check"), fotoC = el("input", null, null, { type: "checkbox" });
    var urlFoto = meta.avatar_url || meta.picture || "";
    fotoC.checked = mi ? !!mi.avatar_url : !!urlFoto;
    if (urlFoto) { add(foto, fotoC, el("span", null, "Mostrar mi foto de Google en el perfil")); f.appendChild(foto); }

    var acepto = el("label", "dir-check dir-acepto"), aceptoC = el("input", null, null, { type: "checkbox" });
    aceptoC.checked = edita;
    add(acepto, aceptoC, el("span", null, "Autorizo que mis nombres, matrícula, celular, dirección y demás datos de este formulario se publiquen en el Directorio de Abogados Ecuador. Puedo editar u ocultar mi perfil cuando quiera. *"));
    f.appendChild(acepto);

    var msg = el("p", "dir-aviso", "", { role: "alert" }); msg.hidden = true;
    var fila = el("div", "dir-calif-ac");
    var guardar = boton(edita ? "Guardar cambios" : "Publicar mi perfil", "dir-btn dir-btn-red"); guardar.type = "submit";
    fila.appendChild(guardar);
    if (edita) {
      var borrar = boton("Eliminar mi perfil", "dir-link", function () {
        if (!borrar.dataset.seguro) { borrar.dataset.seguro = "1"; borrar.textContent = "¿Seguro? Se borrará tu perfil y sus calificaciones. Pulsa de nuevo"; return; }
        sb.from("abogados").delete().eq("id", mi.id).then(function (r) {
          if (r.error) { msg.hidden = false; msg.className = "dir-aviso bad"; msg.textContent = mensajeError(r.error); }
          else { est.mi = null; pintarCuenta(); ir("#directorio"); }
        });
      });
      fila.appendChild(borrar);
    }
    add(f, msg, fila);

    function error(txt, campoEl) { msg.hidden = false; msg.className = "dir-aviso bad"; msg.textContent = txt; if (campoEl) campoEl.focus(); else msg.scrollIntoView({ block: "center" }); return false; }
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var cel = normalizarCelular(celular.value);
      var espSel = espBox.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      if (nombres.value.trim().length < 5) return error("Escribe tus nombres y apellidos completos.", nombres);
      if (matricula.value.trim().length < 3) return error("Escribe tu número de matrícula.", matricula);
      if (!/^09[0-9]{8}$/.test(cel)) return error("El celular debe empezar con 09 y tener 10 dígitos.", celular);
      if (!prov.value) return error("Elige tu provincia.", prov);
      if (!canton.value) return error("Elige tu cantón.", canton);
      if (dir.value.trim().length < 5) return error("Escribe la dirección de tu oficina.", dir);
      if (!espSel.length) return error("Elige al menos una especialidad.", esp.querySelector("input"));
      if (correo.value.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.value.trim())) return error("El correo no es válido.", correo);
      if (!aceptoC.checked) return error("Debes autorizar la publicación de tus datos.", aceptoC);
      var fila2 = {
        nombres: nombres.value.trim(), matricula: matricula.value.trim(), celular: cel, direccion: dir.value.trim(),
        provincia: prov.value, canton: canton.value, especialidades: espSel,
        provincias_atencion: atBox.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }),
        modalidad: modalidad.value, descripcion: desc.value.trim() || null, universidad: univ.value.trim() || null,
        anios_experiencia: anios.value === "" ? null : Math.max(0, Math.min(70, parseInt(anios.value, 10) || 0)),
        correo: correo.value.trim() || null, horario: horario.value.trim() || null,
        avatar_url: (fotoC.checked && /^https:\/\//.test(urlFoto)) ? urlFoto : null
      };
      guardar.disabled = true; msg.hidden = false; msg.className = "dir-aviso"; msg.textContent = "Guardando…";
      var p = edita ? sb.from("abogados").update(fila2).eq("id", mi.id).select("id").maybeSingle()
                    : sb.from("abogados").insert(Object.assign({ user_id: est.user.id, acepta_publicar: true }, fila2)).select("id").single();
      p.then(function (r) {
        if (r.error) { guardar.disabled = false; error(mensajeError(r.error)); return; }
        return cargarMi().then(function () { pintarCuenta(); ir("#directorio/abogado/" + (est.mi ? est.mi.id : "")); });
      });
    });
    cuerpo.appendChild(f);
  }

  /* ---------- Pintado principal ---------- */
  function render() {
    var r = parsear(), p = r.p, t = ++token;
    limpiarCuerpo();
    if (p[0] !== "directorio") return;
    if (p[1] === "abogado" && p[2]) vistaPerfil(p[2], t);
    else if (p[1] === "buscar") vistaBuscar(r.qs, t);
    else if (p[1] === "registro") vistaRegistro(t);
    else vistaInicio(t);
    var h = cuerpo.querySelector("h2");
    if (h && !(cuerpo.contains(document.activeElement) && document.activeElement !== cuerpo)) { try { h.tabIndex = -1; h.focus({ preventScroll: true }); } catch (e) {} }
  }

  /* ---------- Arranque ---------- */
  pintarCuenta();
  if (sb) {
    sb.auth.getSession().then(function (r) { return aplicarSesion(r.data && r.data.session); }).then(function (cambio) { if (cambio && dlg.open) render(); });
    sb.auth.onAuthStateChange(function (_ev, s) {
      aplicarSesion(s).then(function (cambio) { if (cambio && dlg.open) render(); });
    });
  }
  var volverA = null;
  try { volverA = sessionStorage.getItem("dir-volver"); sessionStorage.removeItem("dir-volver"); } catch (e) {}
  if (volverA && /^#directorio/.test(volverA) && !/^#directorio/.test(location.hash)) location.hash = volverA;
  else sincronizar();
})();
