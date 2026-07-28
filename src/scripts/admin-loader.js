window.setTimeout(() => {
  const loading = document.querySelector("[data-loading]");

  if (!window.__adminModuleStarted && loading && !loading.hidden) {
    loading.classList.add("portal-loading--error");
    loading.querySelector("p").textContent =
      "No se pudo cargar el panel. Recarga la página y verifica que Go Live esté abierto desde la carpeta principal del proyecto.";
  }
}, 5000);
