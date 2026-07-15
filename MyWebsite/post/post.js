(function () {
  "use strict";

  const STORAGE_KEY = "hainedot-post-draft";

  const titleEl = document.getElementById("field-title");
  const dateEl = document.getElementById("field-date");
  const bodyEl = document.getElementById("field-body");
  const imageEl = document.getElementById("field-image");
  const imageFileEl = document.getElementById("field-image-file");
  const indexEl = document.getElementById("field-index");
  const statusEl = document.getElementById("post-status");
  const codeEl = document.getElementById("output-code");

  const previewTitle = document.getElementById("preview-title");
  const previewDate = document.getElementById("preview-date");
  const previewBody = document.getElementById("preview-body");
  const previewPhoto = document.getElementById("preview-photo");

  let localPreviewUrl = "";

  const KANJI_DIGITS = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const MONTH_KANJI = [
    "",
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月",
  ];

  function setStatus(message) {
    statusEl.textContent = message || "";
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function yearToKanji(year) {
    return String(year)
      .split("")
      .map((d) => KANJI_DIGITS[Number(d)] || d)
      .join("");
  }

  function dayToKanji(day) {
    if (day === 20) return "二十日";
    if (day === 30) return "三十日";
    if (day < 10) return KANJI_DIGITS[day] + "日";
    if (day < 20) return "十" + (day === 10 ? "" : KANJI_DIGITS[day - 10]) + "日";
    if (day < 30) return "二十" + KANJI_DIGITS[day - 20] + "日";
    return "三十" + KANJI_DIGITS[day - 30] + "日";
  }

  function todayValue() {
    const now = new Date();
    return (
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0")
    );
  }

  function parseDate(value) {
    let raw = value || "";
    // 旧下書き（年月のみ）から引き継ぐ
    if (/^\d{4}-\d{2}$/.test(raw)) {
      raw = raw + "-01";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      raw = todayValue();
    }
    const parts = raw.split("-");
    return {
      year: Number(parts[0]),
      month: Number(parts[1]),
      day: Number(parts[2]),
      datetime: raw,
    };
  }

  function formatDisplayDate(year, month, day) {
    return (
      yearToKanji(year) +
      "年" +
      (MONTH_KANJI[month] || month + "月") +
      dayToKanji(day)
    );
  }

  function getLines(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function getFormState() {
    const dateInfo = parseDate(dateEl.value);
    const imageName = (imageEl.value || "poem-01.png").trim().replace(/^\/+/, "");
    const safeImage = imageName.replace(/\.\.\//g, "").replace(/^images\//, "");

    return {
      title: (titleEl.value || "無題").trim() || "無題",
      body: bodyEl.value || "",
      lines: getLines(bodyEl.value),
      image: safeImage,
      index: Math.max(0, Number(indexEl.value) || 0),
      datetime: dateInfo.datetime,
      displayDate: formatDisplayDate(dateInfo.year, dateInfo.month, dateInfo.day),
      dateValue: dateEl.value || dateInfo.datetime,
    };
  }

  function buildHtml(state) {
    const lines =
      state.lines.length > 0
        ? state.lines
        : ["（ここに詩の行が入ります）"];
    const bodyHtml = lines
      .map((line) => "                  <p>" + escapeHtml(line) + "</p>")
      .join("\n");

    return (
      '            <article class="poem-card" data-index="' +
      state.index +
      '">\n' +
      '              <img class="finder-photo" src="images/' +
      escapeHtml(state.image) +
      '" alt="">\n' +
      '              <div class="poem-content">\n' +
      '                <h1 class="poem-title">' +
      escapeHtml(state.title) +
      "</h1>\n" +
      '                <time class="poem-date" datetime="' +
      escapeHtml(state.datetime) +
      '">' +
      escapeHtml(state.displayDate) +
      "</time>\n" +
      '                <div class="poem-body">\n' +
      bodyHtml +
      "\n" +
      "                </div>\n" +
      "              </div>\n" +
      "            </article>"
    );
  }

  function updatePreview() {
    const state = getFormState();
    previewTitle.textContent = state.title;
    previewDate.textContent = state.displayDate;
    previewDate.setAttribute("datetime", state.datetime);

    const lines = state.lines.length > 0 ? state.lines : ["ここに詩が表示されます"];
    previewBody.innerHTML = lines
      .map((line) => "<p>" + escapeHtml(line) + "</p>")
      .join("");

    if (localPreviewUrl) {
      previewPhoto.src = localPreviewUrl;
    } else {
      previewPhoto.src = "../images/" + state.image;
    }

    codeEl.textContent = buildHtml(state);
  }

  function saveDraft() {
    const state = getFormState();
    const draft = {
      title: titleEl.value,
      date: state.dateValue,
      body: bodyEl.value,
      image: imageEl.value,
      index: indexEl.value,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setStatus("この端末に下書きを保存しました");
    } catch (error) {
      setStatus("下書きの保存に失敗しました");
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.title != null) titleEl.value = draft.title;
      if (draft.date) {
        dateEl.value = draft.date;
      } else if (draft.month) {
        // 旧下書き（年月のみ）対応
        dateEl.value = /^\d{4}-\d{2}$/.test(draft.month)
          ? draft.month + "-01"
          : draft.month;
      }
      if (draft.body != null) bodyEl.value = draft.body;
      if (draft.image != null) imageEl.value = draft.image;
      if (draft.index != null) indexEl.value = draft.index;
      setStatus("保存していた下書きを読み込みました");
    } catch (error) {
      // ignore broken drafts
    }
  }

  function clearForm() {
    titleEl.value = "";
    bodyEl.value = "";
    imageEl.value = "";
    indexEl.value = "0";
    imageFileEl.value = "";
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      localPreviewUrl = "";
    }
    dateEl.value = todayValue();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // ignore
    }
    updatePreview();
    setStatus("入力をクリアしました");
  }

  async function copyHtml() {
    updatePreview();
    const html = codeEl.textContent;
    try {
      await navigator.clipboard.writeText(html);
      setStatus("HTMLをコピーしました。index.html の profile-card の直前に貼ってください");
    } catch (error) {
      codeEl.focus();
      const range = document.createRange();
      range.selectNodeContents(codeEl);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      setStatus("自動コピーできないので、表示中のHTMLを手動でコピーしてください");
    }
  }

  function onImageFileChange() {
    const file = imageFileEl.files && imageFileEl.files[0];
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      localPreviewUrl = "";
    }
    if (!file) {
      updatePreview();
      return;
    }
    localPreviewUrl = URL.createObjectURL(file);
    if (!imageEl.value) {
      imageEl.value = file.name;
    }
    updatePreview();
  }

  [titleEl, dateEl, bodyEl, imageEl, indexEl].forEach((el) => {
    el.addEventListener("input", updatePreview);
    el.addEventListener("change", updatePreview);
  });

  imageFileEl.addEventListener("change", onImageFileChange);
  document.getElementById("btn-save").addEventListener("click", saveDraft);
  document.getElementById("btn-clear").addEventListener("click", clearForm);
  document.getElementById("btn-copy").addEventListener("click", copyHtml);
  document.getElementById("btn-copy-code").addEventListener("click", copyHtml);

  if (!dateEl.value) {
    dateEl.value = todayValue();
  }

  loadDraft();
  updatePreview();
})();
