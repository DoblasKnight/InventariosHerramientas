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

const galeria = document.getElementById("galeria");
const loader = document.getElementById("loader");
const herramientas = [
  { nombre: "Alicates", ext: "jpg" },
  { nombre: "AtornilladorBosh", ext: "jpg" },
  { nombre: "Destornillador", ext: "jpg" },
  { nombre: "DestornilladorEstrella", ext: "jpg" },
  { nombre: "Martillo", ext: "jpeg" },
  { nombre: "Pelacables", ext: "png" },
  { nombre: "Formon", ext: "jpg" },
  { nombre: "Hombre Solo", ext: "jpg" },
  { nombre: "Nivel", ext: "jpg" },
];
const scriptURL_GET =
  "https://script.google.com/macros/s/AKfycbzfq7k_ykW3spLqr48cUjvqUhVJAmGfpFkG7qZ0ywAyam_cmr1cTXbLAPxM3NdlOSBe/exec";

let inventarioMap = {};
loader.style.display = "block";
galeria.innerHTML = "";

fetch(scriptURL_GET)
  .then((res) => res.json())
  .then((datos) => {
    inventarioMap = datos.reduce((acc, h) => {
      const key = (h.nombre || "").trim();
      acc[key] = h;
      return acc;
    }, {});

    herramientas.forEach(({ nombre, ext }) => {
      const card = document.createElement("div");
      card.className = "col-md-3 mb-4";
      card.innerHTML = `
        <div class="card h-100" style="cursor:pointer">
          <img src="Imagenes Herramientas/${nombre}.${ext}" class="card-img-top" alt="${nombre}">
          <div class="card-body">
            <h5 class="card-title">${nombre}</h5>
          </div>
        </div>
      `;
      galeria.appendChild(card);
      loader.style.display = "none";

      card.addEventListener("click", () => {
        const info = inventarioMap[nombre] || {};
        const modal = new bootstrap.Modal(document.getElementById("infoModal"));

        document.getElementById("modalNombre").innerText = nombre;
        document.getElementById(
          "modalImagen"
        ).src = `Imagenes Herramientas/${nombre}.${ext}`;
        document.getElementById("modalImagen").alt = nombre;

        document.getElementById("modalEstado").innerText =
          info.estado || "No definido";
        document.getElementById("modalDescripcion").innerText =
          info.descripcion || "Sin descripción";
        document.getElementById("modalFecha").innerText = formatearFecha(
          info.fecha
        );
        document.getElementById("modalReemplazos").innerText =
          info.reemplazos || "Ninguno";

        modal.show();
      });

      galeria.appendChild(card);
    });
  })
  .catch((err) => console.error("Error cargando inventario:", err));

function mostrarSeccion(id) {
  const secciones = document.querySelectorAll(".seccion");
  secciones.forEach((sec) => (sec.style.display = "none"));
  const seccion = document.getElementById(id);
  if (seccion) seccion.style.display = "block";
}

document
  .getElementById("formHerramienta")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const nombre = document.getElementById("nombre").value;
    const estado = document.getElementById("estado").value;
    const descripcion = document.getElementById("descripcion").value;
    const fecha = document.getElementById("fecha").value;
    const reemplazos = document.getElementById("reemplazos").value;

    const scriptURL =
      "https://script.google.com/macros/s/AKfycbzfq7k_ykW3spLqr48cUjvqUhVJAmGfpFkG7qZ0ywAyam_cmr1cTXbLAPxM3NdlOSBe/exec";

    const params = new URLSearchParams({
      nombre,
      estado,
      descripcion,
      fecha,
      reemplazos,
    });

    // 🔹 Mostrar spinner y bloquear botón
    document.getElementById("btnSpinner").classList.remove("d-none");
    document.getElementById("btnText").textContent = "Guardando...";
    document.getElementById("btnAgregar").disabled = true;

    fetch(`${scriptURL}?${params.toString()}`)
      .then((response) => response.text())
      .then(() => {
        //  Limpiar formulario
        document.getElementById("formHerramienta").reset();

        //  Mostrar modal de éxito
        const successModal = new bootstrap.Modal(
          document.getElementById("successModal")
        );
        successModal.show();
        //  Restaurar botón y ocultar modal después de 2.5s
        setTimeout(() => {
          document.getElementById("btnSpinner").classList.add("d-none");
          document.getElementById("btnText").textContent =
            "Agregar herramienta";
          document.getElementById("btnAgregar").disabled = false;

          successModal.hide();
          location.reload();
        }, 2500);
      })
      .catch((error) => {
        console.error("Error al agregar herramienta:", error);

        alert("❌ Hubo un error al guardar la herramienta.");

        // 🔹 Restaurar botón
        document.getElementById("btnSpinner").classList.add("d-none");
        document.getElementById("btnText").textContent = "Agregar herramienta";
        document.getElementById("btnAgregar").disabled = false;
      });
  });
