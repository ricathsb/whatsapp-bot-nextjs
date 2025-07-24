import { Client, LocalAuth, Message } from "whatsapp-web.js"
import { EventEmitter } from "events"
import { PrismaClient } from "@prisma/client"
import qrcode from "qrcode"
import type { BotStatus, ChatHistory, ChatMessage } from "./types/whatsapp"

const prisma = new PrismaClient()

export class WhatsAppClient extends EventEmitter {
  private client: Client | null = null
  private isSendingMessages = false
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 5000
  private chatHistory: ChatHistory = {}

  private status: BotStatus = {
    isRunning: false,
    isReady: false,
    contactsCount: 0,
    messagesSent: 0,
  }

  constructor() {
    super()
    process.on("exit", async () => await this.cleanup())
  }

  public getStatus(): BotStatus {
    return {
      ...this.status,
      lastActivity: new Date(),
    }
  }

  public getAllChatHistory(): ChatHistory {
    return this.chatHistory
  }

  public async start(): Promise<void> {
    if (this.status.isRunning || this.client) return

    try {
      this.client = new Client({
        authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
        puppeteer: {
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
          ],
        },
        restartOnAuthFail: true,
      })

      this.status.isRunning = true
      this.reconnectAttempts = 0
      this.status.error = undefined
      this.logStatus()

      this.emit("status_changed", {
        isRunning: true,
        isReady: false,
        message: "Bot is starting...",
      })

      this.setupEventHandlers()
      await this.client.initialize()
    } catch (error) {
      console.error("[WhatsAppClient] start() error:", error)
      this.status.error = error instanceof Error ? error.message : "Unknown error"
      await this.cleanup()
    }
  }

  private setupEventHandlers() {
    if (!this.client) return

    this.client.on("qr", async (qr: string) => {
      try {
        const qrCode = await qrcode.toDataURL(qr)
        this.status.qrCode = qrCode
        this.emit("qr", qrCode)
        console.log("[WhatsAppClient] QR Code generated.")
      } catch (err) {
        console.error("[QR Error]", err)
      }
    })

    this.client.on("authenticated", () => {
      this.reconnectAttempts = 0
      console.log("[WhatsAppClient] ✅ Authenticated.")
      this.emit("authenticated")
    })

    this.client.on("ready", async () => {
      this.status.isReady = true
      this.status.qrCode = undefined
      this.status.contactsCount = await prisma.nasabah.count({ where: { isSended: false } })
      console.log("[WhatsAppClient] ✅ Ready.")
      this.emit("status_changed", {
        isRunning: true,
        isReady: true,
        message: "Bot is ready.",
      })
    })

    this.client.on("message", async (msg: Message) => {
      const phone = msg.from.replace(/@c\.us$/, "")
      if (!msg.fromMe) {
        const chatMsg: ChatMessage = {
          from: phone,
          content: msg.body,
          timestamp: new Date(),
          isIncoming: true,
        }

        if (!this.chatHistory[phone]) this.chatHistory[phone] = []
        this.chatHistory[phone].push(chatMsg)
        console.log(`[WhatsAppClient] 💬 Message from ${phone}: ${msg.body}`)
        this.emit("message", chatMsg)
      }
    })

    this.client.on("disconnected", async (reason: string) => {
      console.warn("[WhatsAppClient] 🔌 Disconnected:", reason)
      this.emit("disconnected", reason)

      if (reason !== "LOGOUT" && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        await this.delay(this.reconnectDelay)
        await this.cleanRestart()
      } else {
        await this.cleanup()
      }
    })

    this.client.on("auth_failure", (msg) => {
      this.status.error = "Authentication failed"
      console.error("[WhatsAppClient] ❌ Auth Failure:", msg)
      this.emit("auth_failure", msg)
      this.cleanup()
    })
  }

  public async sendBulkMessages(text: string): Promise<void> {
    if (!this.status.isReady || !this.client) {
      console.warn("[sendBulkMessages] Client not ready or not initialized.")
      return
    }

    if (this.isSendingMessages) {
      console.warn("[sendBulkMessages] Already sending messages.")
      return
    }

    this.isSendingMessages = true

    try {
      const users = await prisma.nasabah.findMany({ where: { isSended: false } })
      this.status.contactsCount = users.length

      for (const [i, user] of users.entries()) {
        const phone = this.formatPhone(user.no_hp)

        try {
          const isRegistered = await this.client.isRegisteredUser(phone)
          if (!isRegistered) {
            console.warn(`⚠️ ${phone} is not a registered WhatsApp user`)
            continue
          }

          await this.client.sendMessage(phone, text)

          await prisma.nasabah.update({
            where: { id: user.id },
            data: { isSended: true },
          })

          this.status.messagesSent++
          console.log(`✅ Sent to ${user.nama} (${user.no_hp})`)

          const chatMsg: ChatMessage = {
            from: phone,
            content: text,
            timestamp: new Date(),
            isIncoming: false,
          }

          if (!this.chatHistory[phone]) this.chatHistory[phone] = []
          this.chatHistory[phone].push(chatMsg)

        } catch (error) {
          console.error(`❌ Failed to send to ${user.nama} (${user.no_hp}):`, error)
        }

        if (i < users.length - 1) {
          await this.delay(this.randomDelay(2500, 5000))
        }
      }

      console.log(`[sendBulkMessages] Done. Sent ${this.status.messagesSent} messages.`)
    } finally {
      this.isSendingMessages = false
      this.logStatus()
    }
  }

  private formatPhone(phone: string): string {
    let normalized = phone.replace(/\D/g, "")
    if (normalized.startsWith("0")) normalized = "62" + normalized.slice(1)
    return normalized + "@c.us"
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public async stop(): Promise<void> {
    await this.cleanup()
    this.emit("status_changed", {
      isRunning: false,
      isReady: false,
      message: "Bot has been stopped.",
    })
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.client) await this.client.destroy()
    } catch (error) {
      console.error("[WhatsAppClient] Cleanup error:", error)
    } finally {
      this.client = null
      this.status.isRunning = false
      this.status.isReady = false
      this.logStatus()
    }
  }

  private async cleanRestart(): Promise<void> {
    await this.cleanup()
    await this.start()
  }

  private randomDelay(minMs: number, maxMs: number): number {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  }

  private logStatus(): void {
    console.log("[WhatsAppClient] Status:", JSON.stringify(this.status, null, 2))
  }

  public async getUsers() {
    return prisma.nasabah.findMany()
  }

  public async reloadUsers(): Promise<void> {
    try {
      const users = await prisma.nasabah.findMany({
        orderBy: { id: "desc" },
      })

      // Update jumlah user belum terkirim
      this.status.contactsCount = users.filter((u) => !u.isSended).length

      // Bisa juga emit event ke frontend jika perlu
      this.emit("users_reloaded", users)

      console.log(`[WhatsAppClient] 🔄 Reloaded ${users.length} users from DB`)
    } catch (error) {
      console.error("[WhatsAppClient] Failed to reload users:", error)
    }
  }

}