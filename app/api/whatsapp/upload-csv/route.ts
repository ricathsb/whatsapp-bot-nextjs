import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { parse } from "csv-parse/sync"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get("csv") as File

        if (!file) {
            return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
        }

        const text = await file.text()
        const records = parse(text, { columns: true, skip_empty_lines: true, trim: true })

        let contactsCount = 0
        let usersCount = 0

        for (const record of records) {
            const { nama, no_hp } = record

            // Skip if required fields are missing
            if (!nama?.trim() || !no_hp?.trim()) continue

            // Check if nasabah already exists by phone number
            const existingNasabah = await prisma.nasabah.findFirst({
                where: { no_hp: no_hp.trim() },
            })

            if (!existingNasabah) {
                // Create new nasabah
                await prisma.nasabah.create({
                    data: {
                        nama: nama.trim(),
                        no_hp: no_hp.trim(),
                        isSended: false,
                    },
                })
                usersCount++
            }

            contactsCount++
        }

        // Get total counts after upload
        const totalNasabah = await prisma.nasabah.count()

        return NextResponse.json({
            success: true,
            contactsCount: contactsCount,
            usersCount: usersCount,
            totalContactsCount: totalNasabah,
            totalUsersCount: totalNasabah,
            message: `${usersCount} new users added from ${contactsCount} contacts processed.`,
        })
    } catch (error) {
        console.error("Failed to upload CSV:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        )
    }
}
