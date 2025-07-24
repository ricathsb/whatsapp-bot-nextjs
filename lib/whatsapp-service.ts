// ===== MAIN SERVICE (SINGLETON) =====
import { WhatsAppClient } from "./whatsapp-client"

declare global {
  var whatsappService: WhatsAppService | undefined
}

export class WhatsAppService extends WhatsAppClient {
  private static instance: WhatsAppService

  private constructor() {
    super()
  }

  static getInstance(): WhatsAppService {
    if (process.env.NODE_ENV === "development") {
      if (!globalThis.whatsappService) {
        const instance = new WhatsAppService()
        globalThis.whatsappService = instance
        console.log("[WhatsAppService] Created new instance in development mode")
        return instance
      }
      return globalThis.whatsappService
    }

    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService()
      console.log("[WhatsAppService] Created new instance in production mode")
    }

    return WhatsAppService.instance
  }
}

// Inisialisasi global (opsional tapi baik untuk dev mode hot reload)
if (process.env.NODE_ENV === "development") {
  if (!globalThis.whatsappService) {
    globalThis.whatsappService = WhatsAppService.getInstance()
    console.log("[WhatsAppService] Initialized global instance for development")
  }
}

export default WhatsAppService.getInstance()
