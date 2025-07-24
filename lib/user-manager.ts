import { PrismaClient } from "@prisma/client"
import { Nasabah } from "./types/whatsapp"

const prisma = new PrismaClient()

export class UserManager {
  private users: Nasabah[] = []

  getUsers(): Nasabah[] {
    return this.users
  }

  addUser(name: string, phone: string): Nasabah {
    const newUser: Nasabah = {
      id: Date.now().toString(), // Atau gunakan UUID jika perlu
      nama: name,
      no_hp: phone,
      isSended: false,
    }
    this.users.push(newUser)
    return newUser
  }

  updateUser(id: string, updates: Partial<Nasabah>): Nasabah | null {
    const index = this.users.findIndex((u) => u.id === id)
    if (index === -1) return null

    this.users[index] = {
      ...this.users[index],
      ...updates,
    }

    return this.users[index]
  }

  deleteUser(id: string): boolean {
    const initialLength = this.users.length
    this.users = this.users.filter((u) => u.id !== id)
    return this.users.length < initialLength
  }

  deactivateAllUsers(): number {
    let count = 0
    this.users = this.users.map((u) => {
      if (u.isSended) count++
      return { ...u, isSended: false }
    })
    return count
  }

  clearUsers(): void {
    this.users = []
  }

  async loadUsersFromDatabase(): Promise<number> {
    const records = await prisma.nasabah.findMany()

    this.users = records.map((r) => ({
      id: r.id,
      nama: r.nama,
      no_hp: r.no_hp,
      isSended: r.isSended ?? false,
    }))

    return this.users.length
  }
}
