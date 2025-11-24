const SUPABASE_URL = "https://cfhyghkszfkktdlqdaqy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pYd42nEtQuJU7yX6eJuhMA_8wQCXA5m";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BUCKET_NAME = "imagenes-herramientas";

const galeria = document.getElementById("galeria");
const loader = document.getElementById("loader");
const formHerramienta = document.getElementById("formHerramienta");
const btnAgregar = document.getElementById("btnAgregar");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");

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

async function cargarInventario() {
  loader.style.display = "block";
  galeria.innerHTML = "";

  try {
    const { data: herramientas, error } = await supabase
      .from("herramientas")
      .select("*");

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

function crearCardHerramienta(herramienta) {
  const card = document.createElement("div");
  card.className = "col-md-3 mb-4";
  const imagenUrl = herramienta.imagen_url || "placeholder.jpg";
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

  card.addEventListener("click", () => {
    const modal = new bootstrap.Modal(document.getElementById("infoModal"));
    const nombre = herramienta.nombre;
    const imagenUrl = herramienta.imagen_url || "placeholder.jpg";

    // 💡 NUEVO: Llenar los campos editables y el ID
    document.getElementById("modalId").value = herramienta.id; // ¡Guardamos el ID!
    document.getElementById("modalNombre").innerText = nombre;
    document.getElementById("modalImagen").src = imagenUrl;
    document.getElementById("modalImagen").alt = nombre;

    document.getElementById("modalEstadoEditable").value =
      herramienta.estado || "Bueno";
    document.getElementById("modalDescripcionEditable").value =
      herramienta.descripcion || "";
    document.getElementById("modalReemplazosEditable").value =
      herramienta.reemplazos || 0;

    document.getElementById("modalNuevaImagen").value = "";

    modal.show();
  });
}

cargarInventario();

formHerramienta.addEventListener("submit", async function (event) {
  event.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const estado = document.getElementById("estado").value;
  const descripcion = document.getElementById("descripcion").value;
  const fecha = document.getElementById("fecha").value;
  const reemplazos = document.getElementById("reemplazos").value;
  const imagenFile = document.getElementById("imagen").files[0];

  if (!imagenFile) {
    alert("Por favor, selecciona una imagen.");
    return;
  }
  if (!nombre) {
    alert("El nombre de la herramienta es obligatorio.");
    return;
  }

  btnSpinner.classList.remove("d-none");
  btnText.textContent = "Guardando...";
  btnAgregar.disabled = true;

  try {
    let imagen_url = "";
    const fileName = `${Date.now()}_${imagenFile.name}`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, imagenFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (storageError) throw storageError;

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    imagen_url = publicUrlData.publicUrl;
    const { error: dbError } = await supabase.from("herramientas").insert([
      {
        nombre: nombre,
        estado: estado,
        descripcion: descripcion,
        fecha: fecha,
        reemplazos: reemplazos,
        imagen_url: imagen_url,
      },
    ]);

    if (dbError) throw dbError;

    formHerramienta.reset();

    const successModal = new bootstrap.Modal(
      document.getElementById("successModal")
    );
    successModal.show();

    setTimeout(() => {
      successModal.hide();
      location.reload();
    }, 2500);
  } catch (error) {
    console.error("❌ Error al procesar herramienta:", error);
    alert(
      `❌ Hubo un error al guardar la herramienta. Detalles: ${error.message}`
    );
  } finally {
    btnSpinner.classList.add("d-none");
    btnText.textContent = "Agregar herramienta";
    btnAgregar.disabled = false;
  }
});

function mostrarSeccion(id) {
  const secciones = document.querySelectorAll(".seccion");
  secciones.forEach((sec) => (sec.style.display = "none"));
  const seccion = document.getElementById(id);
  if (seccion) seccion.style.display = "block";
}

document
  .getElementById("formEdicion")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    // 1. Obtener datos y preparar elementos
    const id = document.getElementById("modalId").value;
    const estado = document.getElementById("modalEstadoEditable").value;
    const descripcion = document.getElementById(
      "modalDescripcionEditable"
    ).value;
    const nuevaImagenFile =
      document.getElementById("modalNuevaImagen").files[0];

    // 💡 Lógica de reemplazos: Leemos el valor actual (del campo readonly) y le sumamos 1
    const reemplazosActuales = parseInt(
      document.getElementById("modalReemplazosEditable").value
    );
    // CRUCIAL: Sumar 1 al contador de reemplazos
    const nuevosReemplazos = reemplazosActuales + 1;

    // 2. 🔹 Mostrar spinner y bloquear botón
    const btnUpdate = document.querySelector(
      "#formEdicion button[type='submit']"
    );
    const btnUpdateText = document.getElementById("btnUpdateText");
    const btnUpdateSpinner = document.getElementById("btnUpdateSpinner");

    btnUpdateSpinner.classList.remove("d-none");
    btnUpdateText.textContent = "Actualizando...";
    btnUpdate.disabled = true;

    let imagen_url = document.getElementById("modalImagen").src;

    try {
      // 3. Subir la NUEVA imagen (si se seleccionó)
      if (nuevaImagenFile) {
        const fileName = `${Date.now()}_${id}_${nuevaImagenFile.name}`;

        // Subir al Storage
        const { error: storageError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, nuevaImagenFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (storageError) throw storageError;

        // Obtener la URL pública de la nueva imagen
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(fileName);

        imagen_url = publicUrlData.publicUrl;
      }

      // 4. Actualizar la información en la Base de Datos (UPDATE)
      const { error: dbError } = await supabase
        .from("herramientas")
        .update({
          estado: estado,
          descripcion: descripcion,
          reemplazos: nuevosReemplazos, // Envía el valor +1
          imagen_url: imagen_url,
        })
        .eq("id", id) // Cláusula para actualizar solo la herramienta correcta
        .select();

      if (dbError) throw dbError;

      // 5. Éxito: Ocultar modal, mostrar éxito y recargar
      const infoModal = bootstrap.Modal.getInstance(
        document.getElementById("infoModal")
      );
      infoModal.hide();

      const successModal = new bootstrap.Modal(
        document.getElementById("successModal")
      );
      successModal.show();

      setTimeout(() => {
        successModal.hide();
        location.reload(); // Recargar para ver los datos actualizados
      }, 1500);
    } catch (error) {
      console.error("❌ Error al actualizar herramienta:", error);
      alert(
        `❌ Hubo un error al actualizar la herramienta. Detalles: ${error.message}`
      );
    } finally {
      // 6. Restaurar botón
      btnUpdateSpinner.classList.add("d-none");
      btnUpdateText.textContent = "Actualizar Información y Reemplazar (+1)";
      btnUpdate.disabled = false;
    }
  });
// =================================================================
// 5. MANEJO DEL BOTÓN DE ELIMINAR (DELETE)
// =================================================================
// =================================================================
// 5. MANEJO DEL BOTÓN DE ELIMINAR (DELETE) - MODIFICADO CON MODALES
// =================================================================

// Referencias a los nuevos modales
const confirmDeleteModal = new bootstrap.Modal(
  document.getElementById("confirmDeleteModal")
);
const deleteSuccessModal = new bootstrap.Modal(
  document.getElementById("deleteSuccessModal")
);

let herramientaAEliminarId = null;
let herramientaAEliminarUrl = null;

// A) Listener para abrir el modal de confirmación (Botón "Eliminar Herramienta" en el Modal de Edición)
document.getElementById("btnEliminar").addEventListener("click", function () {
  // Capturamos el ID y la URL de la herramienta actualmente mostrada en el modal de edición
  herramientaAEliminarId = document.getElementById("modalId").value;
  herramientaAEliminarUrl = document.getElementById("modalImagen").src;

  // Ocultamos el modal de edición/información
  bootstrap.Modal.getInstance(document.getElementById("infoModal")).hide();

  // Mostramos el modal de confirmación
  confirmDeleteModal.show();
});

// B) Listener para ejecutar la eliminación (Botón "Sí, Eliminar" dentro del Modal de Confirmación)
document
  .getElementById("btnConfirmarEliminar")
  .addEventListener("click", async function () {
    // Ocultamos el modal de confirmación
    confirmDeleteModal.hide();

    const id = herramientaAEliminarId;
    const currentImageUrl = herramientaAEliminarUrl;

    // 2. 🔹 Mostrar spinner y bloquear botón (opcional, podrías usar solo el spinner del botón original, pero para simplificar lo omitiremos aquí para no complicar el flujo entre modales)

    try {
      // --- A. Extraer el nombre del archivo para borrarlo del Storage ---
      const urlSegments = currentImageUrl.split("/");
      const fileName = urlSegments[urlSegments.length - 1];

      if (fileName && fileName !== "placeholder.jpg") {
        const { error: storageError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([fileName]);

        if (storageError) {
          console.error(
            "❌ Error al borrar archivo del Storage, pero se intentará borrar el registro:",
            storageError.message
          );
        }
      }

      // --- B. Borrar la fila de la Base de Datos ---
      const { error: dbError } = await supabase
        .from("herramientas")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      // 3. Éxito: Mostrar modal de éxito y recargar
      deleteSuccessModal.show();

      // Limpiamos los datos temporales
      herramientaAEliminarId = null;
      herramientaAEliminarUrl = null;

      setTimeout(() => {
        deleteSuccessModal.hide();
        location.reload();
      }, 1500); // Mostrar modal de éxito por 1.5 segundos
    } catch (error) {
      console.error("❌ Error al eliminar herramienta:", error);
      alert(
        `❌ Hubo un error al eliminar la herramienta. Detalles: ${error.message}`
      );
    }
  });
