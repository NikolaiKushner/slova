import { redirect } from "next/navigation";

import { SIGNED_IN_HOME } from "@/lib/auth.config";

export default function TasksPage() {
  redirect(SIGNED_IN_HOME);
}
