import { redirect } from "next/navigation";

import { SIGNED_IN_HOME } from "@/lib/auth.config";

export default function TodayPage() {
  redirect(SIGNED_IN_HOME);
}
