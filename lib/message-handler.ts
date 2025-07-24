// ===== MESSAGE HANDLER =====
import type { ChatMessage, ChatHistory, AIResponse } from "./types/whatsapp"

export class MessageHandler {
    private chatHistory: ChatHistory = {}

    addMessage(phone: string, message: ChatMessage): void {
        if (!this.chatHistory[phone]) {
            this.chatHistory[phone] = []
        }
        this.chatHistory[phone].push(message)
    }

    getChatHistory(phone: string): ChatMessage[] {
        return this.chatHistory[phone] || []
    }

    getAllChatHistory(): ChatHistory {
        return JSON.parse(JSON.stringify(this.chatHistory))
    }

    async generateReply(message: string, contactName: string): Promise<string> {
        try {
            console.log(`[MessageHandler] Generating AI reply for ${contactName}`)

            const response = await fetch("https://zepero-wa-blasting.hf.space/chat", {
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

            const data: AIResponse = await response.json()
            return data.reply || this.getFallbackMessage(contactName)
        } catch (error) {
            console.error("[MessageHandler] Error generating AI reply:", error)
            return this.getFallbackMessage(contactName)
        }
    }

    private getFallbackMessage(contactName: string): string {
        return `Halo ${contactName},

Maaf, sedang ada gangguan teknis pada sistem kami. 

Silakan coba lagi nanti atau hubungi call center kami di 175.

Salam hormat,
Layanan BPJS Ketenagakerjaan`
    }
}
