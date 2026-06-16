import { NextRequest, NextResponse } from "next/server";
import { processWebhook } from "corsair";
import { corsair } from "@/server/corsair";

function decodePubSubBody(
  body: Record<string, unknown> | string,
): Record<string, unknown> | string {
  if (typeof body !== "object" || !body) return body;
  const msg = body as Record<string, any>;
  if (!msg.message || !msg.subscription) return body;
  const encoded = msg.message.data;
  if (typeof encoded !== "string") return body;
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    console.log(`[WEBHOOK] Decoded Pub/Sub payload`);
    return JSON.parse(decoded);
  } catch {
    return body;
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const webhookType = pathname.split("/").pop();

    if (!["gmail", "calendar"].includes(webhookType || "")) {
      return NextResponse.json(
        { error: "Invalid webhook type" },
        { status: 400 },
      );
    }

    const headers = Object.fromEntries(request.headers);
    const body = await request.json();
    const query = Object.fromEntries(url.searchParams);

    const decodedBody = decodePubSubBody(body);

    const queryWithTenant = {
      ...query,
      tenantId: query.tenantId ?? process.env.CORSAIR_TENANT_ID ?? "dev",
    };

    const result = await processWebhook(
      corsair,
      headers as Record<string, string | string[] | undefined>,
      decodedBody,
      queryWithTenant,
    );

    return NextResponse.json(
      { data: result },
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process webhook",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams);

    if (url.pathname.endsWith("/verify")) {
      return NextResponse.json({ data: { verified: true } }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Invalid webhook request" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to verify webhook",
      },
      { status: 500 },
    );
  }
}
