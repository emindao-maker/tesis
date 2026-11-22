/* Certificado de participación en inversión (certificado.html). Se emite solo cuando el pago está confirmado.
   El código se deriva del identificador de la inversión; verificar.html lo comprueba con inv_verificar(). */
(function () {
  "use strict";
  var C = window.TRABAJOS_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  var BASE = "https://emindao-maker.github.io/tesis/";
  function fechaLarga(d) { return d.getDate() + " de " + MESES[d.getMonth()] + " de " + d.getFullYear(); }
  function usd(n) { return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  var U = ["cero","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez","once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho","diecinueve","veinte","veintiuno","veintidós","veintitrés","veinticuatro","veinticinco","veintiséis","veintisiete","veintiocho","veintinueve"];
  var D = ["","","","treinta","cuarenta","cincuenta","sesenta","setenta","ochenta","noventa"];
  var Cn = ["","ciento","doscientos","trescientos","cuatrocientos","quinientos","seiscientos","setecientos","ochocientos","novecientos"];
  function menorMil(n) {
    if (n === 100) return "cien";
    var c = Math.floor(n / 100), r = n % 100, s = Cn[c];
    if (r === 0) return s;
    var t = r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? " y " + U[r % 10] : "");
    return (s ? s + " " : "") + t;
  }
  function letras(n) {
    if (n === 0) return "cero";
    var m = Math.floor(n / 1000), r = n % 1000, s = "";
    if (m) s = m === 1 ? "mil" : menorMil(m) + " mil";
    if (r) s += (s ? " " : "") + menorMil(r);
    return s.replace(/uno mil/, "un mil").replace(/veintiuno mil/, "veintiún mil");
  }
  function montoLetras(m) {
    var ent = Math.floor(m + 1e-9), cts = Math.round((m - ent) * 100);
    var t = letras(ent).replace(/uno$/, "un");
    return t.charAt(0).toUpperCase() + t.slice(1) + " con " + (cts < 10 ? "0" : "") + cts + "/100 dólares de los Estados Unidos de América";
  }
  function msg(t) { $("estado").textContent = t; }

  var id = new URLSearchParams(location.search).get("id");
  if (!id) return msg("Falta el identificador del certificado.");
  if (!(C.supabaseUrl && C.supabaseKey && window.supabase)) return msg("El servicio no está disponible ahora.");
  var sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true } });
  sb.auth.getSession().then(function (r) {
    if (!r.data.session) { location.replace("inversion.html#cuenta"); return null; }
    return sb.from("inv_inversiones").select("*").eq("id", id).maybeSingle();
  }).then(function (r) {
    if (!r) return;
    var i = r.data;
    if (r.error || !i) return msg("No encontramos ese certificado en tu cuenta.");
    if (i.estado !== "confirmada" && i.estado !== "liquidada") return msg("El certificado se emite automáticamente cuando confirmamos tu pago. Tu inversión está en estado: " + i.estado + ".");
    var conf = new Date(i.confirmada_en || i.creada_en), liq = new Date(conf.getTime()); liq.setMonth(liq.getMonth() + Number(i.meses));
    var cod = "CI-" + i.id.replace(/-/g, "").slice(0, 12).toUpperCase();
    var url = BASE + "verificar.html?c=" + cod;
    $("c-nombre").textContent = i.nombre;
    var texto = "ha participado en el negocio de Capital Investment mediante un aporte de ";
    $("c-texto").innerHTML = "ha participado en el negocio de <b>Capital Investment</b> mediante un aporte de <b></b>, recibido y confirmado por la empresa, por un plazo de <b>" + i.meses + (Number(i.meses) === 1 ? " mes" : " meses") + "</b>, con liquidación el " + fechaLarga(liq) + ". El aporte se pagó por " + i.metodo + (i.renovar ? " y se renovará por un periodo igual si no se indica lo contrario" : "") + ".";
    $("c-texto").querySelectorAll("b")[1].textContent = montoLetras(Number(i.monto)) + " (" + usd(i.monto) + ")";
    $("c-cod").textContent = cod; $("c-cod2").textContent = cod; $("c-monto").textContent = usd(i.monto);
    $("c-fecha").textContent = fechaLarga(conf); $("c-liq").textContent = fechaLarga(liq);
    $("c-emi").textContent = fechaLarga(new Date()); $("c-url").textContent = "emindao-maker.github.io/tesis/verificar.html";
    $("micro").textContent = new Array(40).join("Capital Investment · " + cod + " · ");
    try { var q = qrcode(0, "M"); q.addData(url); q.make(); $("c-qr").innerHTML = q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } catch (x) {}
    $("estado").hidden = true; $("hoja").hidden = false; $("barra").hidden = false;
    document.title = "Certificado " + cod;
    function ajustar() { var w = document.documentElement.clientWidth, h = $("hoja"), nat = 297 / 25.4 * 96; h.style.transform = w < nat ? "scale(" + (w / nat) + ")" : ""; h.style.marginBottom = w < nat ? (-(nat * 210 / 297) * (1 - w / nat) + 20) + "px" : ""; }
    ajustar(); window.addEventListener("resize", ajustar);
  }).catch(function () { msg("No se pudo cargar el certificado. Recarga la página."); });
  $("imp").addEventListener("click", function () { window.print(); });
})();
