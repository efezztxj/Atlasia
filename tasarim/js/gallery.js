/* Atlasia UI Kiti — vitrin filtresi
   Ekran kartlarını cihaz sınıfına göre süzer; kartlar canlı iframe olduğu
   için hiçbir önizleme yeniden yüklenmez, yalnız görünürlük değişir. */
(() => {
  "use strict";

  const buttons = [...document.querySelectorAll("[data-filter]")];
  const cards = [...document.querySelectorAll(".scard[data-kind]")];
  if (!buttons.length || !cards.length) return;

  const apply = (value) => {
    buttons.forEach((button) => {
      const active = button.getAttribute("data-filter") === value;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    cards.forEach((card) => {
      const kind = card.getAttribute("data-kind");
      card.classList.toggle("is-hidden", value !== "all" && kind !== value);
    });
  };

  buttons.forEach((button) => {
    button.setAttribute("type", "button");
    button.setAttribute("aria-pressed", button.classList.contains("is-active") ? "true" : "false");
    button.addEventListener("click", () => apply(button.getAttribute("data-filter")));
  });
})();
