"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Asking before something is destroyed.
 *
 * `confirm()` did this until now, and it looked like the browser talking
 * rather than the app — a grey box saying "localhost:3000 says", with buttons
 * in someone else's colours. It also blocks the whole page, which is why it
 * was never going to be the answer.
 *
 * Only deletion asks. Everything else here is reversible in a click, and a
 * dialog in front of a reversible action teaches people to dismiss dialogs.
 */
export function ConfirmDelete({
  title,
  description,
  action,
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  action?: string;
  onConfirm: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={children as React.ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {action ?? t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
