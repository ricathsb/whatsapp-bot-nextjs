import qrcode from "qrcode";
import { Client, Message } from "whatsapp-web.js";
import { existsSync, mkdirSync } from "fs";
import { EventEmitter } from "events";

interface Contact {
  name: string;
  phone: string;
}

interface ChatMessage {
  from: string;
  content: string;
  timestamp: Date;
  isIncoming: boolean;
}

interface ChatHistory {
  [phone: string]: ChatMessage[];
}

interface BotStatus {
  isRunning: boolean;
  isReady: boolean;
  qrCode?: string;
  contactsCount: number;
  messagesSent: number;
  error?: string;
  lastActivity?: Date;
}

// Declare global type
declare global {
  var whatsappService: WhatsAppService | undefined;
}

export class WhatsAppService extends EventEmitter {
  private static instance: WhatsAppService;
  private client: Client | null = null;
  private contacts: Contact[] = [];
  private chatHistory: ChatHistory = {};
  private isSendingMessages = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 5000; // 5 seconds

  private status: BotStatus = {
    isRunning: false,
    isReady: false,
    contactsCount: 0,
    messagesSent: 0,
  };

  private constructor() {
    super();
    // Register cleanup on process exit
    process.on("exit", async () => {
      await this.cleanup();
    });
  }

  static getInstance(): WhatsAppService {
    // Use globalThis for development (hot reload)
    if (process.env.NODE_ENV === "development") {
      if (!globalThis.whatsappService) {
        globalThis.whatsappService = new WhatsAppService();
        console.log("[WA] Created new instance in development mode");
      }
      return globalThis.whatsappService;
    }

    // For production, use regular singleton
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
      console.log("[WA] Created new instance in production mode");
    }
    return WhatsAppService.instance;
  }


 

getAllChatHistory(): ChatHistory {
  // Return a deep copy of the entire chat history
  return JSON.parse(JSON.stringify(this.chatHistory));
}

  async cleanup() {
    console.log("[WA] Cleaning up resources...");
    try {
      if (this.client) {
        await this.client.destroy();
        console.log("[WA] Client destroyed successfully");
      }
    } catch (error) {
      console.error("[WA] Cleanup error:", error);
    } finally {
      this.client = null;
      this.status.isRunning = false;
      this.status.isReady = false;
      this.logStatus();
    }
  }

  async start(): Promise<void> {
    if (this.status.isRunning || this.client) {
      console.log("[WA] Already running or client exists");
      return;
    }

    try {
      const userDataDir = "./chrome-profile";
      if (!existsSync(userDataDir)) mkdirSync(userDataDir);

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
      });

      this.status.isRunning = true;
      this.status.error = undefined;
      this.reconnectAttempts = 0;
      this.logStatus();

      this.setupEventHandlers();
      await this.client.initialize();
    } catch (error) {
      console.error("[WA] start() error:", error);
      this.status.error = error instanceof Error ? error.message : "Unknown error";
      await this.cleanup();
    }
  }

  private setupEventHandlers() {
    if (!this.client) return;

    this.client.on("qr", async (qr: string) => {
      console.log("[WA] 🟡 QR Code received");
      try {
        this.status.qrCode = await qrcode.toDataURL(qr);
        this.emit('qr', this.status.qrCode);
        this.logStatus();
      } catch (error) {
        console.error("[WA] QR code generation error:", error);
      }
    });

    this.client.on("authenticated", () => {
      console.log("[WA] ✅ Authenticated");
      this.reconnectAttempts = 0;
      this.emit('authenticated');
    });

    this.client.on("ready", () => {
      console.log("[WA] ✅ Client ready");
      this.status.isReady = true;
      this.status.qrCode = undefined;
      this.status.error = undefined;
      this.emit('ready');
      this.logStatus();
    });

    this.client.on("disconnected", async (reason: string) => {
      console.log(`[WA] ❌ Disconnected: ${reason}`);
      this.emit('disconnected', reason);
      
      if (reason !== "LOGOUT" && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`[WA] 🔄 Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        await this.delay(this.reconnectDelay);
        await this.cleanRestart();
      } else {
        await this.cleanup();
      }
    });

    this.client.on("auth_failure", (msg) => {
      console.error("[WA] ❌ Authentication failure:", msg);
      this.status.error = "Authentication failed";
      this.emit('auth_failure', msg);
      this.cleanup();
    });

    this.client.on("message", async (msg: Message) => {
      await this.handleIncomingMessage(msg);
    });
  }

  private async handleIncomingMessage(msg: Message) {
    if (msg.fromMe) return;

    try {
      const phone = msg.from.split('@')[0];
      const contact = this.contacts.find(c => c.phone === phone) || { name: phone, phone };
      
      const message: ChatMessage = {
        from: msg.from,
        content: msg.body,
        timestamp: new Date(),
        isIncoming: true
      };

      // Store the message
      if (!this.chatHistory[phone]) {
        this.chatHistory[phone] = [];
      }
      this.chatHistory[phone].push(message);

      console.log(`[WA] 💬 Message from ${contact.name}: ${msg.body}`);
      this.emit('message', { contact, message });

      // Process the message and generate reply
      const replyContent = await this.generateReply(msg.body, contact.name);
      if (replyContent) {
        await this.sendReply(msg.from, replyContent);
      }
    } catch (error) {
      console.error('[WA] Error processing message:', error);
    }
  }

    private async generateReply(message: string, contactName: string): Promise<string> {
      try {
        // Call your backend AI service
        const response = await fetch("https://dyna-99-bot-wa-blast.hf.space/chat", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ 
            message,
            context: {
              contactName,
              service: "BPJS Ketenagakerjaan",
              timestamp: new Date().toISOString()
            }
          }),
        });

        if (!response.ok) {
          throw new Error(`AI service returned ${response.status}`);
        }

        const data = await response.json();
        
        // Return the AI's reply or a default message if none is provided
        return data.reply || `Halo ${contactName}, terima kasih telah menghubungi layanan BPJS Ketenagakerjaan. Mohon beri kami waktu untuk menanggapi pertanyaan Anda.`;
        
      } catch (error) {
        console.error('[WA] Error generating AI reply:', error);
        
        // Fallback reply if the AI service fails
        return `Halo ${contactName},

    Maaf, sedang ada gangguan teknis pada sistem kami. 
    Silakan coba lagi nanti atau hubungi call center kami di 175.

    Salam hormat,
    Layanan BPJS Ketenagakerjaan`;
      }
    }

  async cleanRestart(): Promise<void> {
    try {
      await this.cleanup();
      await this.start();
    } catch (error) {
      console.error("[WA] Clean restart failed:", error);
      await this.cleanup();
    }
  }

  async stop(): Promise<void> {
    console.log("[WA] stop()");
    await this.cleanup();
  }

  private reset() {
    if (this.isSendingMessages) {
      console.warn("[WA] ⏳ Postpone reset, still sending messages");
      setTimeout(() => this.reset(), 3000);
      return;
    }

    this.client = null;
    this.status.isRunning = false;
    this.status.isReady = false;
    this.status.qrCode = undefined;
    this.logStatus();
  }

  async loadContacts(csvContent: string): Promise<number> {
    this.contacts = [];

    const lines = csvContent.split("\n");
    const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const nameIndex = headers.findIndex((h) => h.includes("name"));
    const phoneIndex = headers.findIndex((h) => h.includes("phone"));

    if (nameIndex === -1 || phoneIndex === -1) {
      throw new Error("CSV must contain name and phone columns");
    }

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",").map((cell) => cell.trim());
      if (row.length > Math.max(nameIndex, phoneIndex) && row[nameIndex] && row[phoneIndex]) {
        const phone = row[phoneIndex].replace(/\D/g, "");
        if (phone.length < 10) continue;
        
        this.contacts.push({
          name: row[nameIndex],
          phone: phone,
        });
      }
    }

    this.status.contactsCount = this.contacts.length;
    this.logStatus();
    return this.contacts.length;
  }

  async sendBulkMessages(messageTemplate: string): Promise<void> {
    if (!this.status.isReady || !this.client) {
      throw new Error("Client not ready");
    }

    this.status.messagesSent = 0;
    this.isSendingMessages = true;
    this.logStatus();

    console.log(`[WA] 🚀 Sending messages to ${this.contacts.length} contacts...`);

    for (const contact of this.contacts) {
      if (!this.status.isReady || !this.client) {
        console.warn(`[WA] ⚠️ Client disconnected before sending to ${contact.name}`);
        break;
      }

      try {
        const chatId = `${contact.phone}@c.us`;
        const chat = await this.client.getChatById(chatId).catch(() => null);
        if (!chat) {
          console.warn(`[WA] ⚠️ Chat not found for ${contact.name}`);
          continue;
        }

        const message = messageTemplate.replace(/{name}/g, contact.name);
        await this.client.sendMessage(chatId, message);
        
        // Store sent message in history
        if (!this.chatHistory[contact.phone]) {
          this.chatHistory[contact.phone] = [];
        }
        this.chatHistory[contact.phone].push({
          from: chatId,
          content: message,
          timestamp: new Date(),
          isIncoming: false
        });

        this.status.messagesSent++;
        console.log(`[WA] ✅ Sent to ${contact.name}`);

        await this.delay(3000 + Math.random() * 3000);
      } catch (error) {
        console.error(`[WA] ❌ Failed to send to ${contact.name}:`, error);
        
        if (error instanceof Error && error.message.includes("disconnected")) {
          console.warn("[WA] ⚠️ Connection error detected, attempting recovery...");
          await this.cleanRestart();
          break;
        }
      }
    }

    this.isSendingMessages = false;
    this.logStatus();
  }

  async sendReply(to: string, message: string): Promise<boolean> {
    if (!this.status.isReady || !this.client) {
      console.warn('[WA] Cannot send reply - client not ready');
      return false;
    }

    try {
      await this.client.sendMessage(to, message);
      
      // Store the sent message in history
      const phone = to.split('@')[0];
      if (!this.chatHistory[phone]) {
        this.chatHistory[phone] = [];
      }
      this.chatHistory[phone].push({
        from: to,
        content: message,
        timestamp: new Date(),
        isIncoming: false
      });

      console.log(`[WA] 📤 Reply sent to ${phone}`);
      this.emit('reply_sent', { to, message });
      return true;
    } catch (error) {
      console.error(`[WA] Failed to send reply to ${to}:`, error);
      return false;
    }
  }

  getChatHistory(phone: string): ChatMessage[] {
    return this.chatHistory[phone] || [];
  }

  getContacts(): Contact[] {
    return [...this.contacts];
  }

  getStatus(): BotStatus {
    return { ...this.status, lastActivity: new Date() };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private logStatus(): void {
    console.log("[WA] Status:", JSON.stringify(this.status, null, 2));
  }
}

// Initialize global instance handler
if (process.env.NODE_ENV === "development") {
  if (!globalThis.whatsappService) {
    globalThis.whatsappService = WhatsAppService.getInstance();
    console.log("[WA] Initialized global instance for development");
  }
}

