// Contoh endpoint SSE yang perlu kamu buat/cek:
// /api/whatsapp/stream.ts atau /stream

import { WhatsAppService } from "@/lib/whatsapp-service"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const service = WhatsAppService.getInstance()

  // Emit setiap kali ada pesan baru
  const listener = ({ phone, contact, message }) => {
    const payload = {
      type: "chat-update",
      phone,
      contact,
      message,
    }

    writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
  }

  // Daftarkan listener
  service.on("chat-update", listener)

  // Hapus listener kalau client disconnect
  req.signal?.addEventListener("abort", () => {
    service.off("chat-update", listener)
    writer.close()
  })

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
