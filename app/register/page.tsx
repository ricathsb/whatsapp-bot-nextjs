import { RegisterForm } from "@/components/register-form"
import { AuthLayout } from "@/components/auth-layout"

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Buat Akun Baru"
      subtitle="Daftar untuk mengakses sistem WhatsApp Bot BPJS"
      showTransition="register"
    >
      <RegisterForm />
    </AuthLayout>
  )
}
