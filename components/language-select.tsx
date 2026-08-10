"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANG_OPTIONS, type LangCode } from "@/lib/languages";

const ITEMS = LANG_OPTIONS.map((lang) => ({
  value: lang.code,
  label: lang.label,
}));

type Props = {
  id: string;
  label: string;
  value: LangCode;
  onChange: (value: LangCode) => void;
};

/** Labelled language picker — the translate direction on both sides of a swap. */
export function LanguageSelect({ id, label, value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        items={ITEMS}
        value={value}
        onValueChange={(next) => onChange(next as LangCode)}
      >
        <SelectTrigger id={id} className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
