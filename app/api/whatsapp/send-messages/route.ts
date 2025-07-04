// app/api/send/route.ts
import { NextResponse } from "next/server";
import { WhatsAppService } from "@/lib/whatsapp-service";

export async function POST(request: Request) {
  try {
    const { message, contacts } = await request.json();

    if (!message) {
      return NextResponse.json(
        { success: false, error: "No message provided" },
        { status: 400 }
      );
    }

    const service = WhatsAppService.getInstance();

    if (contacts && Array.isArray(contacts)) {
      // If contacts are provided in the request
      const csvContent = ["name,phone", ...contacts.map(c => `${c.name},${c.phone}`)].join("\n");
      await service.loadContacts(csvContent);
    }

    await service.sendBulkMessages(message);

    return NextResponse.json({ 
      success: true,
      sentCount: service.getStatus().messagesSent
    });
  } catch (error) {
    console.error("Failed to send messages:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}