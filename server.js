const CREW = ["Szymon", "Kuba", "Dawid"];
const ITERATIONS = 100000;
const sessions = new Map();
const loginAttempts = new Map();
const SESSION_TTL = 8 * 60 * 60 * 1000;
const ATTEMPT_WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export const schema = `
  CREATE TABLE IF NOT EXISTS crew_accounts (
    username TEXT PRIMARY KEY,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    user_id TEXT,
    updated_at INTEGER NOT NULL
  );
`;

const bytesToHex = (bytes) => [...new Uint8Array(bytes)]
  .map((byte) => byte.toString(16).padStart(2, "0"))
  .join("");

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function passwordHash(password, saltHex) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: hexToBytes(saltHex),
    iterations: ITERATIONS
  }, key, 256);
  return bytesToHex(bits);
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function seedAccounts(env) {
  const seeds = [
    ["Szymon", "9f43218adbab3467cf0dd961a24eb3e1", "e1830c522e2e99ba6782586325bda552c7fef5ae2a6502f7708749a0ae4a84fe", "a128c1040074dd2b4e059ece34787e22533c83b98db1d06993e24e92e7c31347"],
    ["Kuba", "05444b19eb37e9d1d3023e3053e849ce", "d535b047f8e5a6e90c43816f9e85eeb259b263f5219a07d471a697e6e0a6c6bf", "16fb80cfc14ec2e2690cd0a3045387f6e5e84a4139f3ff8a4fcf4f9f0e30c281"],
    ["Dawid", "817a3affed5989f530b12e6838ab391e", "a4fb9f67bfd408e8ade3e44bdc4734e6bb1d9de170a1e90f4ea2a230821ecde0", "7a8ba80d694eaa1494bd90e768e0594fc0b84ec21c789d02989125378f61e6ee"]
  ];
  const inserts = seeds.map(([username, salt, hash]) =>
    env.DB.prepare(
      "INSERT OR IGNORE INTO crew_accounts (username, password_salt, password_hash, avatar_url, user_id, updated_at) VALUES (?, ?, ?, NULL, NULL, ?)"
    ).bind(username, salt, hash, Date.now())
  );
  const oldHashMigrations = seeds.map(([username, salt, hash, oldHash]) =>
    env.DB.prepare(
      "UPDATE crew_accounts SET password_hash = ?, updated_at = ? WHERE username = ? AND password_salt = ? AND password_hash = ?"
    ).bind(hash, Date.now(), username, salt, oldHash)
  );
  await env.DB.batch([...inserts, ...oldHashMigrations]);
}

async function getSession(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return { ...session, token };
}

function loginKey(request, username) {
  const source = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-websim-user-id")
    || "anonymous";
  return `${source}:${username.toLowerCase()}`;
}

function rateLimited(key) {
  const now = Date.now();
  const item = loginAttempts.get(key);
  if (!item || now - item.startedAt > ATTEMPT_WINDOW) return false;
  return item.count >= MAX_ATTEMPTS;
}

function recordFailure(key) {
  const now = Date.now();
  const previous = loginAttempts.get(key);
  if (!previous || now - previous.startedAt > ATTEMPT_WINDOW) {
    loginAttempts.set(key, { startedAt: now, count: 1 });
  } else {
    previous.count += 1;
  }
}

function clearFailures(key) {
  loginAttempts.delete(key);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/crew/")) return new Response("Not found", { status: 404 });

    await seedAccounts(env);

    if (request.method === "GET" && url.pathname === "/api/crew/profiles") {
      const { results } = await env.DB
        .prepare("SELECT username, avatar_url FROM crew_accounts ORDER BY CASE username WHEN 'Szymon' THEN 1 WHEN 'Kuba' THEN 2 ELSE 3 END")
        .all();
      return Response.json({ profiles: results });
    }

    if (request.method === "POST" && url.pathname === "/api/crew/login") {
      let body;
      try { body = await request.json(); } catch {
        return Response.json({ error: "Nieprawidłowe dane logowania." }, { status: 400 });
      }
      const username = typeof body.username === "string" ? body.username.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const key = loginKey(request, username);
      if (rateLimited(key)) {
        return Response.json({ error: "Za dużo prób logowania. Spróbuj ponownie później." }, { status: 429 });
      }
      const account = CREW.includes(username)
        ? await env.DB.prepare("SELECT username, password_salt, password_hash FROM crew_accounts WHERE username = ?")
          .bind(username).first()
        : null;
      const salt = account?.password_salt || "2d64c09130b434bb802de1438f99c50a";
      const expected = account?.password_hash || "0000000000000000000000000000000000000000000000000000000000000000";
      const actual = await passwordHash(password, salt);
      if (!account || !safeEqual(actual, expected)) {
        recordFailure(key);
        return Response.json({ error: "Nieprawidłowe dane logowania." }, { status: 401 });
      }
      clearFailures(key);
      const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
      sessions.set(token, {
        username: account.username,
        userId: request.headers.get("x-websim-user-id"),
        expiresAt: Date.now() + SESSION_TTL
      });
      return Response.json({
        token,
        username: account.username,
        canManagePasswords: account.username === "Szymon"
      });
    }

    if (request.method === "POST" && url.pathname === "/api/crew/password") {
      const session = await getSession(request);
      if (!session || session.username !== "Szymon") {
        return Response.json({ error: "Brak uprawnień do zmiany haseł." }, { status: 403 });
      }
      let body;
      try { body = await request.json(); } catch {
        return Response.json({ error: "Nieprawidłowe dane." }, { status: 400 });
      }
      const username = typeof body.username === "string" ? body.username : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (!CREW.includes(username) || password.length < 4 || password.length > 128) {
        return Response.json({ error: "Hasło musi mieć od 4 do 128 znaków." }, { status: 400 });
      }
      const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await passwordHash(password, salt);
      await env.DB.prepare(
        "UPDATE crew_accounts SET password_salt = ?, password_hash = ?, user_id = COALESCE(?, user_id), updated_at = ? WHERE username = ?"
      ).bind(salt, hash, session.userId, Date.now(), username).run();
      return Response.json({ ok: true });
    }

    if (request.method === "POST" && url.pathname === "/api/crew/avatar") {
      const session = await getSession(request);
      if (!session) return Response.json({ error: "Zaloguj się ponownie, aby zmienić zdjęcie." }, { status: 401 });
      if (request.headers.get("content-type") !== "image/webp") {
        return Response.json({ error: "Zdjęcie musi być przygotowane jako WebP." }, { status: 400 });
      }
      const contentLength = Number(request.headers.get("content-length") || 0);
      if (contentLength > 5 * 1024 * 1024) {
        return Response.json({ error: "Zdjęcie jest za duże." }, { status: 413 });
      }
      const bytes = await request.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024) {
        return Response.json({ error: "Nieprawidłowy rozmiar zdjęcia." }, { status: 400 });
      }
      const signature = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 12));
      const riff = String.fromCharCode(...signature.slice(0, 4)) === "RIFF";
      const webp = String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
      if (signature.byteLength < 12 || !riff || !webp) {
        return Response.json({ error: "Plik nie jest prawidłowym zdjęciem WebP." }, { status: 400 });
      }
      const { url: imageUrl } = await env.BLOB.put(
        `crew-avatar-${session.username}-${crypto.randomUUID()}.webp`,
        bytes,
        { contentType: "image/webp" }
      );
      await env.DB.prepare(
        "UPDATE crew_accounts SET avatar_url = ?, user_id = COALESCE(?, user_id), updated_at = ? WHERE username = ?"
      ).bind(imageUrl, session.userId, Date.now(), session.username).run();
      return Response.json({ ok: true, avatar_url: imageUrl });
    }

    return new Response("Not found", { status: 404 });
  }
};
