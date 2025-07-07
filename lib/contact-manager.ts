// ===== CONTACT MANAGER (FIXED) =====
import type { Contact } from "./types/whatsapp"
import { PhoneNormalizer } from "./phone-normalizer"
import { CSVParser } from "./csv-parser"

export class ContactManager {
    private contacts: Contact[] = []

    async loadContactsFromCSV(csvContent: string): Promise<number> {
        console.log("[ContactManager] ===== LOADING CONTACTS FROM CSV =====")
        // ❌ MASALAH LAMA: this.contacts = [] // Clear semua contact sebelumnya
        // ✅ SOLUSI BARU: Tidak clear, biarkan terakumulasi seperti users

        const { headers, rows } = CSVParser.parse(csvContent)
        const { nameIndex, phoneIndex } = CSVParser.findColumnIndices(headers)

        if (nameIndex === -1 || phoneIndex === -1) {
            throw new Error("Cannot find required name and phone columns in CSV")
        }

        console.log(`[ContactManager] Processing ${rows.length} contact rows...`)
        console.log(`[ContactManager] Current contacts before import: ${this.contacts.length}`)

        let addedCount = 0
        let skippedCount = 0

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            if (row.length <= Math.max(nameIndex, phoneIndex)) continue

            const name = row[nameIndex]?.trim()
            const phoneRaw = row[phoneIndex]?.trim()

            if (!name || !phoneRaw) continue
            if (!PhoneNormalizer.isValid(phoneRaw)) continue

            const phone = PhoneNormalizer.normalize(phoneRaw)

            // ✅ TAMBAHAN: Check duplicate contact berdasarkan phone
            const existingContact = this.contacts.find((c) => c.phone === phone)
            if (existingContact) {
                console.log(
                    `[ContactManager] Contact with phone ${phone} already exists (${existingContact.name}), skipping ${name}`,
                )
                skippedCount++
                continue
            }

            this.contacts.push({ name, phone })
            addedCount++

            // Log first few contacts for debugging
            if (i < 3) {
                console.log(`[ContactManager] Added contact ${addedCount}: ${name} (${phone})`)
            }
        }

        console.log("[ContactManager] ===== CONTACT LOADING SUMMARY =====")
        console.log(`[ContactManager] Successfully added: ${addedCount}`)
        console.log(`[ContactManager] Skipped (duplicates): ${skippedCount}`)
        console.log(`[ContactManager] Total contacts in system: ${this.contacts.length}`)
        console.log(
            "[ContactManager] Sample contacts:",
            this.contacts.slice(0, 3).map((c) => `${c.name} (${c.phone})`),
        )

        return addedCount // Return jumlah yang ditambahkan, bukan total
    }

    getContacts(): Contact[] {
        return [...this.contacts]
    }

    getContactsCount(): number {
        return this.contacts.length
    }

    // ✅ TAMBAHAN: Method untuk clear contacts jika diperlukan
    clearContacts(): void {
        console.log(`[ContactManager] Clearing all ${this.contacts.length} contacts`)
        this.contacts = []
    }

    // ✅ TAMBAHAN: Method untuk remove duplicate contacts
    removeDuplicateContacts(): number {
        const uniqueContacts = new Map<string, Contact>()

        this.contacts.forEach((contact) => {
            if (!uniqueContacts.has(contact.phone)) {
                uniqueContacts.set(contact.phone, contact)
            }
        })

        const originalCount = this.contacts.length
        this.contacts = Array.from(uniqueContacts.values())
        const removedCount = originalCount - this.contacts.length

        console.log(`[ContactManager] Removed ${removedCount} duplicate contacts`)
        return removedCount
    }

    // ✅ TAMBAHAN: Method untuk get contact by phone
    getContactByPhone(phone: string): Contact | null {
        const normalizedPhone = PhoneNormalizer.normalize(phone)
        return this.contacts.find((c) => c.phone === normalizedPhone) || null
    }
}
