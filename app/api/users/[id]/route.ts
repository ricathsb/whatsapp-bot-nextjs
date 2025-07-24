/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// PUT /api/nasabah/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    // Terima baik field baru maupun lama untuk kompatibilitas
    const { nama, no_hp, nik, no_kpj, name, phone } = body

    const nameValue = nama || name
    const phoneValue = no_hp || phone

    if (!nameValue && !phoneValue && !nik && !no_kpj) {
      return NextResponse.json(
        { success: false, error: "No data provided" },
        { status: 400 }
      )
    }

    const updates: {
      nama?: string
      no_hp?: string
      nik?: string
      no_kpj?: string
    } = {}

    if (nameValue) updates.nama = nameValue.trim()
    if (phoneValue) updates.no_hp = phoneValue.replace(/\D/g, "")
    if (nik !== undefined) updates.nik = nik.trim()
    if (no_kpj !== undefined) updates.no_kpj = no_kpj.trim()

    const updatedNasabah = await prisma.nasabah.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedNasabah.id,
        nama: updatedNasabah.nama,
        no_hp: updatedNasabah.no_hp,
        nik: updatedNasabah.nik,
        no_kpj: updatedNasabah.no_kpj,
        isActive: updatedNasabah.isActive,
        status_langganan: updatedNasabah.status_langganan,
        updatedAt: updatedNasabah.updatedAt,
        userId: updatedNasabah.userId,
      },
    })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "User not found in database" },
        { status: 404 }
      )
    }

    console.error("Failed to update user:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// DELETE /api/nasabah/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const deletedNasabah = await prisma.nasabah.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: deletedNasabah.id,
        nama: deletedNasabah.nama,
        no_hp: deletedNasabah.no_hp,
        nik: deletedNasabah.nik,
        no_kpj: deletedNasabah.no_kpj,
      },
    })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "User not found in database" },
        { status: 404 }
      )
    }

    console.error("Failed to delete user:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
