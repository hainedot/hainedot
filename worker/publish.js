/**
 * hainedot 投稿受付係（Cloudflare Worker）
 *
 * 必要なシークレット:
 * - GITHUB_TOKEN
 * - PUBLISH_PASSWORD
 *
 * POST / または /publish … 公開
 * POST /delete … 削除（index）
 */

const ALLOWED_ORIGINS = [
  "https://hainedot.com",
  "https://www.hainedot.com",
  "https://hainedot.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

const PROTECTED_IMAGES = new Set([
  "profile.png",
  "slide-01.png",
  "slide-02.png",
  "slide-03.png",
]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return json({ error: "POST only" }, 405, cors);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    try {
      const form = await request.formData();
      const password = String(form.get("password") || "");
      const expected = String(env.PUBLISH_PASSWORD || "");

      if (!expected || password !== expected) {
        return json({ error: "合言葉が違います" }, 401, cors);
      }

      const token = env.GITHUB_TOKEN;
      if (!token) {
        return json({ error: "サーバー側の GitHub トークンが未設定です" }, 500, cors);
      }

      const owner = env.GITHUB_OWNER || "hainedot";
      const repo = env.GITHUB_REPO || "hainedot";
      const branch = env.GITHUB_BRANCH || "main";
      const action = String(form.get("action") || "").toLowerCase();

      if (path === "/delete" || action === "delete") {
        return handleDelete(form, token, owner, repo, branch, cors);
      }

      if (path === "/" || path === "/publish" || action === "publish" || !action) {
        return handlePublish(form, token, owner, repo, branch, cors);
      }

      return json({ error: "Not found" }, 404, cors);
    } catch (error) {
      return json(
        { error: error && error.message ? error.message : "処理に失敗しました" },
        500,
        cors
      );
    }
  },
};

async function handlePublish(form, token, owner, repo, branch, cors) {
  const title = String(form.get("title") || "無題").trim() || "無題";
  const datetime = String(form.get("datetime") || "").trim();
  const displayDate = String(form.get("displayDate") || datetime).trim();
  let lines = [];
  try {
    lines = JSON.parse(String(form.get("lines") || "[]"));
  } catch {
    lines = [];
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    return json({ error: "詩の本文が空です" }, 400, cors);
  }

  let imageName = sanitizeFileName(String(form.get("imageName") || "poem.png"));
  const imageFile = form.get("image");

  if (imageFile && typeof imageFile === "object" && imageFile.arrayBuffer) {
    const preferred = sanitizeFileName(imageFile.name || imageName);
    imageName = await ensureUniqueImageName(token, owner, repo, branch, preferred);
    const buffer = await imageFile.arrayBuffer();
    await putFile(
      token,
      owner,
      repo,
      branch,
      "images/" + imageName,
      arrayBufferToBase64(buffer),
      "Add poem image: " + imageName
    );
  } else if (!form.get("imageName")) {
    return json({ error: "写真を選ぶか、既存のファイル名を指定してください" }, 400, cors);
  }

  const poemsPath = "data/poems.json";
  const existing = await getFile(token, owner, repo, branch, poemsPath);
  let poemsData = { poems: [] };
  let sha = null;
  if (existing) {
    sha = existing.sha;
    poemsData = JSON.parse(base64ToUtf8(existing.content));
    if (!Array.isArray(poemsData.poems)) poemsData.poems = [];
  }

  poemsData.poems.push({
    title,
    datetime,
    displayDate,
    image: imageName,
    lines: lines.map((line) => String(line)),
  });

  const jsonText = JSON.stringify(poemsData, null, 2) + "\n";
  await putFile(
    token,
    owner,
    repo,
    branch,
    poemsPath,
    utf8ToBase64(jsonText),
    "Publish poem: " + title,
    sha
  );

  return json(
    {
      ok: true,
      image: imageName,
      count: poemsData.poems.length,
    },
    200,
    cors
  );
}

async function handleDelete(form, token, owner, repo, branch, cors) {
  const index = Number(form.get("index"));
  if (!Number.isInteger(index) || index < 0) {
    return json({ error: "削除する詩の番号が不正です" }, 400, cors);
  }

  const poemsPath = "data/poems.json";
  const existing = await getFile(token, owner, repo, branch, poemsPath);
  if (!existing) {
    return json({ error: "詩データがありません" }, 404, cors);
  }

  const poemsData = JSON.parse(base64ToUtf8(existing.content));
  if (!Array.isArray(poemsData.poems) || index >= poemsData.poems.length) {
    return json({ error: "その詩は見つかりません" }, 404, cors);
  }

  const removed = poemsData.poems[index];
  poemsData.poems.splice(index, 1);

  const jsonText = JSON.stringify(poemsData, null, 2) + "\n";
  await putFile(
    token,
    owner,
    repo,
    branch,
    poemsPath,
    utf8ToBase64(jsonText),
    "Delete poem: " + (removed.title || index),
    existing.sha
  );

  let imageDeleted = false;
  const imageName = sanitizeFileName(removed.image || "");
  if (imageName && !PROTECTED_IMAGES.has(imageName)) {
    const stillUsed = poemsData.poems.some(
      (poem) => sanitizeFileName(poem.image || "") === imageName
    );
    if (!stillUsed) {
      const imageFile = await getFile(token, owner, repo, branch, "images/" + imageName);
      if (imageFile && imageFile.sha) {
        await deleteFile(
          token,
          owner,
          repo,
          branch,
          "images/" + imageName,
          imageFile.sha,
          "Delete poem image: " + imageName
        );
        imageDeleted = true;
      }
    }
  }

  return json(
    {
      ok: true,
      removed: removed.title || "",
      count: poemsData.poems.length,
      imageDeleted,
    },
    200,
    cors
  );
}

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
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

async function github(token, path, options = {}) {
  const response = await fetch("https://api.github.com" + path, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "hainedot-publish-worker",
      ...(options.headers || {}),
    },
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    let detail = "";
    try {
      const err = await response.json();
      detail = err.message || "";
    } catch {
      detail = "";
    }
    throw new Error(
      "GitHub API エラー (" + response.status + ")" + (detail ? ": " + detail : "")
    );
  }

  if (response.status === 204) return null;
  return response.json();
}

async function getFile(token, owner, repo, branch, filePath) {
  return github(
    token,
    `/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`
  );
}

async function putFile(token, owner, repo, branch, filePath, contentBase64, message, sha) {
  const body = {
    message,
    content: contentBase64,
    branch,
  };
  if (sha) body.sha = sha;

  return github(token, `/repos/${owner}/${repo}/contents/${filePath}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function deleteFile(token, owner, repo, branch, filePath, sha, message) {
  return github(token, `/repos/${owner}/${repo}/contents/${filePath}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      sha,
      branch,
    }),
  });
}

async function ensureUniqueImageName(token, owner, repo, branch, desiredName) {
  let name = sanitizeFileName(desiredName);
  const extMatch = name.match(/(\.[^.]+)$/);
  const ext = extMatch ? extMatch[1] : ".png";
  const base = extMatch ? name.slice(0, -ext.length) : name;
  let attempt = name;
  let n = 1;

  while (n < 50) {
    const existing = await getFile(token, owner, repo, branch, "images/" + attempt);
    if (!existing) return attempt;
    attempt = base + "-" + n + ext;
    n += 1;
  }
  return base + "-" + Date.now() + ext;
}
