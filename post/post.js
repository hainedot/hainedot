const passwordField = document.getElementById("password");
const status = document.getElementById("status");
const form = document.getElementById("post-form");
const button = document.getElementById("publish");
const saved = localStorage.getItem("hainedot-publish-password");
if (saved) passwordField.value = saved;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const endpoint = String(window.HAINEDOT_PUBLISH_URL || "").trim().replace(/\/$/, "");
  if (!endpoint) {
    status.textContent = "受付のURLが未設定です。";
    return;
  }

  const title = document.getElementById("title").value.trim();
  const body = document.getElementById("body").value.trim();
  const category = document.getElementById("category").value;
  const password = passwordField.value;
  const image = document.getElementById("image").files[0];

  if (!title || !body || !password) {
    status.textContent = "題名、本文、合言葉を入れてください。";
    return;
  }

  const now = new Date();
  const label = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now).replace(/\//g, ".");

  const data = new FormData();
  data.set("title", title);
  data.set("datetime", now.toISOString());
  data.set("displayDate", label + "　" + category);
  data.set("lines", JSON.stringify(body.split("\n")));
  data.set("password", password);
  if (image) data.set("image", image);
  else data.set("imageName", "none");

  button.disabled = true;
  status.textContent = "公開しています…";

  try {
    const response = await fetch(endpoint + "/publish", { method: "POST", body: data });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      status.textContent = result.error || "公開できませんでした。";
      return;
    }
    localStorage.setItem("hainedot-publish-password", password);
    status.textContent = "受け付けました。1〜2分後にエッセイのページへ出ます。";
    form.reset();
    passwordField.value = password;
  } catch {
    status.textContent = "通信できませんでした。しばらくしてからもう一度押してください。";
  } finally {
    button.disabled = false;
  }
});
