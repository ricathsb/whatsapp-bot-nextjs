import type { Contact } from "./types/whatsapp";
import { PhoneNormalizer } from "./phone-normalizer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class ContactManager {
  private contacts: Contact[] = [];

  async loadContactsFromDatabase(): Promise<number> {
    try {
      console.log("[ContactManager] ===== LOADING CONTACTS FROM DATABASE =====");
      console.log(`[ContactManager] Current contacts before import: ${this.contacts.length}`);

            const nasabahList = await prisma.nasabah.findMany({
        select: {
          nama: true,
          no_hp: true,
          isActive: true, // ✅ tambahkan ini
        },
      });


      if (!nasabahList || nasabahList.length === 0) {
        console.warn("[ContactManager] No contacts found in database");
        return this.contacts.length;
      }

      let addedCount = 0;
      let skippedCount = 0;
      let invalidCount = 0;

      for (const n of nasabahList) {
        try {
          const name = n.nama?.trim() || "";
          const phoneRaw = n.no_hp?.trim() || "";

          if (!name || !phoneRaw) {
            skippedCount++;
            continue;
          }

          if (!PhoneNormalizer.isValid(phoneRaw)) {
            console.log(`[ContactManager] Invalid phone number format: ${phoneRaw}`);
            invalidCount++;
            continue;
          }

          const phone = PhoneNormalizer.normalize(phoneRaw);

          const existingContact = this.contacts.find((c) => c.phone === phone);
          if (existingContact) {
            console.log(`[ContactManager] Duplicate phone ${phone} (existing: ${existingContact.name}, new: ${name})`);
            skippedCount++;
            continue;
          }

        this.contacts.push({ name, phone, isActive: n.isActive ?? true });
          addedCount++;
        } catch (error) {
          console.error(`[ContactManager] Error processing contact ${JSON.stringify(n)}:`, error);
          invalidCount++;
        }
      }

      console.log("[ContactManager] ===== CONTACT LOADING SUMMARY =====");
      console.log(`[ContactManager] Total in database: ${nasabahList.length}`);
      console.log(`[ContactManager] Successfully added: ${addedCount}`);
      console.log(`[ContactManager] Skipped duplicates: ${skippedCount}`);
      console.log(`[ContactManager] Invalid entries: ${invalidCount}`);
      console.log(`[ContactManager] Total contacts now: ${this.contacts.length}`);

      if (this.contacts.length > 0) {
        console.log(
          "[ContactManager] Sample contacts:",
          this.contacts.slice(0, 3).map((c) => `${c.name} (${c.phone})`)
        );
      }

      return this.contacts.length;
    } catch (error) {
      console.error("[ContactManager] Database error:", error);
      throw error;
    }
  }

  getContacts(): Contact[] {
    return [...this.contacts];
  }

  getContactsCount(): number {
    return this.contacts.length;
  }

  clearContacts(): void {
    console.log(`[ContactManager] Clearing all ${this.contacts.length} contacts`);
    this.contacts = [];
  }

  removeDuplicateContacts(): number {
    const uniqueContacts = new Map<string, Contact>();
    this.contacts.forEach((contact) => {
      if (!uniqueContacts.has(contact.phone)) {
        uniqueContacts.set(contact.phone, contact);
      }
    });

    const originalCount = this.contacts.length;
    this.contacts = Array.from(uniqueContacts.values());
    const removedCount = originalCount - this.contacts.length;

    if (removedCount > 0) {
      console.log(`[ContactManager] Removed ${removedCount} duplicate contacts`);
    }
    return removedCount;
  }

  getContactByPhone(phone: string): Contact | null {
    try {
      const normalizedPhone = PhoneNormalizer.normalize(phone);
      return this.contacts.find((c) => c.phone === normalizedPhone) || null;
    } catch (error) {
      console.error(`[ContactManager] Error finding contact for phone ${phone}:`, error);
      return null;
    }
  }

  async refreshContacts(): Promise<number> {
    this.clearContacts();
    return this.loadContactsFromDatabase();
  }
}