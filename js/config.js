// ============================================================
//  CONFIGURA TU RIFA AQUÍ. No necesitas tocar ningún otro archivo.
// ============================================================
const CONFIG = {

  // --- 1) Conexión a la base de datos (ver README.md, paso 1) ---
  // Los pegas después de crear tu proyecto gratis en supabase.com
  supabaseUrl: "https://cyfutjbmwyipsefkhcrk.supabase.co/rest/v1/",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZnV0amJtd3lpcHNlZmtoY3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMDUwMjksImV4cCI6MjEwNTg4MTAyOX0.q_M1YiGr_5doDbuUyEEYE0IySAI_5cbI3bu73Q8jaLc",
  table: "numbers",            // tabla completa: solo tú la lees/editas, desde admin.html
  publicView: "public_numbers", // vista de solo número y estado: la usan los visitantes

  // --- 2) Datos de la rifa ---
  title: "Gran Rifa",
  message: "Comprando un ticket me ayudarías un montón, ¡gracias!",
  price: 10,          // valor de cada número
  symbol: "S/",        // S/, $, etc.
  thousands: ",",      // "," para 1,000  |  "." para 1.000
  total: 300,           // cantidad de números del tablero

  // --- 3) Contacto y pago ---
  whatsapp: "984270348",   // tu número, sin +, sin espacios
  countryCode: "51",         // código de país (Perú = 51)
  payInfo: "Yape porfa",                 // ej: "Yape o Plin al 984 270 348"
  organizer: "",              // tu nombre (opcional)
  drawDate: "20 de octubre 7:00pm",               // ej: "31 de octubre, 8 pm"

  // --- 4) Premios: agrega, quita o reordena las líneas que quieras ---
  // No hay límite de premios. Para agregar uno más:
  //   1) Guarda tu foto dentro de la carpeta "images" (jpg o png,
  //      ojalá menos de 500 KB para que la página cargue rápido).
  //   2) Agrega una línea nueva copiando el formato de las de abajo,
  //      con el nombre de archivo que le pusiste a tu foto.
  // El diseño ya está listo para un número impar de premios (el último
  // queda centrado solo), así que puedes agregar uno más sin que se vea
  // descuadrado.
  prizes: [
    { name: "Minicomponente Panasonic altavoces bidireccionales 300W, Bluetooth", img: "images/premio1.jpg" },
    { name: "Thomas set hogar: Cafetera Thomas 1.5L + Hervidor 1.7L", img: "images/premio2.jpg" },
    { name: "Kit de licores", img: "images/premio3.jpg" },
    { name: "Cena para 2 en Juicy Lucy Larcomar", img: "images/premio4.jpg" },
    { name: "Sesión de fotos profesional simple", img: "images/premio5.jpg" },
    { name: "Entradas dobles + combo", img: "images/premio6.jpg" }

    // Descomenta esta línea y cambia los datos cuando tengas la foto:
    // , { name: "Figuras de one piece", img: "images/premio7.jpg" }
  ]
};
