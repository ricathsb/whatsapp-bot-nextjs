/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/sse/route.ts
import { NextRequest } from 'next/server'
import { WhatsAppService } from '@/lib/whatsapp-service'

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const service = WhatsAppService.getInstance()

      const send = (payload: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      const setup = async () => {
        // === Initial Chat History ===
        send({
          type: 'chat-history',
          chatHistory: service.getAllChatHistory(),
        })

        // === Initial Status ===
        const users = await service.getUsers()
        send({
          type: 'status',
          ...service.getStatus(),
          usersCount: users.length,
        })

        // === Chat Update Listener ===
        const onChatUpdate = ({ contact, phone, message }) => {
          send({
            type: 'chat-update',
            contact,
            phone,
            message,
          })
        }

        // === Status/Event Listeners ===
        const emitStatus = async () => {
          const users = await service.getUsers()
          send({
            type: 'status',
            ...service.getStatus(),
            usersCount: users.length,
          })
        }

        const onQR = (qrCode: string) => {
          send({ type: 'qr', qrCode })
        }

        // Register all listeners
        service.on('chat-update', onChatUpdate)
        service.on('qr', onQR)
        service.on('ready', emitStatus)
        service.on('authenticated', emitStatus)
        service.on('disconnected', emitStatus)
        service.on('auth_failure', emitStatus)
        service.on('users_bulk_updated', emitStatus)

        // Cleanup on abort
        req.signal.addEventListener('abort', () => {
          service.off('chat-update', onChatUpdate)
          service.off('qr', onQR)
          service.off('ready', emitStatus)
          service.off('authenticated', emitStatus)
          service.off('disconnected', emitStatus)
          service.off('auth_failure', emitStatus)
          service.off('users_bulk_updated', emitStatus)
          controller.close()
        })
      }

      setup().catch((err) => {
        controller.error(err)
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
