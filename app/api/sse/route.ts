// app/api/sse/route.ts
import { NextRequest } from 'next/server'
import { WhatsAppService } from '@/lib/whatsapp-service'

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        const service = WhatsAppService.getInstance()
        const chatHistory = service.getAllChatHistory()

        const payload = `data: ${JSON.stringify({
          type: 'chat-history',
          chatHistory
        })}\n\n`

        controller.enqueue(encoder.encode(payload))
      }

      // Kirim langsung saat koneksi dibuka
      send()

      const interval = setInterval(send, 3000)

      // Cleanup saat koneksi ditutup
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
}
