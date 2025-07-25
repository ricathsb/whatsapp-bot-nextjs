// app/blasting/layout.tsx
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "@/app/globals.css"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
})

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
})

export const metadata: Metadata = {
    title: "Blasting | Dashboard",
    description: "Mass broadcast management",
}

export default function BlastingLayout({
                                           children,
                                       }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
        >
        {/* Tombol Back Cantik */}
        <div className="p-4">
            <Link
                href="https://dashboard.salutsoul.com"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-xl shadow-sm hover:bg-gray-100 transition"
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-medium text-sm">Back to Dashboard</span>
            </Link>
        </div>

        <main className="p-4">
            {children}
        </main>
        </body>
        </html>
    )
}
