"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-4">
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={loading}
        onClick={() => {
          setLoading(true);
          signIn("google", { redirectTo: "/home" });
        }}
      >
        {loading ? "Opening Google…" : "Continue with Google"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        First time here? Signing in creates your account.
      </p>
    </div>
  );
}
