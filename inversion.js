/* Capital Investment (Tesis): lógica de la página inversion.html
   Usa el mismo proyecto de Supabase que "Trabajos realizados" y "Comentarios".
   Las reglas de seguridad (RLS) están en inversion.sql. */
(function () {
  "use strict";
  var C = window.TRABAJOS_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var sb = null, sesion = null, esAdmin = false, cfg = null, resultados = [], mis = [];
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
    if (resultados.length) {
      $("ultimo").textContent = pct(Number(resultados[0].utilidad_pct));
      $("ultimo-mes").textContent = "Resultado de " + mesTexto(resultados[0].mes);
    }
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
    $("rs-inv").textContent = usd(rInv); $("rs-util").textContent = (rUtil >= 0 ? "+" : "−") + usd(Math.abs(rUtil)); $("rs-val").textContent = usd(Math.max(0, rInv + rUtil));
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
      cargarMis();
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
        var b = el("button", { cls: "btn small sec", type: "button", text: txt, style: "margin:0 4px 4px 0" });
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
      cargarAdmin();
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
  $("f-pre").addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!sesion) return aviso("l-msg", "err", "Primero ingresa en la pestaña Mi cuenta.");
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
      $("l-acepto").checked = false; cargarPre();
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
        var b = el("button", { cls: "btn small sec", type: "button", text: txt, style: "margin:0 4px 4px 0" });
        b.addEventListener("click", function () {
          sb.from("inv_prestamos").update({ estado: est }).eq("id", p.id).then(function (r) {
            if (r.error) return aviso("a-pre-msg", "err", "No se pudo actualizar.");
            aviso("a-pre-msg", "ok", "Actualizado."); cargarAdminPre();
          });
        });
        acc.appendChild(b);
      }
      if (p.estado === "solicitada") { bt("Aprobar", "aprobada"); bt("Rechazar", "rechazada"); }
      if (p.estado === "aprobada") bt("Marcar desembolsado", "desembolsada");
      if (p.estado === "desembolsada") bt("Marcar pagado", "pagada");
      tb.appendChild(el("tr", {}, [
        el("td", {}, [el("b", { text: p.nombre }), el("br"), el("span", { cls: "muted", text: p.contacto })]),
        el("td", { cls: "num", text: usd(p.monto) }), el("td", { text: p.plazo_meses + " m · cuota " + usd(p.cuota) }),
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
  function aplicarSesion(s) {
    sesion = s; esAdmin = false;
    $("c-login").hidden = !!s; $("c-app").hidden = !s; $("l-login").hidden = !!s; $("l-form").hidden = !s;
    $("salir").hidden = !s; $("quien").hidden = !s;
    $("t-admin").hidden = true;
    if (!s) { misPre = []; return; }
    $("quien").textContent = s.user.email || "";
    if (!$("f-contacto").value) $("f-contacto").value = s.user.email || ""; if (!$("l-contacto").value) $("l-contacto").value = s.user.email || "";
    if (!$("f-nombre").value && s.user.user_metadata) { $("f-nombre").value = s.user.user_metadata.full_name || ""; $("l-nombre").value = s.user.user_metadata.full_name || ""; }
    sb.from("inv_admins").select("user_id").eq("user_id", s.user.id).maybeSingle().then(function (r) {
      esAdmin = !!(r.data);
      $("t-admin").hidden = !esAdmin;
      return Promise.all([cargarPublico(), cargarMis(), cargarPre(), esAdmin ? cargarAdmin() : null, esAdmin ? cargarAdminPre() : null]);
    });
  }

  function iniciar() {
    if (!(C.supabaseUrl && C.supabaseKey && window.supabase && window.supabase.createClient)) {
      $("c-login").hidden = false;
      aviso("c-login-msg", "err", "El servicio de cuentas no está disponible ahora. Escríbenos por WhatsApp.");
      $("c-google").disabled = true; return;
    }
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, detectSessionInUrl: true } });
    $("c-google").addEventListener("click", function () {
      sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname + "#cuenta" } });
    });
    $("salir").addEventListener("click", function () { sb.auth.signOut(); });
    sb.auth.onAuthStateChange(function (_e, s) { aplicarSesion(s); });
    sb.auth.getSession().then(function (r) {
      if (!r.data.session) $("c-login").hidden = false;
      aplicarSesion(r.data.session);
    });
    cargarPublico();
  }

  var inicial = (location.hash || "").replace("#", "");
  abrir(["info", "sim", "cuenta", "prestamos", "resultados", "admin"].indexOf(inicial) > -1 && inicial !== "admin" ? inicial : "info");
  iniciar();
})();
