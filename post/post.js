(function () {
  "use strict";

  const STORAGE_KEY = "hainedot-post-draft";
  const TOKEN_KEY = "hainedot-github-token";
  const REPO_OWNER = "hainedot";
  const REPO_NAME = "hainedot";
  const BRANCH = "main";
  const POEMS_PATH = "data/poems.json";
  const API_BASE =
    "https://api.github.com/repos/" + REPO_OWNER + "/" + REPO_NAME + "/contents/";

  const titleEl = document.getElementById("field-title");
  const dateEl = document.getElementById("field-date");
  const bodyEl = document.getElementById("field-body");
  const imageEl = document.getElementById("field-image");
  const imageFileEl = document.getElementById("field-image-file");
  const tokenEl = document.getElementById("field-token");
  const statusEl = document.getElementById("post-status");
  const publishBtn = document.getElementById("btn-publish");

  const previewTitle = document.getElementById("preview-title");
  const previewDate = document.getElementById("preview-date");
  const previewBody = document.getElementById("preview-body");
  const previewPhoto = document.getElementById("preview-photo");

  let localPreviewUrl = "";
  let isPublishing = false;

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
      if (tokenEl.value.trim()) {
        localStorage.setItem(TOKEN_KEY, tokenEl.value.trim());
      }
      setStatus("この端末に下書きを保存しました");
    } catch (error) {
      setStatus("下書きの保存に失敗しました");
    }
  }

  function loadDraft() {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) tokenEl.value = token;

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

  function getToken() {
    const token = tokenEl.value.trim();
    if (token) {
      try {
        localStorage.setItem(TOKEN_KEY, token);
      } catch (error) {
        // ignore
      }
    }
    return token;
  }

  function utf8ToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  function base64ToUtf8(b64) {
    const binary = atob(String(b64 || "").replace(/\n/g, ""));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  async function githubRequest(path, options) {
    const token = getToken();
    if (!token) {
      throw new Error("GitHub トークンを入力してください");
    }

    const response = await fetch(API_BASE + path, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options && options.headers ? options.headers : {}),
      },
    });

    if (response.status === 404 && (!options || options.method === "GET")) {
      return null;
    }

    if (!response.ok) {
      let detail = "";
      try {
        const err = await response.json();
        detail = err.message || "";
      } catch (error) {
        detail = "";
      }
      throw new Error(
        "GitHub API エラー (" + response.status + ")" + (detail ? ": " + detail : "")
      );
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async function getPoemsFile() {
    return githubRequest(POEMS_PATH + "?ref=" + encodeURIComponent(BRANCH), {
      method: "GET",
    });
  }

  async function putFile(path, contentBase64, message, sha) {
    const body = {
      message: message,
      content: contentBase64,
      branch: BRANCH,
    };
    if (sha) body.sha = sha;

    return githubRequest(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function ensureUniqueImageName(desiredName) {
    let name = sanitizeFileName(desiredName);
    const extMatch = name.match(/(\.[^.]+)$/);
    const ext = extMatch ? extMatch[1] : ".png";
    const base = extMatch ? name.slice(0, -ext.length) : name;
    let attempt = name;
    let n = 1;

    while (n < 50) {
      const existing = await githubRequest(
        "images/" + encodeURIComponent(attempt) + "?ref=" + encodeURIComponent(BRANCH),
        { method: "GET" }
      );
      if (!existing) return attempt;
      attempt = base + "-" + n + ext;
      n += 1;
    }
    return base + "-" + Date.now() + ext;
  }

  async function publish() {
    if (isPublishing) return;

    const state = getFormState();
    if (!state.lines.length) {
      setStatus("詩の本文を入力してください");
      return;
    }
    if (!getToken()) {
      setStatus("GitHub トークンを入力してください（初回だけ）");
      tokenEl.focus();
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
      let imageName = state.image;

      if (file) {
        setStatus("写真をアップロードしています…");
        imageName = await ensureUniqueImageName(file.name || state.image);
        const buffer = await file.arrayBuffer();
        await putFile(
          "images/" + imageName,
          arrayBufferToBase64(buffer),
          "Add poem image: " + imageName
        );
        imageEl.value = imageName;
      }

      setStatus("詩データを更新しています…");
      const poemsFile = await getPoemsFile();
      let poemsData = { poems: [] };
      let sha = null;

      if (poemsFile && poemsFile.content) {
        sha = poemsFile.sha;
        poemsData = JSON.parse(base64ToUtf8(poemsFile.content));
        if (!Array.isArray(poemsData.poems)) poemsData.poems = [];
      }

      poemsData.poems.push({
        title: state.title,
        datetime: state.datetime,
        displayDate: state.displayDate,
        image: imageName,
        lines: state.lines,
      });

      const jsonText = JSON.stringify(poemsData, null, 2) + "\n";
      await putFile(
        POEMS_PATH,
        utf8ToBase64(jsonText),
        "Publish poem: " + state.title,
        sha
      );

      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        // ignore
      }

      setStatus(
        "公開しました。1〜2分後に https://hainedot.com/ に反映されます"
      );
    } catch (error) {
      setStatus(error.message || "公開に失敗しました");
    } finally {
      isPublishing = false;
      publishBtn.disabled = false;
      updatePreview();
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

  if (!dateEl.value) {
    dateEl.value = todayValue();
  }

  loadDraft();
  updatePreview();
})();
