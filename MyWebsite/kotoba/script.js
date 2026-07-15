(function () {
  "use strict";

  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const isHome = document.querySelector(".main-home") !== null;
  const homeBg = document.querySelector(".home-bg");
  const navLinks = document.querySelectorAll(".poem-nav-list a, .site-nav-list a");

  function setActiveNav(target) {
    navLinks.forEach((link) => {
      link.classList.remove("active");
      const href = link.getAttribute("href");
      if (href === target || href === currentPath) {
        link.classList.add("active");
      }
    });
  }

  function setSection(sectionId) {
    const target = "#" + sectionId;
    setActiveNav(target);

    if (homeBg) {
      homeBg.classList.toggle("is-vivid", sectionId === "top");
    }
  }

  if (isHome) {
    const sectionOrder = ["top", "profile", "about", "contact"];
    let currentSection = "";

    function scrollToSection(sectionId) {
      if (sectionId === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    }

    function updateSectionFromScroll() {
      const scrollPos = window.scrollY + window.innerHeight * 0.35;
      let activeId = "top";

      for (let i = sectionOrder.length - 1; i >= 0; i -= 1) {
        const section = document.getElementById(sectionOrder[i]);
        if (section && scrollPos >= section.offsetTop) {
          activeId = sectionOrder[i];
          break;
        }
      }

      if (activeId !== currentSection) {
        currentSection = activeId;
        setSection(activeId);
      }
    }

    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;

      link.addEventListener("click", (event) => {
        event.preventDefault();
        const sectionId = href.slice(1);
        setSection(sectionId);
        currentSection = sectionId;
        scrollToSection(sectionId);
        history.replaceState(null, "", href);
      });
    });

    let scrollTicking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(() => {
          updateSectionFromScroll();
          scrollTicking = false;
        });
      },
      { passive: true }
    );

    const initialHash = window.location.hash;
    if (initialHash) {
      const sectionId = initialHash.slice(1);
      setSection(sectionId);
      currentSection = sectionId;
      requestAnimationFrame(() => scrollToSection(sectionId));
    } else {
      setSection("top");
      currentSection = "top";
    }

    updateSectionFromScroll();
  } else {
    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (href === currentPath) {
        link.classList.add("active");
      } else if (href && href.startsWith("index.html#")) {
        const hash = href.slice("index.html".length);
        if (currentPath === "index.html" && window.location.hash === hash) {
          link.classList.add("active");
        }
      }
    });
  }

  const slideshow = document.querySelector(".slideshow");
  if (!slideshow) return;

  const slides = slideshow.querySelectorAll(".slide");
  const directions = ["left", "right", "top", "bottom"];
  const enterClasses = ["is-entering", "from-left", "from-right", "from-top", "from-bottom"];
  const exitClasses = ["is-exiting", "to-left", "to-right", "to-top", "to-bottom"];
  const cycleInterval = 6000;
  const exitDuration = 700;
  let timer = null;

  function randomDirection() {
    return directions[Math.floor(Math.random() * directions.length)];
  }

  function clearSlideClasses(slide) {
    slide.classList.remove(...enterClasses, ...exitClasses);
  }

  function enterSlides() {
    slides.forEach((slide) => {
      clearSlideClasses(slide);
      void slide.offsetWidth;
      slide.classList.add("is-entering", "from-" + randomDirection());
    });
  }

  function cycleSlides() {
    slides.forEach((slide) => {
      clearSlideClasses(slide);
      slide.classList.add("is-exiting", "to-" + randomDirection());
    });

    setTimeout(enterSlides, exitDuration);
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(cycleSlides, cycleInterval);
  }

  enterSlides();
  startTimer();
})();
