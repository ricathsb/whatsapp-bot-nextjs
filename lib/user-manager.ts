// ===== USER MANAGER =====
import type { User } from "./types/whatsapp"
import { PhoneNormalizer } from "./phone-normalizer"
import { CSVParser } from "./csv-parser"

export class UserManager {
    private users: User[] = []

    addUser(name: string, phone: string): User {
        const normalizedPhone = PhoneNormalizer.normalize(phone)

        // Check if user already exists by phone
        const existingUserByPhone = this.users.find((u) => u.phone === normalizedPhone)
        if (existingUserByPhone) {
            console.log(`[UserManager] User with phone ${normalizedPhone} already exists, skipping ${name}`)
            return existingUserByPhone
        }

        const user: User = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name,
            phone: normalizedPhone,
            isActive: false, // Default to inactive for security
            createdAt: new Date(),
        }

        this.users.push(user)
        console.log(`[UserManager] Added new user: ${name} (${normalizedPhone})`)
        return user
    }

    getUsers(): User[] {
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
        console.log(`[UserManager] User ${user.name} status: ${user.isActive ? "ACTIVE" : "INACTIVE"}`)
        return user
    }

    activateAllUsers(): number {
        let activatedCount = 0
        this.users.forEach((user) => {
            if (!user.isActive) {
                user.isActive = true
                user.lastActivity = new Date()
                activatedCount++
            }
        })
        console.log(`[UserManager] 🟢 Activated ${activatedCount} users`)
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
        console.log(`[UserManager] 🔴 Deactivated ${deactivatedCount} users`)
        return deactivatedCount
    }

    getActiveUsers(): User[] {
        return this.users.filter((u) => u.isActive)
    }

    isUserActive(phone: string): boolean {
        const normalizedPhone = PhoneNormalizer.normalize(phone)
        const user = this.users.find((u) => u.phone === normalizedPhone)
        const isActive = user ? user.isActive : false

        if (user) {
            console.log(`[UserManager] User ${user.name}: ${isActive ? "ACTIVE" : "INACTIVE"}`)
        } else {
            console.log(`[UserManager] User NOT FOUND for phone: ${normalizedPhone}`)
        }

        return isActive
    }

    clearUsers(): void {
        console.log(`[UserManager] Clearing all ${this.users.length} users`)
        this.users = []
    }

    async loadUsersFromCSV(csvContent: string): Promise<number> {
        console.log("[UserManager] ===== LOADING USERS FROM CSV =====")

        const { headers, rows } = CSVParser.parse(csvContent)
        const { nameIndex, phoneIndex, suggestions } = CSVParser.findColumnIndices(headers)

        if (nameIndex === -1 || phoneIndex === -1) {
            const errorMessage = `Cannot find required columns in CSV.${suggestions}`
            console.error("[UserManager]", errorMessage)
            throw new Error(errorMessage)
        }

        let addedCount = 0
        let skippedCount = 0
        let errorCount = 0

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]

            if (row.length <= Math.max(nameIndex, phoneIndex)) {
                errorCount++
                continue
            }

            const name = row[nameIndex]?.trim()
            const phoneRaw = row[phoneIndex]?.trim()

            if (!name || !phoneRaw) {
                errorCount++
                continue
            }

            if (!PhoneNormalizer.isValid(phoneRaw)) {
                errorCount++
                continue
            }

            const phone = PhoneNormalizer.normalize(phoneRaw)
            const existingUser = this.users.find((u) => u.phone === phone)

            if (existingUser) {
                skippedCount++
                continue
            }

            this.addUser(name, phone)
            addedCount++
        }

        console.log("[UserManager] ===== CSV LOADING SUMMARY =====")
        console.log(`[UserManager] Successfully added: ${addedCount}`)
        console.log(`[UserManager] Skipped (duplicates): ${skippedCount}`)
        console.log(`[UserManager] Errors (invalid data): ${errorCount}`)
        console.log(`[UserManager] Total users in system: ${this.users.length}`)

        return addedCount
    }
}
