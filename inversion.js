/* Capital Investment (Tesis): lógica de la página pública inversion.html (la banca virtual vive en banca.html)
   Usa el mismo proyecto de Supabase que "Trabajos realizados" y "Comentarios".
   Las reglas de seguridad (RLS) están en inversion.sql. */
(function () {
  "use strict";
  var C = window.TRABAJOS_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  // Acceso con usuario y contraseña: el sistema de cuentas exige un correo, así que cada usuario
  // se guarda como un alias del correo del administrador (sin enviar nada a nadie).
  var CORREO_BASE = "estalimm", CORREO_DOMINIO = "gmail.com";
  function correoDe(u) { return CORREO_BASE + "+ci." + u + "@" + CORREO_DOMINIO; }
  function usuarioDe(email) {
    var m = String(email || "").toLowerCase().match(new RegExp("^" + CORREO_BASE + "\\+ci\\.(.+)@" + CORREO_DOMINIO.replace(".", "\\.") + "$"));
    return m ? m[1] : (email || "");
  }
  var MESES_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

  function usd(n) { return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(n) { return (n >= 0 ? "+" : "") + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "%"; }
  function mesTexto(iso) { var d = new Date(iso + "T00:00:00"); return MESES_ES[d.getMonth()] + " " + d.getFullYear(); }
  function clase(n) { return n > 0 ? "pos" : n < 0 ? "neg" : ""; }
  function el(tag, props, kids) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === "text") e.textContent = props[k]; else if (k === "cls") e.className = props[k]; else e.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function aviso(id, tipo, texto) {
    var box = $(id); box.textContent = "";
    if (texto) box.appendChild(el("div", { cls: "msg " + tipo, text: texto }));
  }
  function limpiar(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  var sb = null, resultados = [];
  /* ---------- Pestañas ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-tab]"));
  function abrir(nombre) {
    tabs.forEach(function (b) {
      var on = b.getAttribute("data-tab") === nombre;
      b.setAttribute("aria-selected", on ? "true" : "false");
      $("p-" + b.getAttribute("data-tab")).hidden = !on;
    });
    if (location.hash !== "#" + nombre) history.replaceState(null, "", "#" + nombre);
  }
  tabs.forEach(function (b) { b.addEventListener("click", function () { abrir(b.getAttribute("data-tab")); }); });
  Array.prototype.slice.call(document.querySelectorAll("[data-go]")).forEach(function (b) {
    b.addEventListener("click", function () { abrir(b.getAttribute("data-go")); window.scrollTo({ top: 0, behavior: "smooth" }); });
  });

  /* ---------- Simulador ---------- */
  function simular() {
    var m = Math.min(10000, Math.max(0, parseFloat($("s-monto").value) || 0));
    var n = Math.min(24, Math.max(1, parseInt($("s-meses").value, 10) || 1));
    var p = parseFloat($("s-pct").value); if (isNaN(p)) p = 0;
    var u = m * (p / 100) * n;
    $("o-util").textContent = (u >= 0 ? "+" : "−") + usd(Math.abs(u)); $("o-util").className = clase(u);
    $("o-total").textContent = usd(Math.max(0, m + u));
    $("o-pct").textContent = pct(p * n); $("o-pct").className = clase(p);
    var tb = $("s-tabla"); limpiar(tb);
    [["Pérdida", -5], ["Sin utilidad", 0], ["Moderado", 3], ["Favorable", 8]].forEach(function (e) {
      var ut = m * (e[1] / 100) * n;
      tb.appendChild(el("tr", {}, [
        el("td", { text: e[0] }), el("td", { cls: "num", text: pct(e[1]) }),
        el("td", { cls: "num " + clase(ut), text: (ut >= 0 ? "+" : "−") + usd(Math.abs(ut)) }),
        el("td", { cls: "num", text: usd(Math.max(0, m + ut)) })
      ]));
    });
  }
  ["s-monto", "s-meses", "s-pct"].forEach(function (id) { $(id).addEventListener("input", simular); });
  simular();

  function pintarResultados() {
    var tb = $("res"); limpiar(tb);
    $("res-vacio").hidden = resultados.length > 0;
    var g = $("grafico"); limpiar(g); g.hidden = !resultados.length;
    var mx = 1; resultados.forEach(function (r) { mx = Math.max(mx, Math.abs(Number(r.utilidad_pct))); });
    resultados.slice(0, 12).reverse().forEach(function (r) {
      var v = Number(r.utilidad_pct), alto = Math.max(3, Math.abs(v) / mx * 120);
      g.appendChild(el("div", { cls: "bar" }, [el("u", { cls: clase(v), text: pct(v) }), el("i", { cls: v < 0 ? "n" : "", style: "height:" + alto + "px" }), el("em", { text: mesTexto(r.mes).slice(0, 3) + " " + r.mes.slice(2, 4) })]));
    });
    resultados.forEach(function (r) {
      tb.appendChild(el("tr", {}, [
        el("td", { text: mesTexto(r.mes) }),
        el("td", { cls: "num " + clase(Number(r.utilidad_pct)), text: pct(Number(r.utilidad_pct)) }),
        el("td", { text: r.nota || "" })
      ]));
    });
    if (resultados.length) {
      $("ultimo").textContent = pct(Number(resultados[0].utilidad_pct));
      $("ultimo-mes").textContent = "Resultado de " + mesTexto(resultados[0].mes);
    }
  }

  var tasa = 18;
  function cuotaFrancesa(m, n, t) {
    var i = t / 100 / 12;
    return i === 0 ? m / n : m * i / (1 - Math.pow(1 + i, -n));
  }
  function simPre() {
    var m = Math.min(5000, Math.max(50, parseFloat($("l-monto").value) || 50));
    var n = Math.min(36, Math.max(1, parseInt($("l-plazo").value, 10) || 1));
    var c = cuotaFrancesa(m, n, tasa);
    $("l-cuota").textContent = usd(c); $("l-total").textContent = usd(c * n); $("l-int").textContent = usd(c * n - m);
    $("l-tasa").textContent = String(tasa);
    var ta = $("l-amort"); limpiar(ta); var saldo = m, i = tasa / 100 / 12;
    for (var k = 1; k <= n; k++) {
      var int = saldo * i, cap = c - int; saldo = Math.max(0, saldo - cap);
      ta.appendChild(el("tr", {}, [el("td", { text: String(k) }), el("td", { cls: "num", text: usd(cap) }), el("td", { cls: "num", text: usd(int) }), el("td", { cls: "num", text: usd(saldo) })]));
    }
  }
  ["l-monto", "l-plazo"].forEach(function (id) { $(id).addEventListener("input", simPre); });
  simPre();

  function cargarPublico() {
    return Promise.all([
      sb.from("inv_resultados").select("*").order("mes", { ascending: false }),
      sb.from("inv_config").select("tasa_prestamo_anual").eq("id", 1).maybeSingle()
    ]).then(function (r) {
      resultados = r[0].data || [];
      var c = r[1].data;
      if (c && c.tasa_prestamo_anual != null) { tasa = Number(c.tasa_prestamo_anual); simPre(); }
      pintarResultados();
    });
  }
  function irABanca() { location.replace("banca.html"); }

  function iniciar() {
    if (!(C.supabaseUrl && C.supabaseKey && window.supabase && window.supabase.createClient)) {
      $("c-login").hidden = false;
      aviso("c-login-msg", "err", "El servicio de cuentas no está disponible ahora. Escríbenos por WhatsApp.");
      $("c-google").disabled = true; return;
    }
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, detectSessionInUrl: true } });
    var modo = "crear";
    function ponerModo(m) {
      modo = m;
      $("m-crear").className = m === "crear" ? "on" : ""; $("m-entrar").className = m === "entrar" ? "on" : "";
      $("g-nombre-w").hidden = m !== "crear"; $("a-user-ayuda").hidden = m !== "crear"; $("a-olvide").hidden = m !== "entrar";
      $("a-enviar").textContent = m === "crear" ? "Crear mi cuenta" : "Ingresar";
      $("a-pass").setAttribute("autocomplete", m === "crear" ? "new-password" : "current-password");
      aviso("c-login-msg", "ok", "");
    }
    $("m-crear").addEventListener("click", function () { ponerModo("crear"); });
    $("m-entrar").addEventListener("click", function () { ponerModo("entrar"); });
    $("f-auth").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var u = $("a-user").value.trim().toLowerCase(), pw = $("a-pass").value, nombre = $("a-nombre").value.trim();
      if (!/^[a-z0-9._-]{3,20}$/.test(u)) return aviso("c-login-msg", "err", "El usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo.");
      if (pw.length < 8) return aviso("c-login-msg", "err", "La contraseña debe tener al menos 8 caracteres.");
      var b = $("a-enviar"); b.disabled = true;
      var p;
      if (modo === "crear") {
        if (nombre.length < 3) { b.disabled = false; return aviso("c-login-msg", "err", "Escribe tu nombre completo."); }
        p = sb.auth.signUp({ email: correoDe(u), password: pw, options: { data: { full_name: nombre, usuario: u } } });
      } else {
        p = sb.auth.signInWithPassword({ email: correoDe(u), password: pw });
      }
      p.then(function (r) {
        b.disabled = false;
        if (r.error) {
          var t = /already|registered/i.test(r.error.message) ? "Ese usuario ya existe. Elige otro o ingresa con tu contraseña."
            : /invalid login|credentials/i.test(r.error.message) ? "Usuario o contraseña incorrectos."
            : /confirm/i.test(r.error.message) ? "Tu cuenta aún no está activada. Escríbenos por WhatsApp."
            : "No se pudo completar. Revisa los datos e inténtalo de nuevo.";
          return aviso("c-login-msg", "err", t);
        }
        if (r.data && r.data.session) { aviso("c-login-msg", "ok", "Listo. Abriendo tu banca virtual…"); irABanca(); }
        else aviso("c-login-msg", "info", "Cuenta creada. Si el sistema pide activarla, escríbenos por WhatsApp para habilitarla; luego ingresa con tu usuario.");
      });
    });
    ponerModo("crear");
    $("c-google").addEventListener("click", function () {
      var base = location.origin + location.pathname.replace(/[^\/]*$/, "");
      sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: base + "banca.html" } });
    });
    sb.auth.getSession().then(function (r) {
      if (r.data.session) { $("ir-banca").hidden = false; if (location.hash === "#cuenta") irABanca(); }
      $("c-login").hidden = !!r.data.session;
      if (r.data.session) $("c-sesion").hidden = false;
    });
    cargarPublico();
  }

  var inicial = (location.hash || "").replace("#", "");
  abrir(["info", "sim", "cuenta", "prestamos", "resultados", "publicidad"].indexOf(inicial) > -1 ? inicial : "info");
  iniciar();
})();
