"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Building2, MessageSquare, Users, Shield } from "lucide-react"

interface AuthLayoutProps {
    children: React.ReactNode
    title: string
    subtitle: string
    showTransition: "login" | "register"
}

export function AuthLayout({ children, title, subtitle, showTransition }: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex overflow-hidden">
            {/* Left Side - BPJS Branding */}
            <motion.div
                initial={{ x: showTransition === "login" ? -100 : 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="hidden lg:flex lg:w-1/2 relative"
            >
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-bpjs-gradient">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
                    {/* Header */}
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm glass-morphism">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">BPJS Ketenagakerjaan</h1>
                            <p className="text-blue-100 text-sm">WhatsApp Bot System</p>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="space-y-8">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                            className="space-y-4"
                        >
                            <h2 className="text-4xl font-bold leading-tight">
                                Percepat Layanan
                                <br />
                                dengan WhatsApp Bot
                            </h2>
                            <p className="text-blue-100 text-lg leading-relaxed">
                                Sistem otomatis untuk mengelola pesan massal dan layanan pelanggan BPJS Ketenagakerjaan dengan teknologi
                                WhatsApp Web yang terintegrasi.
                            </p>
                        </motion.div>

                        {/* Features */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                            className="grid grid-cols-1 gap-4"
                        >
                            <div className="flex items-center space-x-3 text-blue-100">
                                <MessageSquare className="w-5 h-5 text-blue-300" />
                                <span>Pesan massal otomatis</span>
                            </div>
                            <div className="flex items-center space-x-3 text-blue-100">
                                <Users className="w-5 h-5 text-blue-300" />
                                <span>Manajemen pengguna terintegrasi</span>
                            </div>
                            <div className="flex items-center space-x-3 text-blue-100">
                                <Shield className="w-5 h-5 text-blue-300" />
                                <span>Keamanan data terjamin</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Footer */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.7, duration: 0.6 }}
                        className="flex items-center justify-between"
                    >
                        <div className="text-blue-200 text-sm">BPJS Ketenagakerjaan</div>
                       
                    </motion.div>
                </div>
            </motion.div>

            {/* Right Side - Form */}
            <motion.div
                initial={{ x: showTransition === "login" ? 100 : -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50"
            >
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile Header */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="flex items-center justify-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left">
                                <h1 className="text-xl font-bold text-gray-900">BPJS Ketenagakerjaan</h1>
                                <p className="text-gray-600 text-sm">WhatsApp Bot System</p>
                            </div>
                        </div>
                    </div>

                    {/* Form Header */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="text-center space-y-2"
                    >
                        <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
                        <p className="text-gray-600">{subtitle}</p>
                    </motion.div>

                    {/* Form */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                    >
                        {children}
                    </motion.div>
                </div>
            </motion.div>
        </div>
    )
}
