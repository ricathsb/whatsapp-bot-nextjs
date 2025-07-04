// app/api/reply/route.ts
import { NextResponse } from "next/server";
import { WhatsAppService } from "@/lib/whatsapp-service";

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: "Phone and message are required" },
        { status: 400 }
      );
    }

    // Validate phone number format
    const normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number" },
        { status: 400 }
      );
    }

    const service = WhatsAppService.getInstance();
    const chatId = `${normalizedPhone}@c.us`;
    const success = await service.sendReply(chatId, message);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to send reply" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send reply:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Phone parameter is required" },
        { status: 400 }
      );
    }

    const service = WhatsAppService.getInstance();
    const history = service.getChatHistory(phone);

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error("Failed to get chat history:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}