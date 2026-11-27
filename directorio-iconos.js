/* Iconos de las materias del Directorio de Abogados y su agrupación por área.
   Los trazos usan currentColor y un viewBox de 24x24. */
window.DIR_ICONOS = {
  penal: '<path d="M13 4.5 19.5 11M10.5 7l6.5 6.5"/><path d="m12.4 5.6-4.9 4.9 5 5 4.9-4.9z"/><path d="m8.3 14.4-4.3 4.3M4 20.5h9"/>',
  civil: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 15.5h5M10 8.5h2"/>',
  familia: '<circle cx="8" cy="7.5" r="2.6"/><circle cx="16.5" cy="7.5" r="2.6"/><path d="M3.5 19v-2.2a4.5 4.5 0 0 1 9 0V19M12.5 19v-2.2a4.5 4.5 0 0 1 8 -2.8"/>',
  ninez: '<circle cx="12" cy="12" r="8.5"/><path d="M8.6 14.3a4.2 4.2 0 0 0 6.8 0"/><path d="M9 10h.01M15 10h.01"/>',
  laboral: '<rect x="3.5" y="8" width="17" height="11.5" rx="2"/><path d="M9 8V6.2A1.7 1.7 0 0 1 10.700 4.500h2.600A1.700 1.700 0 0 1 15 6.200V8M3.500 13h17M11 13v2h2v-2"/>',
  transito: '<path d="M4 16v-3.500l2-5h12l2 5V16zM4 12.500h16"/><path d="M5.500 16v2M18.500 16v2M7.500 15h.01M16.500 15h.01"/>',
  constitucional: '<path d="M12 6.500C9.800 5 6.800 4.500 4 5v13c2.800-.5 5.800 0 8 1.500 2.200-1.500 5.200-2 8-1.500V5c-2.800-.5-5.800 0-8 1.500ZM12 6.500v13"/>',
  administrativo: '<path d="M3.500 20.500h17M5.500 20.500V10.500M9.500 20.500V10.500M14.500 20.500V10.500M18.500 20.500V10.500M3.500 10 12 4l8.500 6z"/>',
  tributario: '<path d="M6 18 18 6"/><circle cx="7.500" cy="7.500" r="2.400"/><circle cx="16.500" cy="16.500" r="2.400"/>',
  societario: '<rect x="4.500" y="3.500" width="10" height="17"/><path d="M14.500 9.500h5v11h-5M8 7.500h3M8 11h3M8 14.500h3M17 13h.01M17 16.500h.01"/>',
  notarial: '<circle cx="12" cy="9.500" r="5.500"/><path d="M9.500 14.500 8 21l4-2 4 2-1.500-6.500M9.800 9.600l1.600 1.600 3-3.200"/>',
  migracion: '<circle cx="12" cy="12" r="8.500"/><path d="M3.500 12h17M12 3.500c2.500 2.500 3.500 5.300 3.500 8.500s-1 6-3.500 8.500c-2.500-2.500-3.500-5.300-3.500-8.500s1-6 3.500-8.500Z"/>',
  minero: '<path d="M12 3.500s6 6.200 6 10.500a6 6 0 0 1-12 0c0-4.300 6-10.500 6-10.500Z"/><path d="M9.300 14.500a2.800 2.800 0 0 0 2.700 2.500"/>',
  ambiental: '<path d="M5 19c0-8 5-14 15-14 0 9-5 15-13 14"/><path d="M5 19l8-8"/>',
  intelectual: '<circle cx="12" cy="12" r="8.500"/><path d="M14.800 9.500a3.400 3.400 0 1 0 0 5"/>',
  inmobiliario: '<path d="M4 11.500 12 4l8 7.500M6 10v10h12V10M10 20v-5h4v5"/>',
  sucesiones: '<path d="M7 3.500h9a2 2 0 0 1 2 2V16M7 3.500a2 2 0 0 0-2 2V17a3.500 3.500 0 0 0 3.500 3.500H18a2 2 0 0 0 2-2V16.500H8.500"/><path d="M10 8h5M10 11.500h5"/>',
  contratacion: '<rect x="5" y="4.500" width="14" height="16" rx="2"/><path d="M9 4.500v-1h6v1M9 11h6M9 15h4"/>',
  social: '<path d="M12 3.500 5 6v5.500c0 4.300 2.900 7.600 7 9 4.100-1.400 7-4.700 7-9V6z"/><path d="M12 9v6M9 12h6"/>',
  bancario: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10.500h18M6.500 15h4"/>',
  consumidor: '<path d="M3.500 4.500H6l2 10h9.500l2-7H7"/><circle cx="9.500" cy="19" r="1.400"/><circle cx="17" cy="19" r="1.400"/>',
  electoral: '<rect x="4" y="12" width="16" height="8" rx="1.500"/><path d="M8 12l1-8h6l1 8M10.500 16h3"/>',
  militar: '<path d="M12 3.500 5 6v5.500c0 4.300 2.900 7.600 7 9 4.100-1.400 7-4.700 7-9V6z"/><path d="m12 8.500 1.100 2.300 2.500.3-1.800 1.700.5 2.500-2.300-1.200-2.300 1.200.5-2.500-1.800-1.700 2.500-.3z"/>',
  humanos: '<path d="M12 20s-7.500-4.500-7.500-10a4.200 4.200 0 0 1 7.500-2.500A4.200 4.200 0 0 1 19.500 10c0 5.500-7.500 10-7.500 10Z"/>',
  arbitraje: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  aduanero: '<path d="M3.500 14h17l-2 5.500h-13zM6.500 14V9.500h4V14M12 14V6.500h5V14"/>',
  agrario: '<path d="M12 20V10M12 10c0-3-2-5-5-5 0 3 2 5 5 5ZM12 13c0-3 2-5 5-5 0 3-2 5-5 5ZM8 20h8"/>',
  informatico: '<rect x="4.500" y="5" width="15" height="10.500" rx="1.500"/><path d="M2.500 19h19M10 8.800 8.500 10.300 10 11.800M14 8.800l1.500 1.500L14 11.800"/>'
};

/* Materias agrupadas por área. "n" debe coincidir con DIR_DATOS.especialidades. */
window.DIR_MATERIAS = [
  { g: "Penal y seguridad", items: [
    { n: "Penal", i: "penal" }, { n: "Tránsito", i: "transito" }, { n: "Militar y policial", i: "militar" },
    { n: "Derechos humanos", i: "humanos" }, { n: "Informático y datos personales", i: "informatico" } ] },
  { g: "Civil y familia", items: [
    { n: "Civil", i: "civil" }, { n: "Familia y alimentos", i: "familia" }, { n: "Niñez y adolescencia", i: "ninez" },
    { n: "Sucesiones y herencias", i: "sucesiones" }, { n: "Inmobiliario y propiedad", i: "inmobiliario" }, { n: "Notarial y registral", i: "notarial" } ] },
  { g: "Empresa y economía", items: [
    { n: "Laboral", i: "laboral" }, { n: "Seguridad social", i: "social" }, { n: "Societario y mercantil", i: "societario" },
    { n: "Bancario y financiero", i: "bancario" }, { n: "Consumidor y competencia", i: "consumidor" }, { n: "Propiedad intelectual", i: "intelectual" },
    { n: "Arbitraje y mediación", i: "arbitraje" }, { n: "Aduanero y comercio exterior", i: "aduanero" } ] },
  { g: "Público y constitucional", items: [
    { n: "Constitucional", i: "constitucional" }, { n: "Administrativo", i: "administrativo" }, { n: "Tributario", i: "tributario" },
    { n: "Contratación pública", i: "contratacion" }, { n: "Electoral", i: "electoral" } ] },
  { g: "Territorio y recursos", items: [
    { n: "Minero y petrolero", i: "minero" }, { n: "Ambiental", i: "ambiental" }, { n: "Agrario", i: "agrario" },
    { n: "Migración y extranjería", i: "migracion" } ] }
];
