import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    // Call your Flask AI service
    const response = await fetch("https://dyna-99-bot-wa-blast.hf.space", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    })

    const data = await response.json()

    return NextResponse.json({ reply: data.reply || "Sorry, I could not process your message." })
  } catch (error) {
    console.error("AI webhook error:", error)
    return NextResponse.json({ reply: "Sorry, there was an error processing your message." })
  }
}
