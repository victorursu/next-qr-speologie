import crypto from "crypto";

const COOKIE_NAME = "speologie_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.APP_PASSWORD;
  if (!secret) {
    throw new Error("APP_PASSWORD is not set in environment");
  }
  return secret;
}

function createToken(expiry: number): string {
  const payload = JSON.stringify({ exp: expiry });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest("hex");
  return `${payloadB64}.${sig}`;
}

function verifyToken(token: string): boolean {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return false;

    const expectedSig = crypto
      .createHmac("sha256", getSecret())
      .update(payloadB64)
      .digest("hex");
    if (sig !== expectedSig) return false;

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    );
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function setAuthCookie(res: { setHeader: (name: string, value: string | string[]) => void }) {
  const expiry = Date.now() + COOKIE_MAX_AGE * 1000;
  const token = createToken(expiry);
  const cookieValue = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
  res.setHeader("Set-Cookie", cookieValue);
}

export function clearAuthCookie(res: { setHeader: (name: string, value: string | string[]) => void }) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function isAuthenticated(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) return false;
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, v] = c.trim().split("=");
      return [k, v ?? ""];
    })
  );
  const token = cookies[COOKIE_NAME];
  return token ? verifyToken(decodeURIComponent(token)) : false;
}

export function getAuthFromRequest(req: {
  cookies?: Partial<Record<string, string>>;
  headers?: { cookie?: string };
}): boolean {
  let token: string | undefined;
  if (req.cookies?.[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  } else if (req.headers?.cookie) {
    const match = req.headers.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    token = match?.[1]?.trim();
  }
  return token ? verifyToken(decodeURIComponent(token)) : false;
}

export function verifyPassword(password: string): boolean {
  try {
    const secret = process.env.APP_PASSWORD?.trim();
    return !!secret && password.trim() === secret;
  } catch {
    return false;
  }
}
