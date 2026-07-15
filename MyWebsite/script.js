(function () {
  "use strict";

  const opening = document.getElementById("opening");
  const openingEnter = document.getElementById("opening-enter");
  let openingDone = false;

  function endOpening() {
    if (openingDone) return;
    openingDone = true;
    playShutterSound();
    document.body.classList.remove("is-opening");
    document.body.classList.add("is-ready");
    opening.classList.add("is-hidden");
    setTimeout(() => opening.remove(), 1400);
  }

  openingEnter.addEventListener("click", endOpening);

  const poems = document.querySelectorAll(".poem-card");
  const dotsNav = document.getElementById("poem-dots");
  const counter = document.getElementById("hud-counter");
  const hudHint = document.getElementById("hud-hint");
  const shutterBtn = document.getElementById("shutter-btn");
  const shutterCurtain = document.getElementById("shutter-curtain");
  const finder = document.getElementById("finder");
  const glass = document.querySelector(".finder-glass");
  const profileCard = document.getElementById("profile-card");
  const profileBtn = document.getElementById("profile-btn");
  const total = poems.length;
  let current = 0;
  let isProfileView = false;
  let isAnimating = false;
  let scrollCooldown = false;
  let shutterAudio = null;

  function playShutterSound() {
    if (!shutterAudio) {
      shutterAudio = new Audio("sounds/shutter.wav");
      shutterAudio.preload = "auto";
    }
    shutterAudio.currentTime = 0;
    shutterAudio.play().catch(() => {});
  }

  poems.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", (index + 1) + "番目の詩");
    if (index === 0) dot.classList.add("is-active");
    dot.addEventListener("click", () => goTo(index));
    dotsNav.appendChild(dot);
  });

  const dots = dotsNav.querySelectorAll("button");
  const archive = document.getElementById("date-archive");

  function setArchiveActive(index) {
    document.querySelectorAll(".archive-item").forEach((btn) => {
      btn.classList.toggle("is-active", index >= 0 && Number(btn.dataset.index) === index);
    });
  }

  function setProfileNameActive(active) {
    profileBtn.classList.toggle("is-active", active);
  }

  function hideProfile() {
    profileCard.classList.remove("is-active");
    isProfileView = false;
    setProfileNameActive(false);
  }

  function showProfile() {
    poems.forEach((card) => card.classList.remove("is-active", "is-leaving"));
    dots.forEach((dot) => dot.classList.remove("is-active"));
    profileCard.classList.add("is-active");
    isProfileView = true;
    setProfileNameActive(true);
    counter.textContent = "PRO";
    setArchiveActive(-1);
  }

  function buildArchive() {
    const groups = {};

    poems.forEach((card, index) => {
      const timeEl = card.querySelector(".poem-date");
      const titleEl = card.querySelector(".poem-title");
      const datetime = timeEl.getAttribute("datetime") || "";
      const parts = datetime.split("-");
      const year = parts[0] || "0000";
      const month = parts[1] || "";
      const day = parts[2] || "";

      if (!groups[year]) groups[year] = [];
      groups[year].push({
        index,
        month,
        day,
        title: titleEl.textContent,
      });
    });

    Object.keys(groups)
      .sort()
      .reverse()
      .forEach((year) => {
        const yearEl = document.createElement("div");
        yearEl.className = "archive-year";
        yearEl.textContent = year;
        archive.appendChild(yearEl);

        const list = document.createElement("ul");
        list.className = "archive-list";

        groups[year].forEach((entry) => {
          const li = document.createElement("li");
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "archive-item";
          btn.dataset.index = entry.index;
          btn.setAttribute("aria-label", entry.title);

          const dateLine = document.createElement("span");
          dateLine.className = "archive-date";
          dateLine.textContent = entry.month + (entry.day ? "." + entry.day : "");

          btn.appendChild(dateLine);

          if (entry.day) {
            const dayLine = document.createElement("span");
            dayLine.className = "archive-day";
            dayLine.textContent = entry.day;
            btn.appendChild(dayLine);
          }

          btn.addEventListener("click", () => {
            goToWithShutter(entry.index);
          });

          li.appendChild(btn);
          list.appendChild(li);
        });

        archive.appendChild(list);
      });
  }

  buildArchive();

  function randomIndex(exclude) {
    if (total <= 1) return 0;
    let index;
    do {
      index = Math.floor(Math.random() * total);
    } while (index === exclude);
    return index;
  }

  function updateEmptyState() {
    if (total > 0) return;
    counter.textContent = "—";
    dotsNav.hidden = true;
    if (hudHint) {
      hudHint.textContent = "hainedot でプロフィール";
    }
  }

  function updateCounter(index) {
    if (total === 0) {
      counter.textContent = "—";
      return;
    }
    const num = String(index + 1).padStart(3, "0");
    const max = String(total).padStart(3, "0");
    counter.textContent = num + " / " + max;
  }

  function swapPoem(index) {
    hideProfile();
    if (total === 0) {
      updateCounter(-1);
      setArchiveActive(-1);
      return;
    }
    poems[current].classList.remove("is-active", "is-leaving");
    dots[current].classList.remove("is-active");
    current = index;
    poems[current].classList.add("is-active");
    dots[current].classList.add("is-active");
    updateCounter(current);
    setArchiveActive(current);
  }

  function goTo(index) {
    if (!openingDone || isAnimating || total === 0) return;
    if (!isProfileView && index === current) return;
    if (isProfileView) {
      goToWithShutter(index);
      return;
    }
    isAnimating = true;

    const prev = poems[current];
    const next = poems[index];

    prev.classList.remove("is-active");
    prev.classList.add("is-leaving");

    dots[current].classList.remove("is-active");
    current = index;
    dots[current].classList.add("is-active");
    updateCounter(current);
    setArchiveActive(current);

    setTimeout(() => {
      prev.classList.remove("is-leaving");
      next.classList.add("is-active");
      isAnimating = false;
    }, 400);
  }

  function next() {
    goTo(randomIndex(current));
  }

  function prev() {
    goTo(randomIndex(current));
  }

  function goToWithShutter(index) {
    if (!openingDone || isAnimating) return;
    if (total === 0) {
      if (isProfileView) return;
      showProfileWithShutter();
      return;
    }
    if (!isProfileView && index === current) return;
    isAnimating = true;

    shutterBtn.classList.add("is-firing");
    playShutterSound();

    shutterCurtain.classList.remove("is-opening");
    shutterCurtain.classList.add("is-closing");

    setTimeout(() => {
      swapPoem(index);

      shutterCurtain.classList.remove("is-closing");
      shutterCurtain.classList.add("is-opening");

      setTimeout(() => {
        shutterCurtain.classList.remove("is-opening");
        shutterBtn.classList.remove("is-firing");
        isAnimating = false;
      }, 200);
    }, 150);
  }

  function showProfileWithShutter() {
    if (!openingDone || isAnimating || isProfileView) return;
    isAnimating = true;

    shutterBtn.classList.add("is-firing");
    playShutterSound();

    shutterCurtain.classList.remove("is-opening");
    shutterCurtain.classList.add("is-closing");

    setTimeout(() => {
      showProfile();

      shutterCurtain.classList.remove("is-closing");
      shutterCurtain.classList.add("is-opening");

      setTimeout(() => {
        shutterCurtain.classList.remove("is-opening");
        shutterBtn.classList.remove("is-firing");
        isAnimating = false;
      }, 200);
    }, 150);
  }

  profileBtn.addEventListener("click", showProfileWithShutter);

  function fireShutter() {
    if (total === 0) {
      if (isProfileView) {
        playShutterSound();
        return;
      }
      showProfileWithShutter();
      return;
    }
    goToWithShutter(randomIndex(current));
  }

  function toggleProfileOrPoem() {
    if (total === 0) {
      if (isProfileView) return;
      showProfileWithShutter();
      return;
    }
    goTo(randomIndex(current));
  }

  shutterBtn.addEventListener("click", fireShutter);

  window.addEventListener(
    "wheel",
    (event) => {
      if (!openingDone || scrollCooldown || isAnimating) return;
      scrollCooldown = true;
      if (event.deltaY > 0) toggleProfileOrPoem();
      else toggleProfileOrPoem();
      setTimeout(() => {
        scrollCooldown = false;
      }, 600);
    },
    { passive: true }
  );

  window.addEventListener("keydown", (event) => {
    if (!openingDone) {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        endOpening();
      }
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      fireShutter();
      return;
    }
    if (isAnimating) return;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      toggleProfileOrPoem();
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      toggleProfileOrPoem();
    }
  });

  finder.addEventListener("mousemove", (event) => {
    const rect = finder.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    glass.style.transform =
      "translate(" + (x * 6) + "px, " + (y * 4) + "px)";
    finder.classList.add("is-aiming");
  });

  finder.addEventListener("mouseleave", () => {
    glass.style.transform = "translate(0, 0)";
    finder.classList.remove("is-aiming");
  });

  if (total > 0) {
    if (hudHint) {
      hudHint.textContent = "スクロールまたはシャッターで切り替え";
    }
    poems[0].classList.remove("is-active");
    dots[0].classList.remove("is-active");
    current = Math.floor(Math.random() * total);
    poems[current].classList.add("is-active");
    dots[current].classList.add("is-active");
    updateCounter(current);
    setArchiveActive(current);
  } else {
    updateEmptyState();
  }
})();
