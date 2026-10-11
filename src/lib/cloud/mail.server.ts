// Server-only email sending through Gmail SMTP (smtp.gmail.com:465) using the
// saved Google app password. The sender address is discovered once from the
// Google account behind the Drive refresh token and cached in D1.
import { d1 } from "./d1.server";

async function senderAddress(): Promise<string> {
  const cached = await d1<{ value: string }>("SELECT value FROM app_config WHERE key = 'smtp_from'");
  if (cached[0]?.value) return cached[0].value;
  const id = process.env["GOOGLE_CLIENT_ID"];
  const secret = process.env["GOOGLE_CLIENT_SECRET"];
  const refresh = process.env["GOOGLE_REFRESH_TOKEN"];
  if (!id || !secret || !refresh) throw new Error("Email is not configured");
  const t: any = await (await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: "refresh_token" }),
  })).json();
  if (!t.access_token) throw new Error("Email is not configured");
  const about: any = await (await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
    headers: { Authorization: `Bearer ${t.access_token}` },
  })).json();
  const email = about?.user?.emailAddress;
  if (!email) throw new Error("Email is not configured");
  await d1("INSERT INTO app_config (key, value) VALUES ('smtp_from', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [email]);
  return email;
}

const b64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));

type SmtpSocket = {
  writer: WritableStreamDefaultWriter<Uint8Array>;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  close: () => Promise<void> | void;
};

/** TLS socket to Gmail: Workers runtime uses cloudflare:sockets, dev uses node:tls. */
async function openSmtpSocket(): Promise<SmtpSocket> {
  const socketsModule = "cloudflare:sockets";
  try {
    const { connect } = await import(/* @vite-ignore */ socketsModule);
    const socket = connect("smtp.gmail.com:465", { secureTransport: "on" });
    return {
      writer: socket.writable.getWriter(),
      reader: socket.readable.getReader(),
      close: () => socket.close(),
    };
  } catch {
    const tlsModule = "node:tls";
    const tls = await import(/* @vite-ignore */ tlsModule);
    const sock = tls.connect(465, "smtp.gmail.com");
    await new Promise<void>((resolve, reject) => {
      sock.once("secureConnect", () => resolve());
      sock.once("error", reject);
    });
    const readable = new ReadableStream<Uint8Array>({
      start(c) {
        sock.on("data", (d: Buffer) => c.enqueue(new Uint8Array(d)));
        sock.on("end", () => c.close());
        sock.on("error", (e: Error) => c.error(e));
      },
    });
    const writable = new WritableStream<Uint8Array>({
      write(chunk) {
        return new Promise<void>((resolve, reject) =>
          sock.write(chunk, (e?: Error | null) => (e ? reject(e) : resolve())),
        );
      },
    });
    return { writer: writable.getWriter(), reader: readable.getReader(), close: () => sock.end() };
  }
}

/** Minimal SMTP client over a TLS socket. */
export async function sendMail(to: string, subject: string, text: string) {
  const password = process.env["GOOGLE_APP_PASSWORD"];
  if (!password) throw new Error("Email is not configured");
  const from = await senderAddress();

  const socket = await openSmtpSocket();
  const writer = socket.writer;
  const reader = socket.reader;
  const dec = new TextDecoder();
  let buf = "";

  const readReply = async (): Promise<string> => {
    // Read until we have a line like "250 ..." (code + space ends the reply).
    for (;;) {
      const m = buf.match(/^\d{3} [^\r\n]*\r?\n/m);
      if (m) { const out = buf.slice(0, m.index! + m[0].length); buf = buf.slice(m.index! + m[0].length); return out; }
      const { value, done } = await reader.read();
      if (done) throw new Error("Email connection closed");
      buf += dec.decode(value, { stream: true });
    }
  };
  const send = async (line: string) => { await writer.write(new TextEncoder().encode(line + "\r\n")); };
  const expect = async (code: string, what: string) => {
    const reply = await readReply();
    if (!reply.startsWith(code)) { console.error("[smtp]", what, reply); throw new Error("Could not send the email"); }
  };

  try {
    await expect("220", "greeting");
    await send("EHLO vision.app");
    await expect("250", "ehlo");
    await send("AUTH LOGIN");
    await expect("334", "auth");
    await send(b64(from));
    await expect("334", "user");
    await send(b64(password.replace(/\s+/g, "")));
    await expect("235", "pass");
    await send(`MAIL FROM:<${from}>`);
    await expect("250", "from");
    await send(`RCPT TO:<${to}>`);
    await expect("250", "to");
    await send("DATA");
    await expect("354", "data");
    const message = [
      `From: Vision <${from}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      text,
      ".",
    ].join("\r\n");
    await writer.write(new TextEncoder().encode(message + "\r\n"));
    await expect("250", "body");
    await send("QUIT");
  } finally {
    try { writer.releaseLock(); reader.releaseLock(); await socket.close(); } catch { /* ignore */ }
  }
}
