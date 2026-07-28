const buttons = document.querySelectorAll("[data-doc-language]");
const documents = document.querySelectorAll("[data-doc]");

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const language = button.dataset.docLanguage;
    buttons.forEach((item) => item.classList.toggle("active", item === button));
    documents.forEach((documentSection) => {
      const active = documentSection.dataset.doc === language;
      documentSection.hidden = !active;
      documentSection.classList.toggle("active", active);
    });
    document.documentElement.lang = language;
  });
});
