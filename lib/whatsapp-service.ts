// ===== MAIN SERVICE (SINGLETON) =====
import { WhatsAppClient } from "./whatsapp-client"

// Declare global type
declare global {
  var whatsappService: WhatsAppService | undefined
}

export class WhatsAppService extends WhatsAppClient {
  private static instance: WhatsAppService

  private constructor() {
    super()
  }

  static getInstance(): WhatsAppService {
    // Use globalThis for development (hot reload)
    if (process.env.NODE_ENV === "development") {
      if (!globalThis.whatsappService) {
        globalThis.whatsappService = new WhatsAppService()
        console.log("[WhatsAppService] Created new instance in development mode")
      }
      return globalThis.whatsappService
    }

    // For production, use regular singleton
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService()
      console.log("[WhatsAppService] Created new instance in production mode")
    }
    return WhatsAppService.instance
  }
}

// Initialize global instance handler
if (process.env.NODE_ENV === "development") {
  if (!globalThis.whatsappService) {
    globalThis.whatsappService = WhatsAppService.getInstance()
    console.log("[WhatsAppService] Initialized global instance for development")
  }
}

// Export default instance
export default WhatsAppService.getInstance()
