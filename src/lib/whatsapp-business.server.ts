type WhatsAppBusinessConfig = {
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
  fromNumber?: string;
};

type WhatsAppDocumentMessage = {
  to: string;
  documentUrl: string;
  filename: string;
  caption: string;
};

export type WhatsAppBusinessSendResult =
  | { ok: true; messageId?: string }
  | { ok: false; disabled: true; reason: string };

function getWhatsAppBusinessConfig(): WhatsAppBusinessConfig | null {
  const phoneNumberId = process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_BUSINESS_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return null;

  return {
    phoneNumberId,
    accessToken,
    apiVersion: process.env.WHATSAPP_BUSINESS_API_VERSION || "v23.0",
    fromNumber: process.env.WHATSAPP_BUSINESS_FROM_NUMBER,
  };
}

export function isWhatsAppBusinessConfigured() {
  return Boolean(getWhatsAppBusinessConfig());
}

export async function sendWhatsAppBusinessDocument({
  to,
  documentUrl,
  filename,
  caption,
}: WhatsAppDocumentMessage): Promise<WhatsAppBusinessSendResult> {
  const config = getWhatsAppBusinessConfig();
  if (!config) {
    return {
      ok: false,
      disabled: true,
      reason: "WhatsApp Business API no configurado en variables server-side.",
    };
  }

  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "document",
      document: {
        link: documentUrl,
        filename,
        caption,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WhatsApp Business API error ${response.status}: ${body}`);
  }

  const body = (await response.json()) as { messages?: Array<{ id?: string }> };
  return { ok: true, messageId: body.messages?.[0]?.id };
}
