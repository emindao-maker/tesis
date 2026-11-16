/* Funciones generales de la página de Tesis (antes estaban dentro del HTML) */
(function () {
  /* Imágenes opcionales: si un logo no carga, se quita sin dejar un hueco */
  function quitarSiFalla(img) {
    var accion = img.getAttribute("data-si-falla");
    var quitar = function () { var n = accion === "quitar-padre" ? img.parentNode : img; if (n && n.parentNode) n.parentNode.removeChild(n); };
    if (img.complete && img.naturalWidth === 0) quitar(); else img.addEventListener("error", quitar);
  }
  document.querySelectorAll("img[data-si-falla]").forEach(quitarSiFalla);
})();
(function(){
  /* Pago con tarjeta: pega aquí tu enlace de cobro abierto de Payphone */
  var PAYPHONE_LINK = '';
  var pb=document.getElementById('pay-card-btn');
  if(PAYPHONE_LINK){ pb.href=PAYPHONE_LINK; }
  else {
    pb.href='https://wa.me/593985568519?text='+encodeURIComponent('Hola, quiero pagar con tarjeta. ¿Me envías el enlace de pago?');
    document.getElementById('pay-card-label').textContent='Pedir enlace de pago con tarjeta';
    document.getElementById('pay-card-note').textContent='Te enviamos por WhatsApp un enlace de Payphone con el valor de tu cotización. Los datos de tu tarjeta se ingresan en la página de Payphone; Tesis no los ve ni los guarda.';
  }
  document.querySelectorAll('.copy').forEach(function(b){
    b.addEventListener('click',function(){
      var el=document.getElementById(b.dataset.copy), txt=el.textContent.trim();
      var done=function(){ b.textContent='Copiado'; b.classList.add('ok'); setTimeout(function(){b.textContent='Copiar'; b.classList.remove('ok');},1800); };
      var fallback=function(){ var r=document.createRange(); r.selectNodeContents(el); var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r); try{ if(document.execCommand('copy')) done(); }catch(e){} };
      if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(done,fallback); } else { fallback(); }
    });
  });
  var dlg=document.getElementById('viewer'), vi=document.getElementById('viewer-img'), vc=document.getElementById('viewer-cap');
  document.querySelectorAll('.gallery button').forEach(function(b){
    b.addEventListener('click',function(){
      vi.src=b.dataset.full; vi.alt=b.querySelector('img').alt; vc.textContent=b.dataset.cap;
      if(dlg.showModal) dlg.showModal(); else window.open(b.dataset.full,'_blank');
    });
  });
  document.getElementById('viewer-close').addEventListener('click',function(){dlg.close();});
  dlg.addEventListener('click',function(e){ if(e.target===dlg) dlg.close(); });
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
  var f=document.getElementById('cotizar');
  var req=[['nombre','Escribe tu nombre.'],['servicio','Elige el servicio que necesitas.'],['nivel','Elige tu nivel de estudios.'],['detalle','Cuéntanos brevemente tu tema o lo que necesitas.']];
  f.addEventListener('submit',function(ev){
    ev.preventDefault();
    var ok=true, first=null;
    req.forEach(function(r){
      var el=f.elements[r[0]], e=document.getElementById('e-'+r[0]);
      var bad=!el.value.trim();
      el.setAttribute('aria-invalid',bad?'true':'false');
      el.setAttribute('aria-describedby','e-'+r[0]);
      e.textContent=bad?r[1]:'';
      if(bad){ok=false; if(!first) first=el;}
    });
    if(!ok){first.focus();return;}
    var v=function(n){return f.elements[n].value.trim();};
    var fecha=v('fecha');
    if(fecha){var p=fecha.split('-'); fecha=p[2]+'/'+p[1]+'/'+p[0];}
    var lines=['Hola, soy '+v('nombre')+'. Quiero una cotización.','','Servicio: '+v('servicio'),'Nivel: '+v('nivel')];
    if(v('carrera')) lines.push('Carrera y universidad: '+v('carrera'));
    if(fecha) lines.push('Fecha de entrega: '+fecha);
    lines.push('','Detalle: '+v('detalle'));
    var num=(f.querySelector('input[name=numero]:checked')||{}).value||'593985568519';
    var url='https://wa.me/'+num+'?text='+encodeURIComponent(lines.join('\n'));
    var box=document.getElementById('sent'), link=document.getElementById('sent-link');
    link.href=url; box.hidden=false;
    try{ window.open(url,'_blank','noopener'); }catch(e){}
    link.focus();
  });
  f.addEventListener('input',function(ev){
    var t=ev.target; if(t.getAttribute('aria-invalid')==='true' && t.value.trim()){t.setAttribute('aria-invalid','false'); var e=document.getElementById('e-'+t.name); if(e) e.textContent='';}
  });
})();
/* Índice lateral (menú en tabletas y celulares) */
(function () {
  var dlg = document.getElementById("menu");
  if (!dlg) return;
  var abrir = document.querySelectorAll('[aria-controls="menu"]');
  abrir.forEach(function (b) {
    b.addEventListener("click", function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); b.setAttribute("aria-expanded", "true"); });
  });
  function cerrar() { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
  dlg.addEventListener("close", function () { abrir.forEach(function (b) { b.setAttribute("aria-expanded", "false"); }); });
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg || e.target.closest("[data-cerrar-menu]") || e.target.closest(".menu-toc a")) cerrar();
  });
})();
/* Buscador de carreras */
(function () {
  var input = document.getElementById("buscar-carrera");
  if (!input) return;
  var areas = [].slice.call(document.querySelectorAll("#areas .area"));
  var total = document.getElementById("carreras-total"), vacio = document.getElementById("carreras-vacio"), vacioWa = document.getElementById("carreras-vacio-wa");
  var textoTotal = total.textContent;
  function norm(t) { return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  var items = [];
  areas.forEach(function (a) {
    a.querySelectorAll(".carrera-list a").forEach(function (l) { items.push({ area: a, li: l.parentNode, a: l, texto: l.textContent, n: norm(l.textContent + " " + a.querySelector("h3").textContent) }); });
  });
  function marcar(el, texto, q) {
    el.textContent = "";
    if (!q) { el.textContent = texto; return; }
    var i = norm(texto).indexOf(q);
    if (i < 0) { el.textContent = texto; return; }
    el.appendChild(document.createTextNode(texto.slice(0, i)));
    var m = document.createElement("mark"); m.textContent = texto.slice(i, i + q.length); el.appendChild(m);
    el.appendChild(document.createTextNode(texto.slice(i + q.length)));
  }
  input.addEventListener("input", function () {
    var q = norm(input.value.trim()), n = 0;
    areas.forEach(function (a) { a.hidden = true; });
    items.forEach(function (it) {
      var ok = !q || it.n.indexOf(q) >= 0;
      it.li.hidden = !ok;
      if (ok) { n++; it.area.hidden = false; }
      marcar(it.a, it.texto, q && norm(it.texto).indexOf(q) >= 0 ? q : "");
    });
    total.textContent = !q ? textoTotal : n === 0 ? "Sin resultados" : n + (n === 1 ? " carrera encontrada" : " carreras encontradas");
    vacio.hidden = n > 0;
    if (n === 0) vacioWa.href = "https://wa.me/593985568519?text=" + encodeURIComponent("Hola, estudio " + input.value.trim() + ". ¿Trabajan con mi carrera? Quiero una cotización.");
  });
})();
