type TermiiWhatsAppResponse = {
  message_id?: string;
  messageId?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
};

function normalizeNumber(number: string) {
  const digits = number.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  if (digits.startsWith("234")) return `+${digits}`;
  return digits;
}

export async function sendWhatsAppBrief({
  number,
  message,
  businessName,
  dashboardUrl,
}: {
  number: string;
  message: string;
  businessName: string;
  dashboardUrl: string;
}) {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) throw new Error("TERMII_API_KEY is not configured.");

  const endpoint =
    process.env.TERMII_WHATSAPP_ENDPOINT ??
    "https://api.ng.termii.com/api/send/template";
  const templateId =
    process.env.TERMII_WHATSAPP_DAILY_BRIEF_TEMPLATE_ID ??
    process.env.TERMII_WHATSAPP_TEMPLATE_ID;

  if (!templateId) {
    throw new Error("TERMII_WHATSAPP_DAILY_BRIEF_TEMPLATE_ID is not configured.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      to: normalizeNumber(number),
      from: process.env.TERMII_WHATSAPP_SENDER_ID,
      channel: "whatsapp",
      template_id: templateId,
      template: templateId,
      variables: {
        greeting: "Good morning",
        business_name: businessName,
        brief_content: message,
        dashboard_link: dashboardUrl,
      },
      parameters: [
        { name: "greeting", value: "Good morning" },
        { name: "business_name", value: businessName },
        { name: "brief_content", value: message },
        { name: "dashboard_link", value: dashboardUrl },
      ],
    }),
  });

  const data = (await response.json().catch(() => ({}))) as TermiiWhatsAppResponse;
  if (!response.ok) {
    throw new Error(
      data.message ?? `Termii WhatsApp request failed with ${response.status}.`,
    );
  }

  return {
    termii_message_id: data.message_id ?? data.messageId ?? null,
    status: data.status ?? "sent",
    raw: data,
  };
}
