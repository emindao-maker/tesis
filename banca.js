/* Capital Investment (Tesis): lógica de la banca virtual (banca.html)
   Usa el mismo proyecto de Supabase que "Trabajos realizados" y "Comentarios".
   Las reglas de seguridad (RLS) están en inversion.sql. */
(function () {
  "use strict";
  var C = window.TRABAJOS_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var sb = null, sesion = null, esAdmin = false, cfg = null, resultados = [], mis = [];
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
  function waLink(txt) {
    var d = String(txt || "").replace(/\D/g, "");
    if (d.length < 9) return "";
    if (d.charAt(0) === "0") d = "593" + d.slice(1);
    return "https://wa.me/" + d;
  }
  /* Aviso por correo al administrador (FormSubmit). Si falla, la solicitud igual queda guardada en el panel. */
  function avisarCorreo(asunto, campos) {
    try {
      var cuerpo = Object.assign({ _subject: asunto, _template: "table", _captcha: "false" }, campos);
      fetch("https://formsubmit.co/ajax/" + CORREO_BASE + "@" + CORREO_DOMINIO, {
        method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(cuerpo)
      }).catch(function () {});
    } catch (x) {}
  }
  function limpiar(n) { while (n.firstChild) n.removeChild(n.firstChild); }


  /* ---------- Menú lateral ---------- */
  var TITULOS = { resumen: "Resumen", invertir: "Invertir", mis: "Mis inversiones", ganancias: "Ganancias", sim: "Simulador", prestamos: "Préstamos", resultados: "Resultados", publicidad: "Publicidad", perfil: "Mi perfil" };
  var subs = Array.prototype.slice.call(document.querySelectorAll("[data-sub]"));
  var raiz = document.documentElement;
  function menu(abierto) { raiz.classList.toggle("layout-menu-expanded", abierto); }
  function abrirSub(n) {
    if (!TITULOS[n]) n = "resumen";
    subs.forEach(function (b) {
      if (!b.classList.contains("menu-link")) return;
      var on = b.getAttribute("data-sub") === n;
      b.parentNode.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    Object.keys(TITULOS).forEach(function (k) { var p = $("sp-" + k); if (p) p.hidden = (k !== n); });
    $("titulo").textContent = TITULOS[n];
    document.title = TITULOS[n] + " · Capital Investment";
    if (location.hash !== "#" + n) history.replaceState(null, "", "#" + n);
    menu(false); window.scrollTo(0, 0);
  }
  subs.forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); abrirSub(b.getAttribute("data-sub")); }); });
  Array.prototype.slice.call(document.querySelectorAll("[data-ir]")).forEach(function (b) {
    b.addEventListener("click", function () { abrirSub(b.getAttribute("data-ir")); });
  });
  Array.prototype.slice.call(document.querySelectorAll(".layout-menu-toggle")).forEach(function (t) {
    t.addEventListener("click", function (e) { e.preventDefault(); menu(!raiz.classList.contains("layout-menu-expanded")); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") menu(false); });
  if (window.Helpers && Helpers.scrollToActive) { try { Helpers.scrollToActive(false); } catch (x) {} }

  /* ---------- Cálculo ---------- */
  function sumaUtilidad(monto, desdeIso, hastaIso) {
    // Suma simple de los porcentajes mensuales publicados entre dos fechas (mes de inicio incluido).
    var ini = desdeIso.slice(0, 7), fin = hastaIso ? hastaIso.slice(0, 7) : "9999-99";
    var total = 0;
    resultados.forEach(function (r) {
      var m = r.mes.slice(0, 7);
      if (m >= ini && m <= fin) total += Number(r.utilidad_pct);
    });
    return { pct: total, valor: monto * total / 100 };
  }

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

  /* ---------- Plazo y fecha de liquidación ---------- */
  (function () {
    var s = $("f-meses");
    for (var i = 1; i <= 24; i++) s.appendChild(el("option", { value: i, text: i === 1 ? "1 mes (mínimo)" : i + " meses" }));
    function f() {
      var d = new Date(); d.setMonth(d.getMonth() + parseInt(s.value, 10));
      $("f-fecha").textContent = "Liquidación estimada: " + d.getDate() + " de " + MESES_ES[d.getMonth()] + " de " + d.getFullYear() + ", contando desde la confirmación de tu pago.";
    }
    s.addEventListener("change", f); f();
  })();

  /* ---------- Datos públicos ---------- */
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
  }
  function pintarBanco() {
    var dl = $("banco"); limpiar(dl);
    if (!cfg) return;
    [["Banco", cfg.banco], ["Tipo", cfg.tipo_cuenta], ["Cuenta", cfg.numero_cuenta], ["Titular", cfg.titular],
     ["Cédula/RUC", cfg.identificacion], ["PayPal", cfg.paypal]].forEach(function (p) {
      if (!p[1]) return;
      dl.appendChild(el("dt", { text: p[0] })); dl.appendChild(el("dd", { text: p[1] }));
    });
    $("banco-aviso").textContent = cfg.aviso || "";
  }

  /* ---------- Mis inversiones ---------- */
  function pintarMis() {
    var tb = $("mis"); limpiar(tb);
    $("mis-vacio").hidden = mis.length > 0;
    var vigente = 0, rInv = 0, rUtil = 0;
    mis.forEach(function (i) {
      if (i.estado === "pendiente" || i.estado === "confirmada") vigente += Number(i.monto);
      var util = "–", valor = "–", ucls = "";
      if (i.estado === "confirmada") {
        var s = sumaUtilidad(Number(i.monto), i.confirmada_en || i.creada_en, null);
        util = (s.valor >= 0 ? "+" : "−") + usd(Math.abs(s.valor)); ucls = clase(s.valor);
        valor = usd(Math.max(0, Number(i.monto) + s.valor)); rInv += Number(i.monto); rUtil += s.valor;
      } else if (i.estado === "liquidada") {
        valor = usd(i.monto_liquidado); util = usd(Number(i.monto_liquidado) - Number(i.monto));
      }
      tb.appendChild(el("tr", {}, [
        el("td", { text: new Date(i.creada_en).toLocaleDateString("es-EC") }),
        el("td", { cls: "num", text: usd(i.monto) }),
        el("td", { text: i.meses + (i.meses === 1 ? " mes" : " meses") + (i.renovar ? " · renueva" : "") }),
        el("td", {}, [el("span", { cls: "pill " + i.estado, text: i.estado })]),
        el("td", { cls: "num " + ucls, text: util }),
        el("td", { cls: "num", text: valor }),
        el("td", {}, (i.estado === "confirmada" || i.estado === "liquidada")
          ? [el("a", { cls: "btn btn-sm btn-primary", href: "certificado.html?id=" + i.id, target: "_blank", rel: "noopener", text: "Ver certificado" })]
          : [el("span", { cls: "muted small", text: i.estado === "pendiente" ? "Se emite al confirmar tu pago" : "–" })])
      ]));
    });
    $("cupo").textContent = usd(Math.max(0, 10000 - vigente));
    pintarMov(); pintarGan();
    var vig = Math.min(10000, vigente); $("cupo-b").style.width = (vig / 100) + "%";
    $("rs-inv").textContent = usd(rInv); $("rs-util").textContent = (rUtil >= 0 ? "+" : "−") + usd(Math.abs(rUtil)); $("rs-val").textContent = usd(Math.max(0, rInv + rUtil));
  }

  /* ---------- Movimientos y ganancias de la banca ---------- */
  function pintarMov() {
    var ev = [];
    mis.forEach(function (i) {
      ev.push({ f: i.creada_en, t: "Inversión registrada (" + i.metodo + ")", v: Number(i.monto), c: "" });
      if (i.confirmada_en) ev.push({ f: i.confirmada_en, t: "Pago confirmado", v: Number(i.monto), c: "pos" });
      if (i.liquidada_en) ev.push({ f: i.liquidada_en, t: "Liquidación recibida", v: Number(i.monto_liquidado), c: "pos" });
      if (i.estado === "rechazada") ev.push({ f: i.creada_en, t: "Inversión rechazada", v: 0, c: "neg" });
    });
    ev.sort(function (a, b) { return a.f < b.f ? 1 : -1; });
    var tb = $("mov"); limpiar(tb);
    $("mov-vacio").hidden = ev.length > 0;
    ev.slice(0, 10).forEach(function (e) {
      tb.appendChild(el("tr", {}, [
        el("td", { text: new Date(e.f).toLocaleDateString("es-EC") }), el("td", { text: e.t }),
        el("td", { cls: "num " + e.c, text: e.v ? usd(e.v) : "–" })
      ]));
    });
  }
  function pintarGan() {
    var tb = $("gan"); limpiar(tb);
    var filas = [], acum = 0;
    resultados.slice().sort(function (a, b) { return a.mes < b.mes ? -1 : 1; }).forEach(function (r) {
      var m = r.mes.slice(0, 7), cap = 0;
      mis.forEach(function (i) {
        if (!(i.estado === "confirmada" || i.estado === "liquidada") || !i.confirmada_en) return;
        if (i.confirmada_en.slice(0, 7) > m) return;
        if (i.liquidada_en && i.liquidada_en.slice(0, 7) < m) return;
        cap += Number(i.monto);
      });
      if (cap > 0) { var g = cap * Number(r.utilidad_pct) / 100; acum += g; filas.push({ m: r.mes, cap: cap, p: Number(r.utilidad_pct), g: g, a: acum }); }
    });
    $("gan-vacio").hidden = filas.length > 0;
    filas.reverse().forEach(function (f) {
      tb.appendChild(el("tr", {}, [
        el("td", { text: mesTexto(f.m) }), el("td", { cls: "num", text: usd(f.cap) }),
        el("td", { cls: "num " + clase(f.p), text: pct(f.p) }),
        el("td", { cls: "num " + clase(f.g), text: (f.g >= 0 ? "+" : "−") + usd(Math.abs(f.g)) }),
        el("td", { cls: "num " + clase(f.a), text: (f.a >= 0 ? "+" : "−") + usd(Math.abs(f.a)) })
      ]));
    });
  }

  /* ---------- Registrar inversión ---------- */
  $("f-inv").addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!sesion) return;
    var monto = Math.round(parseFloat($("f-monto").value) * 100) / 100;
    var datos = {
      nombre: $("f-nombre").value.trim(), contacto: $("f-contacto").value.trim(), monto: monto,
      meses: parseInt($("f-meses").value, 10), renovar: $("f-renovar").checked,
      metodo: $("f-metodo").value, referencia: $("f-ref").value.trim(), acepta_riesgos: $("f-acepto").checked
    };
    if (datos.nombre.length < 3 || datos.contacto.length < 5) return aviso("f-msg", "err", "Completa tu nombre y un contacto válido.");
    if (!(monto >= 10 && monto <= 10000)) return aviso("f-msg", "err", "El monto debe estar entre $10 y $10.000.");
    if (datos.referencia.length < 3) return aviso("f-msg", "err", "Escribe el número de comprobante o la referencia del pago.");
    if (!datos.acepta_riesgos) return aviso("f-msg", "err", "Debes aceptar las condiciones y los riesgos para continuar.");
    var b = $("f-enviar"); b.disabled = true;
    sb.from("inv_inversiones").insert(datos).then(function (r) {
      b.disabled = false;
      if (r.error) {
        var t = /10000/.test(r.error.message) ? "Con este monto superas el tope de $10.000 por inversionista." : "No se pudo registrar. Revisa los datos e inténtalo de nuevo.";
        return aviso("f-msg", "err", t);
      }
      aviso("f-msg", "ok", "Inversión registrada. Queda pendiente hasta que confirmemos tu pago; te contactaremos para firmar el contrato.");
      avisarCorreo("Nueva inversión por confirmar: " + datos.nombre + " · " + usd(datos.monto), {
        "Inversionista": datos.nombre, "Usuario": usuarioDe(sesion.user.email), "Contacto": datos.contacto,
        "WhatsApp / teléfono": (waLink(datos.contacto) ? datos.contacto : ($("p-tel").value || datos.contacto)),
        "Abrir WhatsApp": waLink(datos.contacto) || waLink($("p-tel").value) || "-", "Ciudad": $("p-ciudad").value || "-",
        "Monto": usd(datos.monto), "Plazo": datos.meses + " meses", "Renovar": datos.renovar ? "Sí" : "No",
        "Forma de pago": datos.metodo, "Comprobante / referencia": datos.referencia,
        "Fecha": new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil" }),
        "Revisar y confirmar": "https://emindao-maker.github.io/tesis/admin.html#inversiones"
      });
      $("f-monto").value = ""; $("f-ref").value = ""; $("f-acepto").checked = false;
      cargarMis();
    });
  });

  function cargarMis() {
    return sb.from("inv_inversiones").select("*").eq("user_id", sesion.user.id).order("creada_en", { ascending: false })
      .then(function (r) { mis = r.data || []; pintarMis(); });
  }

  /* ---------- Perfil ---------- */
  function cargarPerfil() {
    return sb.from("inv_perfiles").select("*").eq("user_id", sesion.user.id).maybeSingle().then(function (r) {
      var p = r.data || {};
      var nombre = p.nombre || (sesion.user.user_metadata && sesion.user.user_metadata.full_name) || "";
      $("p-nombre").value = nombre; $("p-tel").value = p.telefono || ""; $("p-ciudad").value = p.ciudad || "";
      $("saludo").textContent = "Hola" + (nombre ? ", " + nombre.split(" ")[0] : "") + ". Este es el estado de tu cuenta.";
      if (nombre) { $("f-nombre").value = nombre; }
      if (p.telefono) { $("f-contacto").value = p.telefono; }
    });
  }
  $("f-perfil").addEventListener("submit", function (ev) {
    ev.preventDefault(); if (!sesion) return;
    var d = { user_id: sesion.user.id, nombre: $("p-nombre").value.trim(), telefono: $("p-tel").value.trim(), ciudad: $("p-ciudad").value.trim(), actualizado_en: new Date().toISOString() };
    sb.from("inv_perfiles").upsert(d).then(function (r) {
      if (r.error) return aviso("p-msg", "err", "No se pudo guardar tu perfil.");
      aviso("p-msg", "ok", "Perfil guardado."); cargarPerfil();
    });
  });
  $("p-imprimir").addEventListener("click", function () { window.print(); });
  $("salir").addEventListener("click", function (e) { e.preventDefault(); cerrar(); });
  $("salir2").addEventListener("click", function (e) { e.preventDefault(); cerrar(); });
  $("p-salir").addEventListener("click", cerrar);
  function cerrar() { sb.auth.signOut().then(function () { location.replace("inversion.html#cuenta"); }); }

  /* ---------- Carga y sesión ---------- */
  function cargarPublico() {
    return Promise.all([
      sb.from("inv_resultados").select("*").order("mes", { ascending: false }),
      sb.from("inv_config").select("*").eq("id", 1).maybeSingle()
    ]).then(function (r) {
      resultados = (r[0].data || []); cfg = r[1].data || null;
            pintarResultados(); pintarBanco();
      if (sesion) pintarMis();
    });
  }
  function irAIngreso() { location.replace("inversion.html#cuenta"); }
  function aplicarSesion(s) {
    if (!s) return irAIngreso();
    sesion = s; esAdmin = false;
    var usu = usuarioDe(s.user.email);
    $("quien").textContent = usu; $("avatar-ini").textContent = (usu.charAt(0) || "·").toUpperCase(); $("p-email").textContent = "Usuario: " + usu;
    if (!$("f-nombre").value && s.user.user_metadata) { $("f-nombre").value = s.user.user_metadata.full_name || ""; }
    sb.from("inv_admins").select("user_id").eq("user_id", s.user.id).maybeSingle().then(function (r) {
      esAdmin = !!(r.data);
      if (esAdmin && !/vista=usuario/.test(location.search)) { location.replace("admin.html"); return new Promise(function () {}); }
      return Promise.all([cargarPerfil(), cargarPublico(), cargarMis()]);
    }).then(function () {
      $("c-cargando").hidden = true; $("c-app").hidden = false;
      var h = (location.hash || "").replace("#", "");
      abrirSub(TITULOS[h] ? h : "resumen");
    }, function () {
      $("c-cargando").textContent = "No se pudo cargar tu banca virtual. Recarga la página.";
    });
  }

  function iniciar() {
    if (!(C.supabaseUrl && C.supabaseKey && window.supabase && window.supabase.createClient)) {
      $("c-cargando").textContent = "El servicio de cuentas no está disponible ahora. Escríbenos por WhatsApp al 098 556 8519.";
      return;
    }
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, detectSessionInUrl: true } });
    sb.auth.getSession().then(function (r) { aplicarSesion(r.data.session); });
    sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT") irAIngreso(); });
  }
  iniciar();
})();
