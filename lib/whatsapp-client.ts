/* eslint-disable @typescript-eslint/no-explicit-any */
// ===== MAIN WHATSAPP CLIENT =====
import qrcode from "qrcode"
import { Client, type Message } from "whatsapp-web.js"
import { existsSync, mkdirSync } from "fs"
import { EventEmitter } from "events"

import type { BotStatus, ChatMessage } from "./types/whatsapp"
import { UserManager } from "./user-manager"
import { ContactManager } from "./contact-manager"
import { MessageHandler } from "./message-handler"
import { PhoneNormalizer } from "./phone-normalizer"

export class WhatsAppClient extends EventEmitter {
    private client: Client | null = null
    private userManager: UserManager
    private contactManager: ContactManager
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
        this.contactManager = new ContactManager()
        this.messageHandler = new MessageHandler()

        // Register cleanup on process exit
        process.on("exit", async () => {
            await this.cleanup()
        })
    }

    // Delegate methods to managers
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

    async loadUsersFromCSV(csvContent: string) {
        return this.userManager.loadUsersFromCSV(csvContent)
    }

    async loadContacts(csvContent: string) {
        const count = await this.contactManager.loadContactsFromCSV(csvContent)
        this.status.contactsCount = count
        this.logStatus()
        return count
    }

    getContacts() {
        return this.contactManager.getContacts()
    }

    getChatHistory(phone: string) {
        return this.messageHandler.getChatHistory(phone)
    }

    getAllChatHistory() {
        return this.messageHandler.getAllChatHistory()
    }

    // WhatsApp Client Methods
    async start(): Promise<void> {
        if (this.status.isRunning || this.client) {
            console.log("[WhatsAppClient] Already running")
            return
        }

        try {
            console.log("[WhatsAppClient] 🚀 Starting WhatsApp Bot Service...")

            const activatedCount = this.userManager.activateAllUsers()
            console.log(`[WhatsAppClient] ✅ Bot started - ${activatedCount} users activated`)

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
        console.log(`[WhatsAppClient] ✅ Bot stopped - ${deactivatedCount} users deactivated`)

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
                console.log(`[WhatsAppClient] 🔄 Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
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
            const contacts = this.contactManager.getContacts()
            const contact = contacts.find((c) => c.phone === phone) || { name: phone, phone }

            const message: ChatMessage = {
                from: msg.from,
                content: msg.body,
                timestamp: new Date(),
                isIncoming: true,
            }

            this.messageHandler.addMessage(phone, message)
            console.log(`[WhatsAppClient] 💬 Message from ${contact.name} (${phone}): ${msg.body}`)

            // ✅ SOLUSI: Emit event ke browser untuk update real-time
            if (typeof window !== "undefined") {
                window.dispatchEvent(
                    new CustomEvent("newMessage", {
                        detail: { contact, message, phone },
                    }),
                )
            }

            if (!this.userManager.isUserActive(phone)) {
                console.log(`[WhatsAppClient] 🚫 User ${contact.name} is INACTIVE - not responding`)
                this.emit("message", { contact, message, responded: false, reason: "User inactive" })
                return
            }

            console.log(`[WhatsAppClient] ✅ User ${contact.name} is ACTIVE - generating response`)
            this.emit("message", { contact, message, responded: true })

            const replyContent = await this.messageHandler.generateReply(msg.body, contact.name)
            if (replyContent) {
                await this.sendReply(msg.from, replyContent)
            }
        } catch (error) {
            console.error("[WhatsAppClient] Error processing message:", error)
        }
    }

    async sendBulkMessages(messageTemplate: string): Promise<void> {
        if (!this.status.isReady || !this.client) {
            throw new Error("Client not ready")
        }

        this.status.messagesSent = 0
        this.isSendingMessages = true
        this.logStatus()

        const contacts = this.contactManager.getContacts()
        console.log(`[WhatsAppClient] 🚀 Sending messages to ${contacts.length} contacts...`)

        for (const contact of contacts) {
            if (!this.status.isReady || !this.client) {
                console.warn(`[WhatsAppClient] ⚠️ Client disconnected before sending to ${contact.name}`)
                break
            }

            try {
                const chatId = PhoneNormalizer.toChatId(contact.phone)
                console.log(`[WhatsAppClient] 📤 Attempting to send to ${contact.name} at ${chatId}`)

                const chat = await this.client.getChatById(chatId).catch(() => null)
                if (!chat) {
                    console.warn(`[WhatsAppClient] ⚠️ Chat not found for ${contact.name} (${contact.phone})`)
                    continue
                }

                const message = messageTemplate.replace(/{name}/g, contact.name)
                await this.client.sendMessage(chatId, message)

                this.messageHandler.addMessage(contact.phone, {
                    from: chatId,
                    content: message,
                    timestamp: new Date(),
                    isIncoming: false,
                })

                this.status.messagesSent++
                console.log(`[WhatsAppClient] ✅ Sent to ${contact.name} (${contact.phone})`)

                // ✅ SOLUSI: Emit event untuk message sent
                if (typeof window !== "undefined") {
                    window.dispatchEvent(
                        new CustomEvent("messageSent", {
                            detail: { contact, message },
                        }),
                    )
                }

                await this.delay(3000 + Math.random() * 3000)
            } catch (error) {
                console.error(`[WhatsAppClient] ❌ Failed to send to ${contact.name}:`, error)
                if (error instanceof Error && error.message.includes("disconnected")) {
                    console.warn("[WhatsAppClient] ⚠️ Connection error detected, attempting recovery...")
                    await this.cleanRestart()
                    break
                }
            }
        }

        this.isSendingMessages = false
        this.logStatus()
    }

    async sendReply(to: string, message: string): Promise<boolean> {
        if (!this.status.isReady || !this.client) {
            console.warn("[WhatsAppClient] Cannot send reply - client not ready")
            return false
        }

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

            // ✅ SOLUSI: Emit event untuk reply sent
            if (typeof window !== "undefined") {
                window.dispatchEvent(
                    new CustomEvent("messageSent", {
                        detail: { phone, message },
                    }),
                )
            }

            return true
        } catch (error) {
            console.error(`[WhatsAppClient] Failed to send reply to ${to}:`, error)
            return false
        }
    }

    getStatus(): BotStatus {
        return { ...this.status, lastActivity: new Date() }
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
        try {
            await this.cleanup()
            await this.start()
        } catch (error) {
            console.error("[WhatsAppClient] Clean restart failed:", error)
            await this.cleanup()
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    private logStatus(): void {
        console.log("[WhatsAppClient] Status:", JSON.stringify(this.status, null, 2))
    }
}
