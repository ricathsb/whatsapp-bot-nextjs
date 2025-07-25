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
        console.log("[SSE SEND]", payload.type, payload)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      const setup = async () => {
        // === Initial Chat History ===
        send({
          type: 'chat-history',
          chatHistory: service.getAllChatHistory(),
        })

        // === Initial Status ===
        try {
          const users = await service.getUsers()
          send({
            type: 'status',
            ...service.getStatus(),
            usersCount: users.length,
          })
        } catch (err) {
          console.error("[SSE] Failed to get initial users:", err)
        }

        // === Event Handlers ===
        const onChatUpdate = (data: { contact: any; phone: string; message: string }) => {
          send({
            type: 'chat-update',
            ...data,
          })
        }

        const onQR = (qrCode: string) => {
          send({ type: 'qr', qrCode })
        }

        const emitStatus = () => {
          service.getUsers()
              .then((users) => {
                send({
                  type: 'status',
                  ...service.getStatus(),
                  usersCount: users.length,
                })
              })
              .catch((err) => {
                console.error("[SSE] Failed to emit status:", err)
              })
        }

        const onDisconnected = (payload: { reason: string; message: string }) => {
          send({
            type: 'disconnected',
            ...payload,
          })
        }

        // === Register Listeners ===
        service.on('chat-update', onChatUpdate)
        service.on('qr', onQR)
        service.on('ready', emitStatus)
        service.on('authenticated', emitStatus)
        service.on('disconnected', onDisconnected)
        service.on('auth_failure', emitStatus)
        service.on('users_bulk_updated', emitStatus)
        service.on('status_changed', emitStatus)
        service.on('users_reloaded', emitStatus)

        // === Cleanup on abort ===
        req.signal.addEventListener('abort', () => {
          service.off('chat-update', onChatUpdate)
          service.off('qr', onQR)
          service.off('ready', emitStatus)
          service.off('authenticated', emitStatus)
          service.off('disconnected', onDisconnected)
          service.off('auth_failure', emitStatus)
          service.off('users_bulk_updated', emitStatus)
          service.off('status_changed', emitStatus)
          service.off('users_reloaded', emitStatus)
          controller.close()
        })
      }

      setup().catch((err) => {
        console.error("[SSE] Setup failed:", err)
        controller.error(err)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
