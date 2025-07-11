/* eslint-disable @typescript-eslint/no-explicit-any */
import qrcode from "qrcode"
import { Client, type Message } from "whatsapp-web.js"
import { existsSync, mkdirSync } from "fs"
import { EventEmitter } from "events"

import type { BotStatus, ChatMessage } from "./types/whatsapp"
import { UserManager } from "./user-manager"
import { MessageHandler } from "./message-handler"

export class WhatsAppClient extends EventEmitter {
  private client: Client | null = null
  private userManager: UserManager
  private messageHandler: MessageHandler
  private isSendingMessages = false
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 5000

  private status: BotStatus = {
    isRunning: false,
    isReady: false,
    contactsCount: 0,
    messagesSent: 0,
  }

  constructor() {
    super()
    this.userManager = new UserManager()
    this.messageHandler = new MessageHandler()

    process.on("exit", async () => {
      await this.cleanup()
    })
  }

  getStatus(): BotStatus {
    return {
      ...this.status,
      lastActivity: new Date(),
    }
  }

  // User management
  addUser(name: string, phone: string) {
    return this.userManager.addUser(name, phone)
  }

  getUsers() {
    return this.userManager.getUsers()
  }

  updateUser(id: string, updates: any) {
    return this.userManager.updateUser(id, updates)
  }

  deleteUser(id: string) {
    return this.userManager.deleteUser(id)
  }

  toggleUserStatus(id: string) {
    return this.userManager.toggleUserStatus(id)
  }

  activateAllUsers() {
    return this.userManager.activateAllUsers()
  }

  deactivateAllUsers() {
    return this.userManager.deactivateAllUsers()
  }

  getActiveUsers() {
    return this.userManager.getActiveUsers()
  }

  isUserActive(phone: string) {
    return this.userManager.isUserActive(phone)
  }

  clearUsers() {
    return this.userManager.clearUsers()
  }

  async loadUsersFromDatabase() {
    return this.userManager.loadUsersFromDatabase()
  }

  async loadContacts(): Promise<number> {
    const count = this.userManager.getUsers().length
    this.status.contactsCount = count
    this.logStatus()
    return count
  }

  getContacts() {
    return this.getUsers()
  }

  getChatHistory(phone: string) {
    return this.messageHandler.getChatHistory(phone)
  }

  getAllChatHistory() {
    return this.messageHandler.getAllChatHistory()
  }

  async start(): Promise<void> {
    if (this.status.isRunning || this.client) {
      console.log("[WhatsAppClient] Already running")
      return
    }

    try {
      console.log("[WhatsAppClient] 🚀 Starting WhatsApp Bot Service...")

      const activatedCount = await this.loadUsersFromDatabase()
      console.log(`[WhatsAppClient] ✅ Loaded ${activatedCount} users from database`)

      const contactCount = await this.loadContacts()
      console.log(`[WhatsAppClient] ✅ Loaded ${contactCount} contacts`)

      const userDataDir = "./chrome-profile"
      if (!existsSync(userDataDir)) mkdirSync(userDataDir)

      this.client = new Client({
        puppeteer: {
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
            `--user-data-dir=${userDataDir}`,
          ],
        },
        restartOnAuthFail: true,
      })

      this.status.isRunning = true
      this.status.error = undefined
      this.reconnectAttempts = 0
      this.logStatus()

      this.setupEventHandlers()
      await this.client.initialize()

      this.emit("users_bulk_updated", { action: "activated", count: activatedCount })
    } catch (error) {
      console.error("[WhatsAppClient] start() error:", error)
      this.status.error = error instanceof Error ? error.message : "Unknown error"
      await this.cleanup()
    }
  }

  async stop(): Promise<void> {
    console.log("[WhatsAppClient] 🛑 Stopping WhatsApp Bot Service...")

    const deactivatedCount = this.userManager.deactivateAllUsers()
    console.log(`[WhatsAppClient] ✅ ${deactivatedCount} users deactivated`)

    this.emit("users_bulk_updated", { action: "deactivated", count: deactivatedCount })
    await this.cleanup()
  }

  private setupEventHandlers() {
    if (!this.client) return

    this.client.on("qr", async (qr: string) => {
      console.log("[WhatsAppClient] 🟡 QR Code received")
      try {
        this.status.qrCode = await qrcode.toDataURL(qr)
        this.emit("qr", this.status.qrCode)
        this.logStatus()
      } catch (error) {
        console.error("[WhatsAppClient] QR code generation error:", error)
      }
    })

    this.client.on("authenticated", () => {
      console.log("[WhatsAppClient] ✅ Authenticated")
      this.reconnectAttempts = 0
      this.emit("authenticated")
    })

    this.client.on("ready", () => {
      console.log("[WhatsAppClient] ✅ Client ready")
      this.status.isReady = true
      this.status.qrCode = undefined
      this.status.error = undefined
      this.emit("ready")
      this.logStatus()
    })

    this.client.on("disconnected", async (reason: string) => {
      console.log(`[WhatsAppClient] ❌ Disconnected: ${reason}`)
      this.emit("disconnected", reason)

      if (reason !== "LOGOUT" && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        console.log(`[WhatsAppClient] 🔁 Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        await this.delay(this.reconnectDelay)
        await this.cleanRestart()
      } else {
        await this.cleanup()
      }
    })

    this.client.on("auth_failure", (msg) => {
      console.error("[WhatsAppClient] ❌ Authentication failure:", msg)
      this.status.error = "Authentication failed"
      this.emit("auth_failure", msg)
      this.cleanup()
    })

    this.client.on("message", async (msg: Message) => {
      await this.handleIncomingMessage(msg)
    })
  }

private async handleIncomingMessage(msg: Message) {
  if (msg.fromMe) return

  try {
    const phone = msg.from.split("@")[0]
    const users = this.userManager.getUsers()
    const contact = users.find((u) => u.phone === phone)

    // ❌ Abaikan kalau tidak ditemukan di kontak
    if (!contact) {
      console.log(`[WhatsAppClient] 🚫 Message from unknown number: ${phone} - Ignored`)
      return
    }

    const message: ChatMessage = {
      from: msg.from,
      content: msg.body,
      timestamp: new Date(),
      isIncoming: true,
    }

    this.messageHandler.addMessage(phone, message)
    console.log(`[WhatsAppClient] 💬 Message from ${contact.name} (${phone}): ${msg.body}`)

    this.emit("chat-update", { contact, message, phone })

    // ❌ Jangan balas kalau isActive === false
    if (!contact.isActive) {
      console.log(`[WhatsAppClient] ⚠️ Auto-reply disabled for ${contact.name} (${phone}) (isActive = false)`)
      return
    }

    const replyContent = await this.messageHandler.generateReply(msg.body, contact.name)
    if (replyContent) {
      await this.sendReply(msg.from, replyContent)

      const botMessage: ChatMessage = {
        from: msg.to,
        content: replyContent,
        timestamp: new Date(),
        isIncoming: false,
      }

      this.messageHandler.addMessage(phone, botMessage)
      this.emit("chat-update", {
        contact,
        message: botMessage,
        phone,
      })
    }
  } catch (error) {
    console.error("[WhatsAppClient] Error processing message:", error)
  }
}


  async sendReply(to: string, message: string): Promise<boolean> {
    if (!this.status.isReady || !this.client) return false

    try {
      await this.client.sendMessage(to, message)

      const phone = to.split("@")[0]
      this.messageHandler.addMessage(phone, {
        from: to,
        content: message,
        timestamp: new Date(),
        isIncoming: false,
      })

      console.log(`[WhatsAppClient] 📤 Reply sent to ${phone}`)
      this.emit("reply_sent", { to, message })
      return true
    } catch (error) {
      console.error(`[WhatsAppClient] Failed to send reply to ${to}:`, error)
      return false
    }
  }

  async cleanup() {
    console.log("[WhatsAppClient] Cleaning up resources...")
    try {
      if (this.client) {
        await this.client.destroy()
        console.log("[WhatsAppClient] Client destroyed successfully")
      }
    } catch (error) {
      console.error("[WhatsAppClient] Cleanup error:", error)
    } finally {
      this.client = null
      this.status.isRunning = false
      this.status.isReady = false
      this.logStatus()
    }
  }

  async cleanRestart(): Promise<void> {
    await this.cleanup()
    await this.start()
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private logStatus(): void {
    console.log("[WhatsAppClient] Status:", JSON.stringify(this.status, null, 2))
  }

  async sendBulkMessages(message: string): Promise<void> {
    console.log("[sendBulkMessages] 📩 Starting bulk message send...")

    if (!this.status.isReady || !this.client) {
      console.warn("[sendBulkMessages] ❌ WhatsApp client not ready.")
      return
    }

    if (this.isSendingMessages) {
      console.warn("[sendBulkMessages] ⚠️ Bulk message already in progress, skipping.")
      return
    }

    this.isSendingMessages = true

    try {
      const users = this.userManager.getUsers()

      if (users.length === 0) {
        console.warn("[sendBulkMessages] ⚠️ No users to send message to.")
        return
      }

      console.log(`[sendBulkMessages] ✅ Sending to ${users.length} users...`)

      let successCount = 0

      for (const [i, user] of users.entries()) {
        const phone = user.phone.replace(/\D/g, "") + "@c.us"
        console.log(`[${i + 1}/${users.length}] ▶️ Sending to ${user.name} (${phone})`)

        try {
          await this.client.sendMessage(phone, message)
          console.log(`  📤 Sent successfully.`)

          this.messageHandler.addMessage(user.phone, {
            from: phone,
            content: message,
            timestamp: new Date(),
            isIncoming: false,
          })

          this.status.messagesSent++
          successCount++
        } catch (error) {
          console.error(`  ❌ Failed to send to ${user.name} (${user.phone})`, error)
        }

        if (i < users.length - 1) {
          const delayMs = this.randomDelay(5000, 10000)
          console.log(`  ⏳ Waiting ${delayMs}ms before next...`)
          console.time(`  ⏳ Actual delay for ${user.name}`)
          await this.wait(delayMs)
          console.timeEnd(`  ⏳ Actual delay for ${user.name}`)
        }
      }

      console.log(`[sendBulkMessages] ✅ Done. Sent to ${successCount}/${users.length} users.`)

    } finally {
      this.isSendingMessages = false
    }
  }

  private randomDelay(minMs: number, maxMs: number): number {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
