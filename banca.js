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
  function limpiar(n) { while (n.firstChild) n.removeChild(n.firstChild); }


  /* ---------- Menú lateral ---------- */
  var TITULOS = { resumen: "Resumen", invertir: "Invertir", mis: "Mis inversiones", ganancias: "Ganancias", sim: "Simulador", prestamos: "Préstamos", resultados: "Resultados", publicidad: "Publicidad", perfil: "Mi perfil", admin: "Administración" };
  var subs = Array.prototype.slice.call(document.querySelectorAll("[data-sub]"));
  var raiz = document.documentElement;
  function menu(abierto) { raiz.classList.toggle("layout-menu-expanded", abierto); }
  function abrirSub(n) {
    if (!TITULOS[n] || (n === "admin" && !esAdmin)) n = "resumen";
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
        el("td", { cls: "num", text: valor })
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
    misPre.forEach(function (p) { ev.push({ f: p.creada_en, t: "Préstamo " + p.estado, v: Number(p.monto), c: "" }); });
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
      $("f-monto").value = ""; $("f-ref").value = ""; $("f-acepto").checked = false;
      cargarMis(); if (esAdmin) cargarAdmin();
    });
  });

  function cargarMis() {
    return sb.from("inv_inversiones").select("*").eq("user_id", sesion.user.id).order("creada_en", { ascending: false })
      .then(function (r) { mis = r.data || []; pintarMis(); });
  }

  /* ---------- Administración ---------- */
  var todas = [];
  function pintarAdmin() {
    var cap = 0, pend = 0, ids = {};
    todas.forEach(function (i) {
      if (i.estado === "confirmada") { cap += Number(i.monto); ids[i.user_id] = 1; }
      if (i.estado === "pendiente") pend++;
    });
    $("a-cap").textContent = usd(cap); $("a-pend").textContent = String(pend); $("a-inv").textContent = String(Object.keys(ids).length);
    var tb = $("a-tabla"); limpiar(tb);
    todas.forEach(function (i) {
      var acc = el("td", {});
      function boton(txt, estado, extra) {
        var b = el("button", { cls: "btn btn-sm btn-outline-primary", type: "button", text: txt, style: "margin:0 4px 4px 0" });
        b.addEventListener("click", function () { cambiar(i, estado, extra); });
        acc.appendChild(b);
      }
      if (i.estado === "pendiente") { boton("Confirmar pago", "confirmada"); boton("Rechazar", "rechazada"); }
      if (i.estado === "confirmada") boton("Liquidar", "liquidada");
      tb.appendChild(el("tr", {}, [
        el("td", {}, [el("b", { text: i.nombre }), el("br"), el("span", { cls: "muted", text: i.contacto })]),
        el("td", { cls: "num", text: usd(i.monto) }),
        el("td", { text: i.metodo + " · " + i.referencia }),
        el("td", { text: i.meses + " m" }),
        el("td", {}, [el("span", { cls: "pill " + i.estado, text: i.estado })]),
        acc
      ]));
    });
  }
  function cambiar(i, estado) {
    var cambios = { estado: estado };
    if (estado === "confirmada") cambios.confirmada_en = new Date().toISOString();
    if (estado === "liquidada") {
      var s = sumaUtilidad(Number(i.monto), i.confirmada_en || i.creada_en, null);
      var sugerido = Math.max(0, Number(i.monto) + s.valor).toFixed(2);
      var v = window.prompt("Monto a liquidar para " + i.nombre + " (USD). Sugerido con los resultados publicados:", sugerido);
      if (v === null) return;
      var num = parseFloat(v);
      if (isNaN(num) || num < 0) return aviso("a-msg", "err", "Monto de liquidación no válido.");
      cambios.monto_liquidado = Math.round(num * 100) / 100; cambios.liquidada_en = new Date().toISOString();
    }
    sb.from("inv_inversiones").update(cambios).eq("id", i.id).then(function (r) {
      if (r.error) return aviso("a-msg", "err", "No se pudo actualizar.");
      aviso("a-msg", "ok", "Actualizado.");
      cargarAdmin(); cargarMis();
    });
  }
  function cargarAdmin() {
    return sb.from("inv_inversiones").select("*").order("creada_en", { ascending: false }).then(function (r) {
      todas = r.data || []; pintarAdmin();
    });
  }
  $("f-res").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var mes = $("r-mes").value, p = parseFloat($("r-pct").value);
    if (!mes || isNaN(p)) return aviso("r-msg", "err", "Elige el mes y escribe el porcentaje.");
    sb.from("inv_resultados").upsert({ mes: mes + "-01", utilidad_pct: p, nota: $("r-nota").value.trim() }).then(function (r) {
      if (r.error) return aviso("r-msg", "err", "No se pudo publicar.");
      aviso("r-msg", "ok", "Resultado publicado.");
      cargarPublico();
    });
  });
  $("f-cfg").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var datos = { banco: $("g-banco").value.trim(), tipo_cuenta: $("g-tipo").value.trim(), numero_cuenta: $("g-num").value.trim(),
      titular: $("g-tit").value.trim(), identificacion: $("g-id").value.trim(), paypal: $("g-pp").value.trim() };
    sb.from("inv_config").update(datos).eq("id", 1).then(function (r) {
      if (r.error) return aviso("g-msg", "err", "No se pudo guardar.");
      aviso("g-msg", "ok", "Datos guardados."); cargarPublico();
    });
  });

  /* ---------- Préstamos ---------- */
  var tasa = 18, misPre = [], todasPre = [];
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

  function pintarPre() {
    $("rs-pre").textContent = String(misPre.length);
    pintarMov();
    $("l-mis-card").hidden = !misPre.length;
    var tb = $("l-mis"); limpiar(tb);
    misPre.forEach(function (p) {
      tb.appendChild(el("tr", {}, [
        el("td", { text: new Date(p.creada_en).toLocaleDateString("es-EC") }),
        el("td", { cls: "num", text: usd(p.monto) }), el("td", { cls: "num", text: usd(p.cuota) }),
        el("td", {}, [el("span", { cls: "pill " + (p.estado === "solicitada" ? "pendiente" : p.estado === "rechazada" ? "rechazada" : "confirmada"), text: p.estado })])
      ]));
    });
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
  $("f-pre").addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!sesion) return aviso("l-msg", "err", "Primero entra a la Banca virtual con tu cuenta.");
    var m = Math.round(parseFloat($("l-monto").value) * 100) / 100, n = parseInt($("l-plazo").value, 10);
    var d = { nombre: $("l-nombre").value.trim(), contacto: $("l-contacto").value.trim(), monto: m, plazo_meses: n,
      tasa_anual: tasa, cuota: Math.round(cuotaFrancesa(m, n, tasa) * 100) / 100, destino: $("l-destino").value.trim() };
    if (d.nombre.length < 3 || d.contacto.length < 5 || d.destino.length < 3) return aviso("l-msg", "err", "Completa nombre, contacto y destino del préstamo.");
    if (!(m >= 50 && m <= 5000) || !(n >= 1 && n <= 36)) return aviso("l-msg", "err", "El monto va de $50 a $5.000 y el plazo de 1 a 36 meses.");
    if (!$("l-acepto").checked) return aviso("l-msg", "err", "Debes aceptar las condiciones para enviar la solicitud.");
    var b = $("l-enviar"); b.disabled = true;
    sb.from("inv_prestamos").insert(d).then(function (r) {
      b.disabled = false;
      if (r.error) return aviso("l-msg", "err", "No se pudo enviar. Revisa los datos e inténtalo de nuevo.");
      aviso("l-msg", "ok", "Solicitud enviada. Te contactaremos para evaluarla; no implica aprobación.");
      avisarCorreo("Nueva solicitud de préstamo: " + d.nombre + " · " + usd(d.monto), {
        "Solicitante": d.nombre, "Usuario": usuarioDe(sesion.user.email), "Contacto": d.contacto,
        "WhatsApp / teléfono": (waLink(d.contacto) ? d.contacto : ($("p-tel").value || d.contacto)), "Abrir WhatsApp": waLink(d.contacto) || waLink($("p-tel").value) || "-", "Teléfono del perfil": $("p-tel").value || "-", "Ciudad": $("p-ciudad").value || "-",
        "Monto": usd(d.monto), "Plazo": d.plazo_meses + " meses", "Tasa anual": d.tasa_anual + "%",
        "Cuota mensual": usd(d.cuota), "Total a pagar": usd(d.cuota * d.plazo_meses), "Destino": d.destino,
        "Fecha": new Date().toLocaleString("es-EC", { timeZone: "America/Guayaquil" }),
        "Revisar": "https://emindao-maker.github.io/tesis/banca.html#admin"
      });
      $("l-acepto").checked = false; cargarPre(); if (esAdmin) cargarAdminPre();
    });
  });
  function cargarPre() {
    return sb.from("inv_prestamos").select("*").eq("user_id", sesion.user.id).order("creada_en", { ascending: false })
      .then(function (r) { misPre = r.data || []; pintarPre(); });
  }
  function pintarAdminPre() {
    var tb = $("a-pre"); limpiar(tb);
    todasPre.forEach(function (p) {
      var acc = el("td", {});
      function bt(txt, est) {
        var b = el("button", { cls: "btn btn-sm btn-outline-primary", type: "button", text: txt, style: "margin:0 4px 4px 0" });
        b.addEventListener("click", function () {
          sb.from("inv_prestamos").update({ estado: est }).eq("id", p.id).then(function (r) {
            if (r.error) return aviso("a-pre-msg", "err", "No se pudo actualizar.");
            aviso("a-pre-msg", "ok", "Actualizado."); cargarAdminPre(); cargarPre();
          });
        });
        acc.appendChild(b);
      }
      if (p.estado === "solicitada") { bt("Aprobar", "aprobada"); bt("Rechazar", "rechazada"); }
      if (p.estado === "aprobada") bt("Marcar desembolsado", "desembolsada");
      if (p.estado === "desembolsada") bt("Marcar pagado", "pagada");
      tb.appendChild(el("tr", {}, [
        el("td", {}, [el("b", { text: p.nombre }), el("br"), el("span", { cls: "muted", text: p.contacto }), el("br"), (waLink(p.contacto) ? el("a", { href: waLink(p.contacto), target: "_blank", rel: "noopener noreferrer", text: "Abrir WhatsApp" }) : el("span")), el("br"), el("span", { cls: "muted small", text: new Date(p.creada_en).toLocaleDateString("es-EC") })]),
        el("td", { cls: "num", text: usd(p.monto) }), el("td", { text: p.plazo_meses + " m · cuota " + usd(p.cuota) + " · " + p.tasa_anual + "% anual" }),
        el("td", { text: p.destino }), el("td", {}, [el("span", { cls: "pill " + (p.estado === "solicitada" ? "pendiente" : p.estado === "rechazada" ? "rechazada" : "confirmada"), text: p.estado })]), acc
      ]));
    });
  }
  function cargarAdminPre() {
    return sb.from("inv_prestamos").select("*").order("creada_en", { ascending: false }).then(function (r) { todasPre = r.data || []; pintarAdminPre(); });
  }
  $("g-tasa-b").addEventListener("click", function () {
    var t = parseFloat($("g-tasa").value);
    if (isNaN(t) || t < 0 || t > 100) return aviso("a-pre-msg", "err", "Escribe una tasa entre 0 y 100.");
    sb.from("inv_config").update({ tasa_prestamo_anual: t }).eq("id", 1).then(function (r) {
      if (r.error) return aviso("a-pre-msg", "err", "No se pudo guardar la tasa.");
      aviso("a-pre-msg", "ok", "Tasa guardada."); cargarPublico();
    });
  });


  /* ---------- Perfil ---------- */
  function cargarPerfil() {
    return sb.from("inv_perfiles").select("*").eq("user_id", sesion.user.id).maybeSingle().then(function (r) {
      var p = r.data || {};
      var nombre = p.nombre || (sesion.user.user_metadata && sesion.user.user_metadata.full_name) || "";
      $("p-nombre").value = nombre; $("p-tel").value = p.telefono || ""; $("p-ciudad").value = p.ciudad || "";
      $("saludo").textContent = "Hola" + (nombre ? ", " + nombre.split(" ")[0] : "") + ". Este es el estado de tu cuenta.";
      if (nombre) { $("f-nombre").value = nombre; $("l-nombre").value = nombre; }
      if (p.telefono) { $("f-contacto").value = p.telefono; $("l-contacto").value = p.telefono; }
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
      if (cfg && cfg.tasa_prestamo_anual != null) { tasa = Number(cfg.tasa_prestamo_anual); simPre(); }
      pintarResultados(); pintarBanco();
      if (cfg && esAdmin) {
        $("g-banco").value = cfg.banco; $("g-tipo").value = cfg.tipo_cuenta; $("g-num").value = cfg.numero_cuenta;
        $("g-tasa").value = cfg.tasa_prestamo_anual; $("g-tit").value = cfg.titular; $("g-id").value = cfg.identificacion; $("g-pp").value = cfg.paypal;
      }
      if (sesion) pintarMis();
    });
  }
  function irAIngreso() { location.replace("inversion.html#cuenta"); }
  function aplicarSesion(s) {
    if (!s) return irAIngreso();
    sesion = s; esAdmin = false;
    var usu = usuarioDe(s.user.email);
    $("quien").textContent = usu; $("avatar-ini").textContent = (usu.charAt(0) || "·").toUpperCase(); $("p-email").textContent = "Usuario: " + usu;
    if (!$("f-nombre").value && s.user.user_metadata) { $("f-nombre").value = s.user.user_metadata.full_name || ""; $("l-nombre").value = s.user.user_metadata.full_name || ""; }
    sb.from("inv_admins").select("user_id").eq("user_id", s.user.id).maybeSingle().then(function (r) {
      esAdmin = !!(r.data);
      $("n-admin").hidden = !esAdmin;
      return Promise.all([cargarPerfil(), cargarPublico(), cargarMis(), cargarPre(), esAdmin ? cargarAdmin() : null, esAdmin ? cargarAdminPre() : null]);
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
