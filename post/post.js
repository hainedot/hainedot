(function () {
  "use strict";

  const STORAGE_KEY = "hainedot-post-draft";
  const PASSWORD_KEY = "hainedot-publish-password";

  const titleEl = document.getElementById("field-title");
  const dateEl = document.getElementById("field-date");
  const bodyEl = document.getElementById("field-body");
  const imageEl = document.getElementById("field-image");
  const imageFileEl = document.getElementById("field-image-file");
  const passwordEl = document.getElementById("field-password");
  const statusEl = document.getElementById("post-status");
  const publishBtn = document.getElementById("btn-publish");
  const publishedList = document.getElementById("published-list");
  const refreshBtn = document.getElementById("btn-refresh-list");

  const previewTitle = document.getElementById("preview-title");
  const previewDate = document.getElementById("preview-date");
  const previewBody = document.getElementById("preview-body");
  const previewPhoto = document.getElementById("preview-photo");

  let localPreviewUrl = "";
  let isPublishing = false;
  let isDeleting = false;
  let publishedPoems = [];

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

  function sanitizeFileName(name) {
    const safe = String(name || "poem.png")
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      .replace(/[^\w.\-]/g, "-")
      .replace(/-+/g, "-");
    return safe || "poem.png";
  }

  function getPublishUrl() {
    return String(window.HAINEDOT_PUBLISH_URL || "").trim().replace(/\/$/, "");
  }

  function getFormState() {
    const dateInfo = parseDate(dateEl.value);
    const imageName = (imageEl.value || "").trim().replace(/^\/+/, "");
    const safeImage = sanitizeFileName(
      imageName.replace(/\.\.\//g, "").replace(/^images\//, "") || "poem.png"
    );

    return {
      title: (titleEl.value || "無題").trim() || "無題",
      body: bodyEl.value || "",
      lines: getLines(bodyEl.value),
      image: safeImage,
      datetime: dateInfo.datetime,
      displayDate: formatDisplayDate(dateInfo.year, dateInfo.month, dateInfo.day),
      dateValue: dateEl.value || dateInfo.datetime,
    };
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
  }

  function saveDraft() {
    const state = getFormState();
    const draft = {
      title: titleEl.value,
      date: state.dateValue,
      body: bodyEl.value,
      image: imageEl.value,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      if (passwordEl.value) {
        localStorage.setItem(PASSWORD_KEY, passwordEl.value);
      }
      setStatus("この端末に下書きを保存しました");
    } catch (error) {
      setStatus("下書きの保存に失敗しました");
    }
  }

  function loadDraft() {
    try {
      const password = localStorage.getItem(PASSWORD_KEY);
      if (password) passwordEl.value = password;

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.title != null) titleEl.value = draft.title;
      if (draft.date) {
        dateEl.value = draft.date;
      } else if (draft.month) {
        dateEl.value = /^\d{4}-\d{2}$/.test(draft.month)
          ? draft.month + "-01"
          : draft.month;
      }
      if (draft.body != null) bodyEl.value = draft.body;
      if (draft.image != null) imageEl.value = draft.image;
      setStatus("保存していた下書きを読み込みました");
    } catch (error) {
      // ignore
    }
  }

  function clearForm() {
    titleEl.value = "";
    bodyEl.value = "";
    imageEl.value = "";
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
    imageEl.value = sanitizeFileName(file.name);
    updatePreview();
  }

  async function publish() {
    if (isPublishing) return;

    const publishUrl = getPublishUrl();
    if (!publishUrl) {
      setStatus("受付係の URL が未設定です。worker/SETUP.md を見て post/config.js を設定してください");
      return;
    }

    const state = getFormState();
    if (!state.lines.length) {
      setStatus("詩の本文を入力してください");
      return;
    }

    const password = passwordEl.value;
    if (!password) {
      setStatus("合言葉を入力してください");
      passwordEl.focus();
      return;
    }

    const file = imageFileEl.files && imageFileEl.files[0];
    if (!file && (!imageEl.value || imageEl.value === "poem.png")) {
      setStatus("写真を選ぶか、既存の写真ファイル名を入力してください");
      return;
    }

    isPublishing = true;
    publishBtn.disabled = true;
    setStatus("公開しています…");

    try {
      try {
        localStorage.setItem(PASSWORD_KEY, password);
      } catch (error) {
        // ignore
      }

      const form = new FormData();
      form.append("password", password);
      form.append("title", state.title);
      form.append("datetime", state.datetime);
      form.append("displayDate", state.displayDate);
      form.append("lines", JSON.stringify(state.lines));
      form.append("imageName", state.image);
      if (file) {
        form.append("image", file, file.name);
      }

      const response = await fetch(publishUrl, {
        method: "POST",
        body: form,
      });

      let data = {};
      try {
        data = await response.json();
      } catch (error) {
        data = {};
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "公開に失敗しました (" + response.status + ")");
      }

      if (data.image) {
        imageEl.value = data.image;
      }

      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        // ignore
      }

      setStatus("公開しました。1〜2分後に https://hainedot.com/ に反映されます");
      loadPublishedList();
    } catch (error) {
      setStatus(error.message || "公開に失敗しました");
    } finally {
      isPublishing = false;
      publishBtn.disabled = false;
      updatePreview();
    }
  }

  function renderPublishedList() {
    if (!publishedList) return;

    if (!publishedPoems.length) {
      publishedList.innerHTML =
        '<li class="post-published-empty">まだ公開されている詩はありません</li>';
      return;
    }

    publishedList.innerHTML = publishedPoems
      .map((poem, index) => {
        const title = escapeHtml(poem.title || "無題");
        const date = escapeHtml(poem.displayDate || poem.datetime || "");
        return (
          '<li class="post-published-item">' +
          '<div class="post-published-meta">' +
          '<p class="post-published-title">' +
          title +
          "</p>" +
          '<p class="post-published-date">' +
          date +
          "</p>" +
          "</div>" +
          '<button type="button" class="post-btn post-btn-danger" data-delete-index="' +
          index +
          '">削除</button>' +
          "</li>"
        );
      })
      .join("");
  }

  async function loadPublishedList() {
    if (!publishedList) return;
    publishedList.innerHTML =
      '<li class="post-published-empty">読み込み中…</li>';
    try {
      const response = await fetch("../data/poems.json?t=" + Date.now(), {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("一覧を読めませんでした");
      const data = await response.json();
      publishedPoems = Array.isArray(data.poems) ? data.poems : [];
      renderPublishedList();
    } catch (error) {
      publishedList.innerHTML =
        '<li class="post-published-empty">一覧の読み込みに失敗しました</li>';
    }
  }

  async function deletePoem(index) {
    if (isDeleting || isPublishing) return;

    const poem = publishedPoems[index];
    if (!poem) return;

    const password = passwordEl.value;
    if (!password) {
      setStatus("削除には合言葉が必要です");
      passwordEl.focus();
      return;
    }

    const ok = window.confirm(
      "「" + (poem.title || "無題") + "」を削除しますか？"
    );
    if (!ok) return;

    const publishUrl = getPublishUrl();
    if (!publishUrl) {
      setStatus("受付係の URL が未設定です");
      return;
    }

    isDeleting = true;
    setStatus("削除しています…");

    try {
      try {
        localStorage.setItem(PASSWORD_KEY, password);
      } catch (error) {
        // ignore
      }

      const form = new FormData();
      form.append("password", password);
      form.append("action", "delete");
      form.append("index", String(index));

      const response = await fetch(publishUrl + "/delete", {
        method: "POST",
        body: form,
      });

      let data = {};
      try {
        data = await response.json();
      } catch (error) {
        data = {};
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "削除に失敗しました (" + response.status + ")");
      }

      setStatus(
        "削除しました。1〜2分後に https://hainedot.com/ に反映されます"
      );
      await loadPublishedList();
    } catch (error) {
      setStatus(error.message || "削除に失敗しました");
    } finally {
      isDeleting = false;
    }
  }

  [titleEl, dateEl, bodyEl, imageEl].forEach((el) => {
    el.addEventListener("input", updatePreview);
    el.addEventListener("change", updatePreview);
  });

  imageFileEl.addEventListener("change", onImageFileChange);
  document.getElementById("btn-save").addEventListener("click", saveDraft);
  document.getElementById("btn-clear").addEventListener("click", clearForm);
  publishBtn.addEventListener("click", publish);
  if (refreshBtn) refreshBtn.addEventListener("click", loadPublishedList);
  if (publishedList) {
    publishedList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete-index]");
      if (!button) return;
      const index = Number(button.getAttribute("data-delete-index"));
      deletePoem(index);
    });
  }

  if (!dateEl.value) {
    dateEl.value = todayValue();
  }

  loadDraft();
  updatePreview();
  loadPublishedList();

  if (!getPublishUrl()) {
    setStatus("まだ受付係が未設定です。worker/SETUP.md を開いてセットアップしてください");
  }
})();
