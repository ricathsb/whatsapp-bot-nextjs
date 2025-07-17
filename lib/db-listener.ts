/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "pg"
import { UserManager } from "./user-manager" // Sesuaikan path

export class DatabaseListener {
  private client: Client
  private userManager: UserManager

  constructor(userManager: UserManager) {
    this.client = new Client({ connectionString: process.env.DATABASE_URL })
    this.userManager = userManager
  }

  async startListening() {
    try {
      await this.client.connect()
      await this.client.query("LISTEN nasabah_updated")
      
      this.client.on("notification", async (msg) => {
        console.log("📢 DB Change Detected:", msg.payload)
        
        try {
          const payload = JSON.parse(msg.payload)
          await this.handleNotification(payload)
        } catch (error) {
          console.error("Error processing notification:", error)
        }
      })

      console.log("🚀 Listening to nasabah_updated channel in PostgreSQL")
    } catch (error) {
      console.error("Failed to start database listener:", error)
      throw error
    }
  }

  private async handleNotification(payload: any) {
    const { operation, id, data } = payload
    
    switch (operation) {
      case 'INSERT':
      case 'UPDATE':
        await this.handleUpsert(data)
        break
      case 'DELETE':
        this.userManager.deleteUser(id)
        console.log(`🗑️ Deleted nasabah with ID: ${id}`)
        break
      default:
        console.warn(`Unknown operation: ${operation}`)
    }
  }

  private async handleUpsert(nasabahData: any) {
    const { id, nama, no_hp, isActive } = nasabahData
    
    if (!nama || !no_hp) {
      console.warn("Invalid nasabah data - missing nama or no_hp", nasabahData)
      return
    }

    const existingUser = this.userManager.getUsers().find(u => u.id === id)
    
    if (existingUser) {
      this.userManager.updateUser(id, {
        name: nama,
        phone: no_hp,
        isActive: isActive === true
      })
      console.log(`🔄 Updated nasabah with ID: ${id}`)
    } else {
      this.userManager.addUser(nama, no_hp, isActive === true, id)
      console.log(`➕ Added new nasabah with ID: ${id}`)
    }
  }

  async stopListening() {
    try {
      await this.client.end()
      console.log("🛑 Stopped database listener")
    } catch (error) {
      console.error("Error stopping database listener:", error)
    }
  }
}