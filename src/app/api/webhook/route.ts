import { NextRequest, NextResponse } from "next/server";
import { processWebhook, verifyWebhook } from "@/server/webhooks/service";

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Extract webhook type from path (e.g., /api/webhook/gmail -> gmail)
    const webhookType = pathname.split("/").pop();

    // Only allow gmail and calendar webhooks
    if (!["gmail", "calendar"].includes(webhookType || "")) {
      return NextResponse.json(
        { error: "Invalid webhook type" },
        { status: 400 },
      );
    }

    const headers = Object.fromEntries(request.headers);
    const body = await request.json();
    const query = Object.fromEntries(url.searchParams);

    const result = await processWebhook(
      headers as Record<string, string | string[] | undefined>,
      body,
      query as Record<string, string | string[] | undefined>,
    );

    return NextResponse.json({ data: result }, { status: 200 });
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

    // Check if this is a verification request
    const isVerifyPath = url.pathname.endsWith("/verify");

    if (isVerifyPath) {
      const query = Object.fromEntries(url.searchParams);
      const result = await verifyWebhook(query);
      return NextResponse.json({ data: result }, { status: 200 });
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
