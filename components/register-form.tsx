/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Eye, EyeOff, User, Mail, Lock, CheckCircle } from "lucide-react"
import { registerUser } from "@/lib/actions"

export function RegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    // Validation
    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok")
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password harus minimal 8 karakter")
      setIsLoading(false)
      return
    }

    if (!agreeTerms) {
      setError("Anda harus menyetujui syarat dan ketentuan")
      setIsLoading(false)
      return
    }

    try {
      const result = await registerUser(name, email, password)
      if (result.success) {
        setSuccess("Akun berhasil dibuat! Anda akan dialihkan ke halaman login...")
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        setError(result.error || "Pendaftaran gagal. Silakan coba lagi.")
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const passwordStrength = getPasswordStrength(password)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
            Nama Lengkap
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="name"
              type="text"
              placeholder="Masukkan nama lengkap Anda"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              className="pl-10 h-12 border-border focus:border-bpjs-blue focus:ring-bpjs-blue"
            />
          </div>
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="email"
              type="email"
              placeholder="nama@bpjsketenagakerjaan.go.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="pl-10 h-12 border-border focus:border-bpjs-blue focus:ring-bpjs-blue"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="pl-10 pr-10 h-12 border-border focus:border-bpjs-blue focus:ring-bpjs-blue"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {password && (
            <div className="space-y-2">
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full ${level <= passwordStrength
                      ? passwordStrength <= 2
                        ? "bg-red-500"
                        : passwordStrength <= 3
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      : "bg-gray-200"
                      }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-600">
                Kekuatan password:{" "}
                {passwordStrength <= 2
                  ? "Lemah"
                  : passwordStrength <= 3
                    ? "Sedang"
                    : passwordStrength <= 4
                      ? "Kuat"
                      : "Sangat Kuat"}
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
            Konfirmasi Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Ulangi password Anda"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              className="pl-10 pr-10 h-12 border-border focus:border-bpjs-blue focus:ring-bpjs-blue"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-red-600">Password tidak cocok</p>
          )}
        </div>

        {/* Terms Agreement */}
        <div className="flex items-start space-x-3">
          <Checkbox
            id="terms"
            checked={agreeTerms}
            onCheckedChange={setAgreeTerms}
            disabled={isLoading}
            className="mt-1"
          />
          <Label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
            Saya menyetujui{" "}
            <Link href="/terms" className="text-blue-600 hover:underline">
              Syarat dan Ketentuan
            </Link>{" "}
            serta{" "}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Kebijakan Privasi
            </Link>{" "}
            BPJS Ketenagakerjaan
          </Label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading || !agreeTerms}
          className="w-full h-12 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-bpjs-blue focus:ring-offset-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Membuat Akun...
            </>
          ) : (
            "Buat Akun"
          )}
        </Button>
      </form>

      {/* Login Link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-center"
      >
        <p className="text-sm text-gray-600">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-500 font-medium hover:underline transition-colors"
          >
            Masuk Sekarang
          </Link>
        </p>
      </motion.div>


    </motion.div>
  )
}
