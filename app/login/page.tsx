import { LoginForm } from "@/components/login-form"
import { AuthLayout } from "@/components/auth-layout"

export default function LoginPage() {
  return (
    <AuthLayout
      title="Masuk ke Akun Anda"
      subtitle="Kelola sistem WhatsApp Bot BPJS Ketenagakerjaan"
      showTransition="login"
    >
      <LoginForm />
    </AuthLayout>
  )
}
