/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    const { isSended, name, phone } = body
    const dataToUpdate: any = {}

    if (typeof isSended !== "undefined") {
      if (typeof isSended !== "boolean") {
        return NextResponse.json(
            { success: false, error: "Invalid value for isSended" },
            { status: 400 }
        )
      }
      dataToUpdate.isSended = isSended
    }

    if (typeof name === "string" && name.trim() !== "") {
      dataToUpdate.nama = name.trim()
    }

    if (typeof phone === "string" && phone.trim() !== "") {
      dataToUpdate.no_hp = phone.trim()
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
          { success: false, error: "No valid fields to update" },
          { status: 400 }
      )
    }

    const updatedUser = await prisma.nasabah.update({
      where: { id },
      data: dataToUpdate,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.nama,
        phone: updatedUser.no_hp,
        isSended: updatedUser.isSended,
      },
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
        { success: false, error: "Something went wrong" },
        { status: 500 }
    )
  }
}
