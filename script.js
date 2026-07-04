const PortfolioApp = (() => {
  const root = document.documentElement;
  const body = document.body;
  const storageKey = "systems-portfolio-theme";

  const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    localStorage.setItem(storageKey, theme);
  };

  const initTheme = () => {
    const saved = localStorage.getItem(storageKey);
    applyTheme(saved || (prefersDark() ? "dark" : "light"));

    document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
    });
  };

  const initPreloader = () => {
    body.classList.add("is-loading");
    const preloader = document.querySelector("[data-preloader]");
    const hide = () => {
      preloader?.classList.add("is-hidden");
      body.classList.remove("is-loading");
    };

    window.addEventListener("load", () => {
      window.setTimeout(hide, 520);
    });

    window.setTimeout(hide, 1600);
  };

  const initHeader = () => {
    const header = document.querySelector("[data-header]");
    if (!header) return;

    const syncHeader = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 18);
    };

    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });
  };

  const initMagneticButtons = () => {
    const buttons = document.querySelectorAll(".magnetic");
    buttons.forEach((button) => {
      button.addEventListener("pointermove", (event) => {
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        button.style.transform = `translate(${x * 0.08}px, ${y * 0.12}px)`;
      });

      button.addEventListener("pointerleave", () => {
        button.style.transform = "";
      });
    });
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

  const initSlider = () => {
    const slider = document.querySelector("[data-slider]");
    if (!slider) return;

    const track = slider.querySelector("[data-slider-track]");
    const prev = slider.querySelector("[data-prev]");
    const next = slider.querySelector("[data-next]");
    const cards = [...track.children];
    let index = 0;
    let dragStart = 0;
    let dragDelta = 0;
    let dragging = false;

    const getStep = () => {
      const firstCard = cards[0];
      const style = window.getComputedStyle(track);
      const gap = Number.parseFloat(style.columnGap || style.gap || 0);
      return firstCard.getBoundingClientRect().width + gap;
    };

    const getMaxIndex = () => {
      const viewportWidth = slider.querySelector(".slider-viewport").getBoundingClientRect().width;
      const visibleCards = Math.max(1, Math.floor(viewportWidth / getStep()));
      return Math.max(0, cards.length - visibleCards);
    };

    const update = (withDelta = 0) => {
      index = clamp(index, 0, getMaxIndex());
      const offset = index * getStep();
      track.style.transform = `translate3d(${withDelta - offset}px, 0, 0)`;
      prev.disabled = index === 0;
      next.disabled = index === getMaxIndex();
      prev.style.opacity = prev.disabled ? "0.48" : "1";
      next.style.opacity = next.disabled ? "0.48" : "1";
    };

    const go = (direction) => {
      index += direction;
      update();
    };

    prev.addEventListener("click", () => go(-1));
    next.addEventListener("click", () => go(1));

    slider.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    });
    slider.tabIndex = 0;

    track.addEventListener("pointerdown", (event) => {
      dragging = true;
      dragStart = event.clientX;
      dragDelta = 0;
      track.setPointerCapture(event.pointerId);
      track.style.transition = "none";
    });

    track.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      dragDelta = event.clientX - dragStart;
      update(dragDelta);
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      track.style.transition = "";
      if (Math.abs(dragDelta) > 60) {
        index += dragDelta < 0 ? 1 : -1;
      }
      dragDelta = 0;
      update();
    };

    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    window.addEventListener("resize", update);
    update();
  };

  /* ========== SISTEMA DE ARCHIVOS (carpetas + visor PDF) ========== */
  const scrambleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%^*_+-=[]{}|;<>?";

  const scrambleText = (el) => {
    const finalText = el.getAttribute("data-text");
    if (!finalText) return;

    let iteration = 0;
    window.clearInterval(el._scrambleInterval);

    el._scrambleInterval = window.setInterval(() => {
      el.innerText = finalText
        .split("")
        .map((char, index) => (index < iteration ? finalText[index] : scrambleChars[Math.floor(Math.random() * scrambleChars.length)]))
        .join("");

      if (iteration >= finalText.length) window.clearInterval(el._scrambleInterval);
      iteration += 1 / 2.5;
    }, 30);
  };

  const initFileSystem = () => {
    const section = document.querySelector(".files");
    if (!section) return;

    const folders = section.querySelectorAll("[data-folder]");
    const workLists = section.querySelectorAll("[data-work-list]");
    const exitBtn = section.querySelector("[data-folder-exit]");
    const viewer = document.getElementById("file-viewer");
    const viewerIframe = document.getElementById("viewer-iframe");
    const viewerTitle = document.getElementById("viewer-title");
    let currentSrc = "";

    section.querySelectorAll(".scramble-text").forEach((el) => scrambleText(el));

    const closeViewer = () => {
      currentSrc = "";
      viewer.classList.remove("is-active");
      window.setTimeout(() => {
        viewerIframe.src = "";
        section.querySelectorAll(".work-item").forEach((item) => item.classList.remove("is-active"));
      }, 400);
    };

    const openDocument = (title, src, itemEl) => {
      section.querySelectorAll(".work-item").forEach((item) => item.classList.remove("is-active"));
      itemEl.classList.add("is-active");
      currentSrc = src;

      viewer.classList.remove("is-active");
      window.setTimeout(() => {
        viewerIframe.src = src;
        viewerTitle.setAttribute("data-text", title.toUpperCase());
        viewer.classList.add("is-active");
        scrambleText(viewerTitle);
        viewer.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 250);
    };

    const closeFolder = () => {
      folders.forEach((folder) => {
        folder.classList.remove("is-active");
        folder.setAttribute("aria-selected", "false");
      });
      workLists.forEach((list) => list.classList.remove("is-visible"));
      exitBtn.classList.remove("is-visible");
      closeViewer();
    };

    const openFolder = (folder) => {
      const key = folder.dataset.folder;

      folders.forEach((f) => {
        f.classList.remove("is-active");
        f.setAttribute("aria-selected", "false");
      });
      folder.classList.add("is-active");
      folder.setAttribute("aria-selected", "true");

      workLists.forEach((list) => list.classList.remove("is-visible"));
      closeViewer();

      const targetList = section.querySelector(`[data-work-list="${key}"]`);
      if (targetList) {
        targetList.classList.add("is-visible");
        targetList.querySelectorAll(".scramble-text").forEach((el) => scrambleText(el));
      }

      exitBtn.classList.add("is-visible");
    };

    folders.forEach((folder) => {
      folder.addEventListener("click", () => openFolder(folder));
      folder.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openFolder(folder);
        }
      });
      folder.addEventListener("mouseenter", () => {
        scrambleText(folder.querySelector(".folder__name"));
      });
    });

    exitBtn.addEventListener("click", closeFolder);

    section.querySelectorAll(".work-item").forEach((item) => {
      item.addEventListener("click", () => {
        openDocument(item.dataset.title || "documento", item.dataset.src || "", item);
      });
      item.addEventListener("mouseenter", () => {
        scrambleText(item.querySelector(".scramble-text"));
      });
    });

    section.querySelector("[data-viewer-close]")?.addEventListener("click", closeViewer);

    section.querySelector("[data-viewer-download]")?.addEventListener("click", () => {
      if (!currentSrc) return;
      const link = document.createElement("a");
      link.href = currentSrc;
      link.download = currentSrc.split("/").pop() || "documento.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    section.querySelector("[data-viewer-open]")?.addEventListener("click", () => {
      if (!currentSrc) return;
      window.open(currentSrc, "_blank");
    });
  };

  const init = () => {
    initPreloader();
    initTheme();
    initHeader();
    initMagneticButtons();
    initSlider();
    initFileSystem();
  };

  return { init };
})();

PortfolioApp.init();
