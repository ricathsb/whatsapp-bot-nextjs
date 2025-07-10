// app/api/sse/route.ts
import { NextRequest } from 'next/server'
import { WhatsAppService } from '@/lib/whatsapp-service'

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const service = WhatsAppService.getInstance()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const send = (payload: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      // Langsung kirim chatHistory awal (sekali saja saat koneksi dibuka)
      send({
        type: 'chat-history',
        chatHistory: service.getAllChatHistory(),
      })

      // Kirim hanya saat ada pesan baru
      const listener = ({ contact, phone, message }) => {
        send({
          type: 'chat-update',
          contact,
          phone,
          message,
        })
      }

      service.on('chat-update', listener)

      req.signal.addEventListener('abort', () => {
        service.off('chat-update', listener)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    }
  })
}
