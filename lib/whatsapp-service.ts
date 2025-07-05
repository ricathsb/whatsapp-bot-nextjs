import qrcode from "qrcode"
import { Client, type Message } from "whatsapp-web.js"
import { existsSync, mkdirSync } from "fs"
import { EventEmitter } from "events"

interface Contact {
  name: string
  phone: string
}

interface ChatMessage {
  from: string
  content: string
  timestamp: Date
  isIncoming: boolean
}

interface ChatHistory {
  [phone: string]: ChatMessage[]
}

interface BotStatus {
  isRunning: boolean
  isReady: boolean
  qrCode?: string
  contactsCount: number
  messagesSent: number
  error?: string
  lastActivity?: Date
}

interface User {
  id: string
  name: string
  phone: string
  isActive: boolean
  createdAt: Date
  lastActivity?: Date
}

// Declare global type
declare global {
  var whatsappService: WhatsAppService | undefined
}

export class WhatsAppService extends EventEmitter {
  private static instance: WhatsAppService
  private client: Client | null = null
  private contacts: Contact[] = []
  private chatHistory: ChatHistory = {}
  private users: User[] = []
  private isSendingMessages = false
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 5000 // 5 seconds

  private status: BotStatus = {
    isRunning: false,
    isReady: false,
    contactsCount: 0,
    messagesSent: 0,
  }

  private constructor() {
    super()
    // Register cleanup on process exit
    process.on("exit", async () => {
      await this.cleanup()
    })
  }

  static getInstance(): WhatsAppService {
    // Use globalThis for development (hot reload)
    if (process.env.NODE_ENV === "development") {
      if (!globalThis.whatsappService) {
        globalThis.whatsappService = new WhatsAppService()
        console.log("[WA] Created new instance in development mode")
      }
      return globalThis.whatsappService
    }

    // For production, use regular singleton
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService()
      console.log("[WA] Created new instance in production mode")
    }
    return WhatsAppService.instance
  }

  getAllChatHistory(): ChatHistory {
    // Return a deep copy of the entire chat history
    return JSON.parse(JSON.stringify(this.chatHistory))
  }

  // Bulk user operations
  activateAllUsers(): number {
    let activatedCount = 0
    this.users.forEach((user) => {
      if (!user.isActive) {
        user.isActive = true
        user.lastActivity = new Date()
        activatedCount++
      }
    })
    console.log(`[WA] 🟢 Activated ${activatedCount} users. Total active: ${this.getActiveUsers().length}`)
    return activatedCount
  }

  deactivateAllUsers(): number {
    let deactivatedCount = 0
    this.users.forEach((user) => {
      if (user.isActive) {
        user.isActive = false
        user.lastActivity = new Date()
        deactivatedCount++
      }
    })
    console.log(`[WA] 🔴 Deactivated ${deactivatedCount} users. Total active: ${this.getActiveUsers().length}`)
    return deactivatedCount
  }

  // User management methods
  addUser(name: string, phone: string): User {
    // Normalize phone: remove all non-digits, then remove leading zeros
    let normalizedPhone = phone.replace(/\D/g, "")

    // Remove leading zeros but keep country code format
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "62" + normalizedPhone.substring(1)
    } else if (!normalizedPhone.startsWith("62")) {
      normalizedPhone = "62" + normalizedPhone
    }

    console.log(`[WA] Phone normalization: "${phone}" → "${normalizedPhone}"`)

    // Check if user already exists by phone
    const existingUserByPhone = this.users.find((u) => u.phone === normalizedPhone)
    if (existingUserByPhone) {
      console.log(
        `[WA] User with phone ${normalizedPhone} already exists (${existingUserByPhone.name}), skipping ${name}`,
      )
      return existingUserByPhone
    }

    // Check if user already exists by name (in case same person with different phone)
    const existingUserByName = this.users.find((u) => u.name.toLowerCase() === name.toLowerCase())
    if (existingUserByName) {
      console.log(
        `[WA] User with name ${name} already exists (${existingUserByName.phone}), updating phone to ${normalizedPhone}`,
      )
      existingUserByName.phone = normalizedPhone
      return existingUserByName
    }

    const user: User = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      phone: normalizedPhone,
      isActive: false, // Default to inactive for security
      createdAt: new Date(),
    }
    this.users.push(user)
    console.log(`[WA] Added new user: ${name} (${normalizedPhone})`)
    return user
  }

  // Enhanced CSV parsing with flexible column detection
  private parseCSV(csvContent: string): { headers: string[]; rows: string[][] } {
    console.log("[WA] Starting CSV parsing...")
    console.log("[WA] CSV Content preview:", csvContent.substring(0, 300) + "...")

    const lines = csvContent.split("\n").filter((line) => line.trim()) // Remove empty lines
    console.log(`[WA] Found ${lines.length} non-empty lines in CSV`)

    if (lines.length === 0) {
      throw new Error("CSV file is empty")
    }

    // Parse headers with better handling
    const headerLine = lines[0]
    let headers: string[]

    // Handle different CSV formats (comma, semicolon, tab)
    if (headerLine.includes(";")) {
      headers = headerLine.split(";").map((h) => h.trim().replace(/['"]/g, "").toLowerCase())
      console.log("[WA] Detected semicolon-separated CSV")
    } else if (headerLine.includes("\t")) {
      headers = headerLine.split("\t").map((h) => h.trim().replace(/['"]/g, "").toLowerCase())
      console.log("[WA] Detected tab-separated CSV")
    } else {
      headers = headerLine.split(",").map((h) => h.trim().replace(/['"]/g, "").toLowerCase())
      console.log("[WA] Detected comma-separated CSV")
    }

    console.log("[WA] CSV Headers found:", headers)
    console.log(`[WA] Total columns: ${headers.length}`)

    // Parse rows with same separator
    const separator = headerLine.includes(";") ? ";" : headerLine.includes("\t") ? "\t" : ","
    const rows: string[][] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Handle CSV with quotes and different separators
      const row = line.split(separator).map((cell) => cell.trim().replace(/['"]/g, ""))
      rows.push(row)

      // Only log first few rows to avoid spam
      if (i <= 3) {
        console.log(`[WA] Row ${i}: [${row.join(" | ")}]`)
      }
    }

    console.log(`[WA] Parsed ${rows.length} data rows`)
    return { headers, rows }
  }

  // Smart column detection for name and phone
  private findColumnIndices(headers: string[]): { nameIndex: number; phoneIndex: number; suggestions: string } {
    console.log("[WA] ===== SMART COLUMN DETECTION =====")

    // Possible variations for name column
    const nameVariations = [
      "name",
      "nama",
      "full_name",
      "fullname",
      "customer_name",
      "client_name",
      "first_name",
      "last_name",
      "person_name",
      "contact_name",
      "user_name",
      "nama_lengkap",
      "nama_customer",
      "nama_klien",
      "nama_peserta",
    ]

    // Possible variations for phone column
    const phoneVariations = [
      "phone",
      "telephone",
      "mobile",
      "cell",
      "whatsapp",
      "wa",
      "hp",
      "telepon",
      "phone_number",
      "mobile_number",
      "cell_number",
      "contact_number",
      "nomor_hp",
      "nomor_telepon",
      "nomor_wa",
      "nomor_whatsapp",
      "no_hp",
      "no_wa",
    ]

    let nameIndex = -1
    let phoneIndex = -1
    const nameMatches: string[] = []
    const phoneMatches: string[] = []

    // Find name column
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase()
      for (const variation of nameVariations) {
        if (header.includes(variation)) {
          nameIndex = i
          nameMatches.push(`"${headers[i]}" (column ${i + 1})`)
          console.log(`[WA] ✅ Name column found: "${headers[i]}" at index ${i}`)
          break
        }
      }
      if (nameIndex !== -1) break
    }

    // Find phone column
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase()
      for (const variation of phoneVariations) {
        if (header.includes(variation)) {
          phoneIndex = i
          phoneMatches.push(`"${headers[i]}" (column ${i + 1})`)
          console.log(`[WA] ✅ Phone column found: "${headers[i]}" at index ${i}`)
          break
        }
      }
      if (phoneIndex !== -1) break
    }

    // Generate suggestions if columns not found
    let suggestions = ""
    if (nameIndex === -1 || phoneIndex === -1) {
      suggestions += "\n🔍 COLUMN DETECTION RESULTS:\n"
      suggestions += `Available columns: ${headers.map((h, i) => `"${h}" (${i + 1})`).join(", ")}\n\n`

      if (nameIndex === -1) {
        suggestions += "❌ Name column not found automatically.\n"
        suggestions += `Expected variations: ${nameVariations.slice(0, 8).join(", ")}\n`
      } else {
        suggestions += `✅ Name column: ${nameMatches[0]}\n`
      }

      if (phoneIndex === -1) {
        suggestions += "❌ Phone column not found automatically.\n"
        suggestions += `Expected variations: ${phoneVariations.slice(0, 8).join(", ")}\n`
      } else {
        suggestions += `✅ Phone column: ${phoneMatches[0]}\n`
      }

      suggestions += "\n💡 SOLUTIONS:\n"
      suggestions += "1. Rename your CSV headers to include 'name' and 'phone'\n"
      suggestions += "2. Use headers like: 'nama', 'telepon', 'hp', 'wa'\n"
      suggestions += "3. Example: 'customer_name', 'phone_number'\n"
    }

    console.log("[WA] Column detection results:")
    console.log(`[WA] Name index: ${nameIndex} (${nameIndex >= 0 ? headers[nameIndex] : "NOT FOUND"})`)
    console.log(`[WA] Phone index: ${phoneIndex} (${phoneIndex >= 0 ? headers[phoneIndex] : "NOT FOUND"})`)
    console.log("[WA] =====================================")

    return { nameIndex, phoneIndex, suggestions }
  }

  // Load users from CSV with smart column detection
  async loadUsersFromCSV(csvContent: string): Promise<number> {
    console.log("[WA] ===== LOADING USERS FROM CSV =====")

    try {
      const { headers, rows } = this.parseCSV(csvContent)
      const { nameIndex, phoneIndex, suggestions } = this.findColumnIndices(headers)

      if (nameIndex === -1 || phoneIndex === -1) {
        const errorMessage = `Cannot find required columns in CSV.${suggestions}`
        console.error("[WA]", errorMessage)
        throw new Error(errorMessage)
      }

      let addedCount = 0
      let skippedCount = 0
      let errorCount = 0

      console.log(`[WA] Processing ${rows.length} rows...`)
      console.log(
        `[WA] Using columns: Name="${headers[nameIndex]}" (${nameIndex + 1}), Phone="${headers[phoneIndex]}" (${phoneIndex + 1})`,
      )

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]

        // Only log first few rows for debugging
        if (i < 3) {
          console.log(`[WA] Processing row ${i + 1}:`, row)
        }

        if (row.length <= Math.max(nameIndex, phoneIndex)) {
          console.log(`[WA] Row ${i + 1} has insufficient columns (${row.length}), skipping`)
          errorCount++
          continue
        }

        const name = row[nameIndex]?.trim()
        const phoneRaw = row[phoneIndex]?.trim()

        if (!name || !phoneRaw) {
          if (i < 5) {
            // Only log first few errors
            console.log(`[WA] Row ${i + 1} missing data: name='${name}', phone='${phoneRaw}', skipping`)
          }
          errorCount++
          continue
        }

        // Use consistent phone normalization
        let phone = phoneRaw.replace(/\D/g, "")

        // Remove leading zeros but keep country code format
        if (phone.startsWith("0")) {
          phone = "62" + phone.substring(1)
        } else if (!phone.startsWith("62")) {
          phone = "62" + phone
        }

        if (i < 3) {
          console.log(`[WA] Row ${i + 1} - Name: '${name}', Phone raw: '${phoneRaw}', Phone normalized: '${phone}'`)
        }

        if (phone.length < 12) {
          // Minimum 62 + 10 digits
          if (i < 5) {
            console.log(`[WA] Row ${i + 1} - Phone too short (${phone.length} digits): '${phone}', skipping`)
          }
          errorCount++
          continue
        }

        // Check if user already exists
        const existingUser = this.users.find((u) => u.phone === phone)
        if (existingUser) {
          if (i < 5) {
            console.log(
              `[WA] Row ${i + 1} - User with phone ${phone} already exists (${existingUser.name}), skipping ${name}`,
            )
          }
          skippedCount++
          continue
        }

        // Add user to the system
        const user = this.addUser(name, phone)
        if (user) {
          addedCount++
          if (i < 3) {
            console.log(`[WA] Row ${i + 1} - Successfully added: ${name} (${phone})`)
          }
        }
      }

      console.log("[WA] ===== CSV LOADING SUMMARY =====")
      console.log(`[WA] CSV Format: ${headers.length} columns detected`)
      console.log(`[WA] Used columns: "${headers[nameIndex]}" and "${headers[phoneIndex]}"`)
      console.log(`[WA] Total rows processed: ${rows.length}`)
      console.log(`[WA] Successfully added: ${addedCount}`)
      console.log(`[WA] Skipped (duplicates): ${skippedCount}`)
      console.log(`[WA] Errors (invalid data): ${errorCount}`)
      console.log(`[WA] Total users in system: ${this.users.length}`)
      console.log(
        "[WA] Sample users:",
        this.users.slice(0, 3).map((u) => `${u.name} (${u.phone})`),
      )
      console.log("[WA] ===================================")

      return addedCount
    } catch (error) {
      console.error("[WA] Error loading users from CSV:", error)
      throw error
    }
  }

  getUsers(): User[] {
    console.log(`[WA] Returning ${this.users.length} users`)
    return [...this.users]
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const userIndex = this.users.findIndex((u) => u.id === id)
    if (userIndex === -1) return null

    this.users[userIndex] = { ...this.users[userIndex], ...updates }
    return this.users[userIndex]
  }

  deleteUser(id: string): boolean {
    const userIndex = this.users.findIndex((u) => u.id === id)
    if (userIndex === -1) return false

    this.users.splice(userIndex, 1)
    return true
  }

  toggleUserStatus(id: string): User | null {
    const user = this.users.find((u) => u.id === id)
    if (!user) return null

    user.isActive = !user.isActive
    user.lastActivity = new Date()
    console.log(`[WA] User ${user.name} (${user.phone}) status changed to: ${user.isActive ? "ACTIVE" : "INACTIVE"}`)
    return user
  }

  getActiveUsers(): User[] {
    return this.users.filter((u) => u.isActive)
  }

  // Check if user is active by phone number
  isUserActive(phone: string): boolean {
    // Normalize phone the same way as addUser
    let normalizedPhone = phone.replace(/\D/g, "")

    // Remove leading zeros but keep country code format
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "62" + normalizedPhone.substring(1)
    } else if (!normalizedPhone.startsWith("62")) {
      normalizedPhone = "62" + normalizedPhone
    }

    console.log(`[WA] Checking user activity: "${phone}" → normalized: "${normalizedPhone}"`)

    const user = this.users.find((u) => u.phone === normalizedPhone)
    const isActive = user ? user.isActive : false

    if (user) {
      console.log(`[WA] User found: ${user.name} (${user.phone}) - Status: ${isActive ? "ACTIVE" : "INACTIVE"}`)
    } else {
      console.log(`[WA] User NOT FOUND for phone: ${normalizedPhone}`)
      console.log(
        `[WA] Available users:`,
        this.users.map((u) => `${u.name} (${u.phone})`),
      )
    }

    return isActive
  }

  // Clear all users
  clearUsers(): void {
    console.log(`[WA] Clearing all ${this.users.length} users`)
    this.users = []
  }

  async cleanup() {
    console.log("[WA] Cleaning up resources...")
    try {
      if (this.client) {
        await this.client.destroy()
        console.log("[WA] Client destroyed successfully")
      }
    } catch (error) {
      console.error("[WA] Cleanup error:", error)
    } finally {
      this.client = null
      this.status.isRunning = false
      this.status.isReady = false
      this.logStatus()
    }
  }

  async start(): Promise<void> {
    if (this.status.isRunning || this.client) {
      console.log("[WA] Already running or client exists")
      return
    }

    try {
      console.log("[WA] 🚀 Starting WhatsApp Bot Service...")

      // Activate all users when starting the bot
      const activatedCount = this.activateAllUsers()
      console.log(`[WA] ✅ Bot started - ${activatedCount} users activated automatically`)

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

      // Emit event for UI to refresh user table
      this.emit("users_bulk_updated", { action: "activated", count: activatedCount })
    } catch (error) {
      console.error("[WA] start() error:", error)
      this.status.error = error instanceof Error ? error.message : "Unknown error"
      await this.cleanup()
    }
  }

  private setupEventHandlers() {
    if (!this.client) return

    this.client.on("qr", async (qr: string) => {
      console.log("[WA] 🟡 QR Code received")
      try {
        this.status.qrCode = await qrcode.toDataURL(qr)
        this.emit("qr", this.status.qrCode)
        this.logStatus()
      } catch (error) {
        console.error("[WA] QR code generation error:", error)
      }
    })

    this.client.on("authenticated", () => {
      console.log("[WA] ✅ Authenticated")
      this.reconnectAttempts = 0
      this.emit("authenticated")
    })

    this.client.on("ready", () => {
      console.log("[WA] ✅ Client ready")
      this.status.isReady = true
      this.status.qrCode = undefined
      this.status.error = undefined
      this.emit("ready")
      this.logStatus()
    })

    this.client.on("disconnected", async (reason: string) => {
      console.log(`[WA] ❌ Disconnected: ${reason}`)
      this.emit("disconnected", reason)

      if (reason !== "LOGOUT" && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        console.log(`[WA] 🔄 Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

        await this.delay(this.reconnectDelay)
        await this.cleanRestart()
      } else {
        await this.cleanup()
      }
    })

    this.client.on("auth_failure", (msg) => {
      console.error("[WA] ❌ Authentication failure:", msg)
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
      const contact = this.contacts.find((c) => c.phone === phone) || { name: phone, phone }

      const message: ChatMessage = {
        from: msg.from,
        content: msg.body,
        timestamp: new Date(),
        isIncoming: true,
      }

      // Store the message
      if (!this.chatHistory[phone]) {
        this.chatHistory[phone] = []
      }
      this.chatHistory[phone].push(message)

      console.log(`[WA] 💬 Message from ${contact.name} (${phone}): ${msg.body}`)

      // Check if user is active before responding
      if (!this.isUserActive(phone)) {
        console.log(`[WA] 🚫 User ${contact.name} (${phone}) is INACTIVE - not responding`)
        this.emit("message", { contact, message, responded: false, reason: "User inactive" })
        return
      }

      console.log(`[WA] ✅ User ${contact.name} (${phone}) is ACTIVE - generating response`)
      this.emit("message", { contact, message, responded: true })

      // Process the message and generate reply
      const replyContent = await this.generateReply(msg.body, contact.name)
      if (replyContent) {
        await this.sendReply(msg.from, replyContent)
      }
    } catch (error) {
      console.error("[WA] Error processing message:", error)
    }
  }

  private async generateReply(message: string, contactName: string): Promise<string> {
    try {
      // Call your backend AI service
      const response = await fetch("https://dyna-99-bot-wa-blast.hf.space/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message,
          context: {
            contactName,
            service: "BPJS Ketenagakerjaan",
            timestamp: new Date().toISOString(),
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`AI service returned ${response.status}`)
      }

      const data = await response.json()

      // Return the AI's reply or a default message if none is provided
      return (
        data.reply ||
        `Halo ${contactName}, terima kasih telah menghubungi layanan BPJS Ketenagakerjaan. Mohon beri kami waktu untuk menanggapi pertanyaan Anda.`
      )
    } catch (error) {
      console.error("[WA] Error generating AI reply:", error)

      // Fallback reply if the AI service fails
      return `Halo ${contactName},

    Maaf, sedang ada gangguan teknis pada sistem kami. 
    Silakan coba lagi nanti atau hubungi call center kami di 175.

    Salam hormat,
    Layanan BPJS Ketenagakerjaan`
    }
  }

  async cleanRestart(): Promise<void> {
    try {
      await this.cleanup()
      await this.start()
    } catch (error) {
      console.error("[WA] Clean restart failed:", error)
      await this.cleanup()
    }
  }

  async stop(): Promise<void> {
    console.log("[WA] 🛑 Stopping WhatsApp Bot Service...")

    // Deactivate all users when stopping the bot
    const deactivatedCount = this.deactivateAllUsers()
    console.log(`[WA] ✅ Bot stopped - ${deactivatedCount} users deactivated automatically`)

    // Emit event for UI to refresh user table
    this.emit("users_bulk_updated", { action: "deactivated", count: deactivatedCount })

    await this.cleanup()
  }

  private reset() {
    if (this.isSendingMessages) {
      console.warn("[WA] ⏳ Postpone reset, still sending messages")
      setTimeout(() => this.reset(), 3000)
      return
    }

    this.client = null
    this.status.isRunning = false
    this.status.isReady = false
    this.status.qrCode = undefined
    this.logStatus()
  }

  async loadContacts(csvContent: string): Promise<number> {
    console.log("[WA] ===== LOADING CONTACTS FROM CSV =====")
    this.contacts = []

    try {
      const { headers, rows } = this.parseCSV(csvContent)
      const { nameIndex, phoneIndex } = this.findColumnIndices(headers)

      if (nameIndex === -1 || phoneIndex === -1) {
        throw new Error("Cannot find required name and phone columns in CSV")
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (row.length <= Math.max(nameIndex, phoneIndex)) continue

        const name = row[nameIndex]?.trim()
        const phoneRaw = row[phoneIndex]?.trim()
        if (!name || !phoneRaw) continue

        const phone = phoneRaw.replace(/\D/g, "")
        if (phone.length < 10) continue

        this.contacts.push({
          name: name,
          phone: phone,
        })
      }

      this.status.contactsCount = this.contacts.length
      console.log(`[WA] Loaded ${this.contacts.length} contacts for messaging`)
      this.logStatus()
      return this.contacts.length
    } catch (error) {
      console.error("[WA] Error loading contacts:", error)
      throw error
    }
  }

  async sendBulkMessages(messageTemplate: string): Promise<void> {
    if (!this.status.isReady || !this.client) {
      throw new Error("Client not ready")
    }

    this.status.messagesSent = 0
    this.isSendingMessages = true
    this.logStatus()

    console.log(`[WA] 🚀 Sending messages to ${this.contacts.length} contacts...`)

    for (const contact of this.contacts) {
      if (!this.status.isReady || !this.client) {
        console.warn(`[WA] ⚠️ Client disconnected before sending to ${contact.name}`)
        break
      }

      try {
        const chatId = `${contact.phone}@c.us`
        const chat = await this.client.getChatById(chatId).catch(() => null)
        if (!chat) {
          console.warn(`[WA] ⚠️ Chat not found for ${contact.name}`)
          continue
        }

        const message = messageTemplate.replace(/{name}/g, contact.name)
        await this.client.sendMessage(chatId, message)

        // Store sent message in history
        if (!this.chatHistory[contact.phone]) {
          this.chatHistory[contact.phone] = []
        }
        this.chatHistory[contact.phone].push({
          from: chatId,
          content: message,
          timestamp: new Date(),
          isIncoming: false,
        })

        this.status.messagesSent++
        console.log(`[WA] ✅ Sent to ${contact.name}`)

        await this.delay(3000 + Math.random() * 3000)
      } catch (error) {
        console.error(`[WA] ❌ Failed to send to ${contact.name}:`, error)

        if (error instanceof Error && error.message.includes("disconnected")) {
          console.warn("[WA] ⚠️ Connection error detected, attempting recovery...")
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
      console.warn("[WA] Cannot send reply - client not ready")
      return false
    }

    try {
      await this.client.sendMessage(to, message)

      // Store the sent message in history
      const phone = to.split("@")[0]
      if (!this.chatHistory[phone]) {
        this.chatHistory[phone] = []
      }
      this.chatHistory[phone].push({
        from: to,
        content: message,
        timestamp: new Date(),
        isIncoming: false,
      })

      console.log(`[WA] 📤 Reply sent to ${phone}`)
      this.emit("reply_sent", { to, message })
      return true
    } catch (error) {
      console.error(`[WA] Failed to send reply to ${to}:`, error)
      return false
    }
  }

  getChatHistory(phone: string): ChatMessage[] {
    return this.chatHistory[phone] || []
  }

  getContacts(): Contact[] {
    return [...this.contacts]
  }

  getStatus(): BotStatus {
    return { ...this.status, lastActivity: new Date() }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private logStatus(): void {
    console.log("[WA] Status:", JSON.stringify(this.status, null, 2))
  }
}

// Initialize global instance handler
if (process.env.NODE_ENV === "development") {
  if (!globalThis.whatsappService) {
    globalThis.whatsappService = WhatsAppService.getInstance()
    console.log("[WA] Initialized global instance for development")
  }
}
