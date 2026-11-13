/* Registro de escaneos de los códigos QR y de barras (?c=CODIGO) */
(function(){
  try{
    var u=new URL(location.href), c=u.searchParams.get('c'), C=window.TRABAJOS_CONFIG||{};
    if(!c||!/^[A-Z0-9-]{3,40}$/.test(c)||!C.supabaseUrl) return;
    fetch(C.supabaseUrl+'/rest/v1/rpc/registrar_escaneo',{method:'POST',headers:{apikey:C.supabaseKey,'Content-Type':'application/json'},body:JSON.stringify({p_codigo:c}),keepalive:true}).catch(function(){});
    u.searchParams.delete('c'); history.replaceState(null,'',u.pathname+(u.search||'')+u.hash);
  }catch(e){}
})();
