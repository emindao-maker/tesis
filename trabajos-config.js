/*
  Configuración de "Nuestros trabajos realizados".
  Pega aquí los dos datos de tu proyecto de Supabase
  (Project Settings > API): la URL del proyecto y la clave pública (anon / publishable).
  La clave pública puede ir en la página sin problema: las reglas de la base de datos
  (RLS, límites por IP y validaciones) deciden qué se puede leer y escribir.
  Nunca pongas aquí la clave secreta (service_role / sb_secret).
*/
window.TRABAJOS_CONFIG = {
  supabaseUrl: "https://mgjvdvidgtlenlssiarv.supabase.co",
  supabaseKey: "sb_publishable_oyFZDP2J0iLCfh7LGt_5bg_03wy6KUk",
  bucket: "trabajos",
  whatsapp: "593985568519",
  paginasVistaPrevia: 3,  // páginas de PDF que se muestran antes de pedir el documento
  tamanoMaximoMB: 25
};
