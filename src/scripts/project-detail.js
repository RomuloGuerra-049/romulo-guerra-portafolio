const buttons = document.querySelectorAll("[data-doc-language]");
const documents = document.querySelectorAll("[data-doc]");
const localizedHeader = {
  es: {
    title: "Portafolio profesional<br />y portal de clientes",
    kicker: "Caso de estudio · Full Stack",
    image: "Portafolio profesional de Romulo Guerra",
    page: "Portafolio y portal de clientes | Proyecto",
    back: "Volver al portafolio",
    navigation: "Idioma de la documentación",
  },
  en: {
    title: "Professional portfolio<br />and client portal",
    kicker: "Case study · Full Stack",
    image: "Romulo Guerra professional portfolio",
    page: "Portfolio and client portal | Project",
    back: "Back to portfolio",
    navigation: "Documentation language",
  },
  it: {
    title: "Portfolio professionale<br />e portale clienti",
    kicker: "Caso di studio · Full Stack",
    image: "Portfolio professionale di Romulo Guerra",
    page: "Portfolio e portale clienti | Progetto",
    back: "Torna al portfolio",
    navigation: "Lingua della documentazione",
  },
};

function activateLanguage(language) {
    localStorage.setItem("portfolio_language", language);
    buttons.forEach((item) => item.classList.toggle("active", item.dataset.docLanguage === language));
    documents.forEach((documentSection) => {
      const active = documentSection.dataset.doc === language;
      documentSection.hidden = !active;
      documentSection.classList.toggle("active", active);
    });
    const copy = localizedHeader[language];
    document.querySelector("[data-detail-title]").innerHTML = copy.title;
    document.querySelector("[data-detail-kicker]").textContent = copy.kicker;
    document.querySelector("[data-detail-image]").alt = copy.image;
    document.querySelector("[data-detail-back]").setAttribute("aria-label", copy.back);
    document.querySelector("[data-detail-nav]").setAttribute("aria-label", copy.navigation);
    document.title = copy.page;
    document.documentElement.lang = language;
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    activateLanguage(button.dataset.docLanguage);
  });
});

const savedLanguage = localStorage.getItem("portfolio_language");
if (["es", "en", "it"].includes(savedLanguage)) activateLanguage(savedLanguage);
