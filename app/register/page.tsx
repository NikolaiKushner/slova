import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 font-display text-3xl tracking-tight">
        Slova
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Create account</h1>
      <RegisterForm />
    </main>
  );
}
