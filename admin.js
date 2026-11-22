/* Capital Investment (Tesis): panel de administración (admin.html). Solo para filas de inv_admins.
   Las reglas de seguridad reales están en inversion.sql (RLS): este panel no concede permisos por sí mismo. */
(function () {
  "use strict";
  var C = window.TRABAJOS_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var sb = null, resultados = [], inversiones = [], prestamos = [], perfiles = [];
  var MESES_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  function usd(n) { return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(n) { return (n >= 0 ? "+" : "") + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "%"; }
  function mesTexto(iso) { var d = new Date(iso + "T00:00:00"); return MESES_ES[d.getMonth()] + " " + d.getFullYear(); }
  function clase(n) { return n > 0 ? "pos" : n < 0 ? "neg" : ""; }
  function fecha(iso) { return iso ? new Date(iso).toLocaleDateString("es-EC") : ""; }
  function el(tag, props, kids) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === "text") e.textContent = props[k]; else if (k === "cls") e.className = props[k]; else e.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function limpiar(n) { while (n.firstChild) n.removeChild(n.firstChild); }
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
  function pillPre(e) { return e === "solicitada" ? "pendiente" : e === "rechazada" ? "rechazada" : "confirmada"; }
  function contactoCel(nombre, contacto, extra) {
    var k = [el("b", { text: nombre }), el("br"), el("span", { cls: "muted", text: contacto })];
    var w = waLink(contacto);
    if (w) { k.push(el("br")); k.push(el("a", { href: w, target: "_blank", rel: "noopener noreferrer", text: "Abrir WhatsApp" })); }
    if (extra) { k.push(el("br")); k.push(el("span", { cls: "muted small", text: extra })); }
    return el("td", {}, k);
  }

  /* ---------- Menú ---------- */
  var TITULOS = { panel: "Panel general", inversiones: "Inversiones", prestamos: "Préstamos", clientes: "Clientes", resultados: "Resultados del mes", pagos: "Datos de pago y tasa" };
  var raiz = document.documentElement;
  function menu(a) { raiz.classList.toggle("layout-menu-expanded", a); }
  function abrir(n) {
    if (!TITULOS[n]) n = "panel";
    Array.prototype.slice.call(document.querySelectorAll("a[data-sub]")).forEach(function (a) {
      a.parentNode.classList.toggle("active", a.getAttribute("data-sub") === n);
    });
    Object.keys(TITULOS).forEach(function (k) { $("sp-" + k).hidden = (k !== n); });
    $("titulo").textContent = TITULOS[n]; document.title = TITULOS[n] + " · Administración";
    if (location.hash !== "#" + n) history.replaceState(null, "", "#" + n);
    menu(false); window.scrollTo(0, 0);
  }
  Array.prototype.slice.call(document.querySelectorAll("a[data-sub]")).forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); abrir(a.getAttribute("data-sub")); });
  });
  Array.prototype.slice.call(document.querySelectorAll(".layout-menu-toggle")).forEach(function (t) {
    t.addEventListener("click", function (e) { e.preventDefault(); menu(!raiz.classList.contains("layout-menu-expanded")); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") menu(false); });

  /* ---------- Cálculo ---------- */
  function sumaUtilidad(monto, desdeIso) {
    var ini = desdeIso.slice(0, 7), t = 0;
    resultados.forEach(function (r) { if (r.mes.slice(0, 7) >= ini) t += Number(r.utilidad_pct); });
    return monto * t / 100;
  }

  /* ---------- Inversiones ---------- */
  function botonInv(acc, i, txt, estado) {
    var b = el("button", { cls: "btn btn-sm btn-outline-primary", type: "button", text: txt, style: "margin:0 4px 4px 0" });
    b.addEventListener("click", function () { cambiarInv(i, estado); });
    acc.appendChild(b);
  }
  function accionesInv(acc, i) {
    if (i.estado === "pendiente") { botonInv(acc, i, "Confirmar pago", "confirmada"); botonInv(acc, i, "Rechazar", "rechazada"); }
    if (i.estado === "confirmada") botonInv(acc, i, "Liquidar", "liquidada");
  }
  function cambiarInv(i, estado) {
    var cambios = { estado: estado };
    if (estado === "confirmada") cambios.confirmada_en = new Date().toISOString();
    if (estado === "liquidada") {
      var sugerido = Math.max(0, Number(i.monto) + sumaUtilidad(Number(i.monto), i.confirmada_en || i.creada_en)).toFixed(2);
      var v = window.prompt("Monto a liquidar para " + i.nombre + " (USD). Sugerido con los resultados publicados:", sugerido);
      if (v === null) return;
      var num = parseFloat(v);
      if (isNaN(num) || num < 0) return aviso("a-msg", "err", "Monto de liquidación no válido.");
      cambios.monto_liquidado = Math.round(num * 100) / 100; cambios.liquidada_en = new Date().toISOString();
    }
    sb.from("inv_inversiones").update(cambios).eq("id", i.id).then(function (r) {
      if (r.error) return aviso("a-msg", "err", "No se pudo actualizar.");
      aviso("a-msg", "ok", "Actualizado."); cargarTodo();
    });
  }
  function pintarInversiones() {
    var f = $("fi-estado").value, tb = $("a-tabla"); limpiar(tb);
    inversiones.filter(function (i) { return !f || i.estado === f; }).forEach(function (i) {
      var acc = el("td", {}); accionesInv(acc, i);
      tb.appendChild(el("tr", {}, [
        contactoCel(i.nombre, i.contacto, fecha(i.creada_en)),
        el("td", { cls: "num", text: usd(i.monto) }), el("td", { text: i.metodo + " · " + i.referencia }), el("td", { text: i.meses + " m" }),
        el("td", {}, [el("span", { cls: "pill " + i.estado, text: i.estado })]), acc
      ]));
    });
    if (!tb.firstChild) tb.appendChild(el("tr", {}, [el("td", { colspan: "6", cls: "muted", text: "No hay inversiones en esta vista." })]));
  }

  /* ---------- Préstamos ---------- */
  function botonPre(acc, p, txt, est) {
    var b = el("button", { cls: "btn btn-sm btn-outline-primary", type: "button", text: txt, style: "margin:0 4px 4px 0" });
    b.addEventListener("click", function () {
      sb.from("inv_prestamos").update({ estado: est }).eq("id", p.id).then(function (r) {
        if (r.error) return aviso("a-pre-msg", "err", "No se pudo actualizar.");
        aviso("a-pre-msg", "ok", "Actualizado."); cargarTodo();
      });
    });
    acc.appendChild(b);
  }
  function accionesPre(acc, p) {
    if (p.estado === "solicitada") { botonPre(acc, p, "Aprobar", "aprobada"); botonPre(acc, p, "Rechazar", "rechazada"); }
    if (p.estado === "aprobada") botonPre(acc, p, "Marcar desembolsado", "desembolsada");
    if (p.estado === "desembolsada") botonPre(acc, p, "Marcar pagado", "pagada");
  }
  function pintarPrestamos() {
    var f = $("fp-estado").value, tb = $("a-pre"); limpiar(tb);
    prestamos.filter(function (p) { return !f || p.estado === f; }).forEach(function (p) {
      var acc = el("td", {}); accionesPre(acc, p);
      tb.appendChild(el("tr", {}, [
        contactoCel(p.nombre, p.contacto, fecha(p.creada_en)),
        el("td", { cls: "num", text: usd(p.monto) }),
        el("td", { text: p.plazo_meses + " m · cuota " + usd(p.cuota) + " · " + p.tasa_anual + "% anual · total " + usd(p.cuota * p.plazo_meses) }),
        el("td", { text: p.destino }), el("td", {}, [el("span", { cls: "pill " + pillPre(p.estado), text: p.estado })]), acc
      ]));
    });
    if (!tb.firstChild) tb.appendChild(el("tr", {}, [el("td", { colspan: "6", cls: "muted", text: "No hay préstamos en esta vista." })]));
  }
  $("fi-estado").addEventListener("change", pintarInversiones);
  $("fp-estado").addEventListener("change", pintarPrestamos);

  /* ---------- Panel general y clientes ---------- */
  function pintarPanel() {
    var cap = 0, pend = [], pre = prestamos.filter(function (p) { return p.estado === "solicitada"; });
    inversiones.forEach(function (i) { if (i.estado === "confirmada") cap += Number(i.monto); if (i.estado === "pendiente") pend.push(i); });
    $("k-cap").textContent = usd(cap); $("k-pend").textContent = String(pend.length); $("k-pre").textContent = String(pre.length);
    $("k-cli").textContent = String(perfiles.length);
    var bi = $("p-inv"); limpiar(bi);
    if (!pend.length) bi.appendChild(el("p", { cls: "muted mb-0", text: "No hay inversiones por confirmar." }));
    pend.forEach(function (i) {
      var acc = el("div", { cls: "mt-2" }); var a2 = el("td", {}); accionesInv(a2, i);
      while (a2.firstChild) acc.appendChild(a2.firstChild);
      bi.appendChild(el("div", { cls: "border-bottom py-3" }, [el("b", { text: i.nombre + " · " + usd(i.monto) }), el("div", { cls: "muted small", text: i.metodo + " · ref. " + i.referencia + " · " + i.meses + " m · " + fecha(i.creada_en) + " · " + i.contacto }), acc]));
    });
    var bp = $("p-pre"); limpiar(bp);
    if (!pre.length) bp.appendChild(el("p", { cls: "muted mb-0", text: "No hay préstamos por revisar." }));
    pre.forEach(function (p) {
      var a2 = el("td", {}); accionesPre(a2, p); var acc = el("div", { cls: "mt-2" });
      while (a2.firstChild) acc.appendChild(a2.firstChild);
      var kids = [el("b", { text: p.nombre + " · " + usd(p.monto) }), el("div", { cls: "muted small", text: p.plazo_meses + " m · cuota " + usd(p.cuota) + " · " + p.destino + " · " + p.contacto })];
      var w = waLink(p.contacto); if (w) kids.push(el("a", { href: w, target: "_blank", rel: "noopener noreferrer", cls: "small", text: "Abrir WhatsApp" }));
      kids.push(acc); bp.appendChild(el("div", { cls: "border-bottom py-3" }, kids));
    });
  }
  function pintarClientes() {
    var tb = $("a-cli"); limpiar(tb);
    perfiles.forEach(function (c) {
      var inv = 0, np = 0;
      inversiones.forEach(function (i) { if (i.user_id === c.user_id && (i.estado === "confirmada" || i.estado === "pendiente")) inv += Number(i.monto); });
      prestamos.forEach(function (p) { if (p.user_id === c.user_id) np++; });
      var w = waLink(c.telefono);
      tb.appendChild(el("tr", {}, [
        el("td", {}, [el("b", { text: c.nombre || "(sin nombre)" })]),
        el("td", {}, w ? [el("a", { href: w, target: "_blank", rel: "noopener noreferrer", text: c.telefono })] : [el("span", { cls: "muted", text: c.telefono || "-" })]),
        el("td", { text: c.ciudad || "-" }), el("td", { cls: "num", text: usd(inv) }), el("td", { cls: "num", text: String(np) })
      ]));
    });
    if (!tb.firstChild) tb.appendChild(el("tr", {}, [el("td", { colspan: "5", cls: "muted", text: "Aún no hay clientes con perfil." })]));
  }

  /* ---------- Resultados, datos de pago y tasa ---------- */
  function pintarResultados() {
    var tb = $("res"); limpiar(tb);
    resultados.forEach(function (r) {
      tb.appendChild(el("tr", {}, [el("td", { text: mesTexto(r.mes) }), el("td", { cls: "num " + clase(Number(r.utilidad_pct)), text: pct(Number(r.utilidad_pct)) }), el("td", { text: r.nota || "" })]));
    });
    if (!tb.firstChild) tb.appendChild(el("tr", {}, [el("td", { colspan: "3", cls: "muted", text: "Aún no hay resultados publicados." })]));
  }
  $("f-res").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var mes = $("r-mes").value, p = parseFloat($("r-pct").value);
    if (!mes || isNaN(p)) return aviso("r-msg", "err", "Elige el mes y escribe el porcentaje.");
    sb.from("inv_resultados").upsert({ mes: mes + "-01", utilidad_pct: p, nota: $("r-nota").value.trim() }).then(function (r) {
      if (r.error) return aviso("r-msg", "err", "No se pudo publicar.");
      aviso("r-msg", "ok", "Resultado publicado."); cargarTodo();
    });
  });
  $("f-cfg").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var d = { banco: $("g-banco").value.trim(), tipo_cuenta: $("g-tipo").value.trim(), numero_cuenta: $("g-num").value.trim(),
      titular: $("g-tit").value.trim(), identificacion: $("g-id").value.trim(), paypal: $("g-pp").value.trim() };
    sb.from("inv_config").update(d).eq("id", 1).then(function (r) {
      aviso("g-msg", r.error ? "err" : "ok", r.error ? "No se pudo guardar." : "Datos guardados.");
    });
  });
  $("g-tasa-b").addEventListener("click", function () {
    var t = parseFloat($("g-tasa").value);
    if (isNaN(t) || t < 0 || t > 100) return aviso("t-msg", "err", "Escribe una tasa entre 0 y 100.");
    sb.from("inv_config").update({ tasa_prestamo_anual: t }).eq("id", 1).then(function (r) {
      aviso("t-msg", r.error ? "err" : "ok", r.error ? "No se pudo guardar la tasa." : "Tasa guardada.");
    });
  });

  /* ---------- Carga ---------- */
  function cargarTodo() {
    return Promise.all([
      sb.from("inv_inversiones").select("*").order("creada_en", { ascending: false }),
      sb.from("inv_prestamos").select("*").order("creada_en", { ascending: false }),
      sb.from("inv_resultados").select("*").order("mes", { ascending: false }),
      sb.from("inv_perfiles").select("*").order("nombre", { ascending: true })
    ]).then(function (r) {
      inversiones = r[0].data || []; prestamos = r[1].data || []; resultados = r[2].data || []; perfiles = r[3].data || [];
      pintarPanel(); pintarInversiones(); pintarPrestamos(); pintarClientes(); pintarResultados();
    });
  }
  function cargarConfig() {
    return sb.from("inv_config").select("*").eq("id", 1).maybeSingle().then(function (r) {
      var c = r.data; if (!c) return;
      $("g-banco").value = c.banco || ""; $("g-tipo").value = c.tipo_cuenta || ""; $("g-num").value = c.numero_cuenta || "";
      $("g-tit").value = c.titular || ""; $("g-id").value = c.identificacion || ""; $("g-pp").value = c.paypal || ""; $("g-tasa").value = c.tasa_prestamo_anual;
    });
  }
  function irA(url) { location.replace(url); }
  function iniciar() {
    if (!(C.supabaseUrl && C.supabaseKey && window.supabase && window.supabase.createClient)) {
      $("c-cargando").textContent = "El servicio no está disponible ahora."; return;
    }
    sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true } });
    sb.auth.getSession().then(function (r) {
      var s = r.data.session;
      if (!s) return irA("inversion.html#cuenta");
      sb.from("inv_admins").select("user_id").eq("user_id", s.user.id).maybeSingle().then(function (a) {
        if (!a.data) return irA("banca.html");
        return Promise.all([cargarTodo(), cargarConfig()]).then(function () {
          $("c-cargando").hidden = true; $("c-app").hidden = false;
          var h = (location.hash || "").replace("#", ""); abrir(TITULOS[h] ? h : "panel");
        });
      }, function () { $("c-cargando").textContent = "No se pudo verificar tu acceso. Recarga la página."; });
    });
    sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_OUT") irA("inversion.html#cuenta"); });
  }
  $("salir").addEventListener("click", function (e) { e.preventDefault(); sb.auth.signOut().then(function () { irA("inversion.html#cuenta"); }); });
  iniciar();
})();
