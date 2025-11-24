const SUPABASE_URL = "https://cfhyghkszfkktdlqdaqy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pYd42nEtQuJU7yX6eJuhMA_8wQCXA5m";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nombre del bucket de Storage que creaste para las imágenes
const BUCKET_NAME = "imagenes-herramientas";
// =================================================================

// ... (El resto de tu código JS permanece igual)

// Referencias del DOM
const galeria = document.getElementById("galeria");
const loader = document.getElementById("loader");
const formHerramienta = document.getElementById("formHerramienta");
const btnAgregar = document.getElementById("btnAgregar");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");

// Función de formato de fecha (la mantienes)
function formatearFecha(fechaISO) {
  if (!fechaISO) return "Sin fecha";
  const d = new Date(fechaISO);
  if (isNaN(d)) return fechaISO;
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// =================================================================
// 📊 FUNCIÓN PARA OBTENER DATOS DE SUPABASE Y MOSTRAR GALERÍA
// =================================================================
async function cargarInventario() {
  loader.style.display = "block";
  galeria.innerHTML = "";

  try {
    const { data: herramientas, error } = await supabase
      .from("herramientas")
      .select("*"); // Obtiene todas las columnas

    if (error) throw error;

    if (herramientas.length === 0) {
      galeria.innerHTML =
        '<p class="text-white">No hay herramientas registradas.</p>';
      loader.style.display = "none";
      return;
    }

    herramientas.forEach((herramienta) => {
      crearCardHerramienta(herramienta);
    });
  } catch (error) {
    console.error(
      "❌ Error cargando inventario desde Supabase:",
      error.message
    );
    galeria.innerHTML = `<p class="text-danger">Error al cargar el inventario: ${error.message}</p>`;
  } finally {
    loader.style.display = "none";
  }
}

// Función para crear y adjuntar una card al DOM
function crearCardHerramienta(herramienta) {
  const card = document.createElement("div");
  card.className = "col-md-3 mb-4";
  const imagenUrl = herramienta.imagen_url || "placeholder.jpg"; // Usar URL de Supabase o un placeholder
  const nombre = herramienta.nombre;

  card.innerHTML = `
        <div class="card h-100" style="cursor:pointer">
            <img src="${imagenUrl}" class="card-img-top" alt="${nombre}">
            <div class="card-body">
                <h5 class="card-title">${nombre}</h5>
            </div>
        </div>
    `;
  galeria.appendChild(card);

  // Event listener para mostrar el modal de información
  card.addEventListener("click", () => {
    const modal = new bootstrap.Modal(document.getElementById("infoModal"));

    document.getElementById("modalNombre").innerText = nombre;
    document.getElementById("modalImagen").src = imagenUrl;
    document.getElementById("modalImagen").alt = nombre;

    document.getElementById("modalEstado").innerText =
      herramienta.estado || "No definido";
    document.getElementById("modalDescripcion").innerText =
      herramienta.descripcion || "Sin descripción";
    document.getElementById("modalFecha").innerText = formatearFecha(
      herramienta.fecha
    );
    document.getElementById("modalReemplazos").innerText =
      herramienta.reemplazos || "Ninguno";

    modal.show();
  });
}

// Iniciar la carga del inventario al cargar el script
cargarInventario();

// =================================================================
// 📤 MANEJO DEL FORMULARIO Y SUBIDA DE IMAGEN
// =================================================================
formHerramienta.addEventListener("submit", async function (event) {
  event.preventDefault();

  // 1. Obtener datos del formulario, incluyendo la IMAGEN
  const nombre = document.getElementById("nombre").value.trim();
  const estado = document.getElementById("estado").value;
  const descripcion = document.getElementById("descripcion").value;
  const fecha = document.getElementById("fecha").value;
  const reemplazos = document.getElementById("reemplazos").value;
  // ** CAMBIO CLAVE **: Obtener el archivo de imagen
  const imagenFile = document.getElementById("imagen").files[0];

  if (!imagenFile) {
    alert("Por favor, selecciona una imagen.");
    return;
  }
  if (!nombre) {
    alert("El nombre de la herramienta es obligatorio.");
    return;
  }

  // 2. 🔹 Mostrar spinner y bloquear botón
  btnSpinner.classList.remove("d-none");
  btnText.textContent = "Guardando...";
  btnAgregar.disabled = true;

  try {
    let imagen_url = "";
    const fileName = `${Date.now()}_${imagenFile.name}`; // Nombre único para el archivo

    // 2. Subir la imagen a Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, imagenFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (storageError) throw storageError;

    // 3. Obtener la URL pública de la imagen
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    imagen_url = publicUrlData.publicUrl;

    // 4. Insertar la información de la herramienta (incluyendo la URL) en la Base de Datos
    const { error: dbError } = await supabase.from("herramientas").insert([
      {
        nombre: nombre,
        estado: estado,
        descripcion: descripcion,
        fecha: fecha,
        reemplazos: reemplazos,
        imagen_url: imagen_url, // URL de la imagen guardada
      },
    ]);

    if (dbError) throw dbError;

    // 5. Éxito: Limpiar, mostrar modal y recargar
    formHerramienta.reset();

    const successModal = new bootstrap.Modal(
      document.getElementById("successModal")
    );
    successModal.show();

    setTimeout(() => {
      successModal.hide();
      location.reload(); // Recarga para ver el nuevo inventario
    }, 2500);
  } catch (error) {
    console.error("❌ Error al procesar herramienta:", error);
    // Si la subida fue exitosa pero la BD falló, es posible que quede un archivo huérfano.
    alert(
      `❌ Hubo un error al guardar la herramienta. Detalles: ${error.message}`
    );
  } finally {
    // 6. Restaurar botón
    btnSpinner.classList.add("d-none");
    btnText.textContent = "Agregar herramienta";
    btnAgregar.disabled = false;
  }
});

// =================================================================
// 🔄 FUNCIONES DE NAVEGACIÓN (Se mantienen)
// =================================================================
function mostrarSeccion(id) {
  const secciones = document.querySelectorAll(".seccion");
  secciones.forEach((sec) => (sec.style.display = "none"));
  const seccion = document.getElementById(id);
  if (seccion) seccion.style.display = "block";
}
