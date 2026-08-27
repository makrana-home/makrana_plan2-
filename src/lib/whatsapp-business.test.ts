import assert from "node:assert/strict";
import test from "node:test";
import {
  isWhatsAppBusinessConfigured,
  sendWhatsAppBusinessDocument,
} from "./whatsapp-business.server.ts";

const variableNames = [
  "WHATSAPP_BUSINESS_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_ACCESS_TOKEN",
  "WHATSAPP_BUSINESS_API_VERSION",
  "WHATSAPP_BUSINESS_FROM_NUMBER",
] as const;

function restoreEnvironment(previous: Record<string, string | undefined>) {
  for (const name of variableNames) {
    if (previous[name] === undefined) delete process.env[name];
    else process.env[name] = previous[name];
  }
}

test("WhatsApp queda desactivado de forma segura sin credenciales", async () => {
  const previous = Object.fromEntries(variableNames.map((name) => [name, process.env[name]]));
  try {
    for (const name of variableNames) delete process.env[name];
    assert.equal(isWhatsAppBusinessConfigured(), false);
    assert.deepEqual(
      await sendWhatsAppBusinessDocument({
        to: "51999999999",
        documentUrl: "https://example.test/document.pdf",
        filename: "document.pdf",
        caption: "Documento de prueba",
      }),
      {
        ok: false,
        disabled: true,
        reason: "WhatsApp Business API no configurado en variables server-side.",
      },
    );
  } finally {
    restoreEnvironment(previous);
  }
});

test("WhatsApp usa Graph API con mock y no realiza un envío real", async () => {
  const previous = Object.fromEntries(variableNames.map((name) => [name, process.env[name]]));
  const originalFetch = globalThis.fetch;
  let request: { url: string; init?: RequestInit } | undefined;
  try {
    process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID = "phone-test";
    process.env.WHATSAPP_BUSINESS_ACCESS_TOKEN = "token-test";
    process.env.WHATSAPP_BUSINESS_API_VERSION = "v-test";
    globalThis.fetch = async (input, init) => {
      request = { url: String(input), init };
      return new Response(JSON.stringify({ messages: [{ id: "message-test" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const result = await sendWhatsAppBusinessDocument({
      to: "51999999999",
      documentUrl: "https://example.test/document.pdf",
      filename: "document.pdf",
      caption: "Documento de prueba",
    });
    assert.deepEqual(result, { ok: true, messageId: "message-test" });
    assert.equal(request?.url, "https://graph.facebook.com/v-test/phone-test/messages");
    assert.equal(new Headers(request?.init?.headers).get("Authorization"), "Bearer token-test");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnvironment(previous);
  }
});

test("WhatsApp no propaga el cuerpo de error del proveedor", async () => {
  const previous = Object.fromEntries(variableNames.map((name) => [name, process.env[name]]));
  const originalFetch = globalThis.fetch;
  try {
    process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID = "phone-test";
    process.env.WHATSAPP_BUSINESS_ACCESS_TOKEN = "token-test";
    globalThis.fetch = async () => new Response("dato-sensible", { status: 400 });
    await assert.rejects(
      sendWhatsAppBusinessDocument({
        to: "51999999999",
        documentUrl: "https://example.test/document.pdf",
        filename: "document.pdf",
        caption: "Documento de prueba",
      }),
      (error: Error) => error.message === "WhatsApp Business API error 400.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnvironment(previous);
  }
});
