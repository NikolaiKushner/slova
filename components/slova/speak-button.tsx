"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, LoaderCircle, TriangleAlert, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { speak } from "@/lib/practice/speech";
import { cn } from "@/lib/utils";

type SpeakMode = "normal" | "slow";

export function SpeakButton({
  text,
  normalUrl,
  slowUrl,
  disabled = false,
  className,
}: {
  text: string;
  normalUrl?: string | null;
  slowUrl?: string | null;
  disabled?: boolean;
  className?: string;
}) {
  const t = useTranslations("courses");
  const [playing, setPlaying] = useState<SpeakMode | null>(null);
  const [error, setError] = useState<SpeakMode | null>(null);
  const request = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current += 1;
    };
  }, []);

  const unavailable = disabled || !text.trim();

  async function play(mode: SpeakMode) {
    if (unavailable || playing) return;

    const id = ++request.current;
    setPlaying(mode);
    setError(null);

    const isSlow = mode === "slow";
    const started = await speak(
      text,
      isSlow ? (slowUrl ?? normalUrl) : normalUrl,
      {
        ...(isSlow
          ? {
              rate: 0.6,
              recordingRate: slowUrl ? 1 : undefined,
            }
          : {}),
        onEnd: () => {
          if (mounted.current && request.current === id) setPlaying(null);
        },
      },
    );

    if (!started && mounted.current && request.current === id) {
      setPlaying(null);
      setError(mode);
    }
  }

  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-2", className)}
      role="group"
      aria-label={t("audioControls")}
    >
      <SpeakControl
        mode="normal"
        label={t("listenNormal")}
        errorLabel={t("audioError")}
        playing={playing === "normal"}
        error={error === "normal"}
        disabled={unavailable || playing !== null}
        onClick={() => void play("normal")}
      />
      <SpeakControl
        mode="slow"
        label={t("listenSlow")}
        errorLabel={t("audioError")}
        playing={playing === "slow"}
        error={error === "slow"}
        disabled={unavailable || playing !== null}
        onClick={() => void play("slow")}
      />
    </span>
  );
}

function SpeakControl({
  mode,
  label,
  errorLabel,
  playing,
  error,
  disabled,
  onClick,
}: {
  mode: SpeakMode;
  label: string;
  errorLabel: string;
  playing: boolean;
  error: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const tooltip = error ? errorLabel : label;
  const Icon = error ? TriangleAlert : mode === "normal" ? Volume2 : Clock;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={tooltip}
            aria-invalid={error || undefined}
            aria-pressed={playing}
            disabled={disabled || playing}
            onClick={onClick}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              error && "text-destructive hover:text-destructive",
              playing && "bg-secondary text-foreground",
            )}
          />
        }
      >
        {playing ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <Icon aria-hidden="true" />
        )}
      </TooltipTrigger>
      <TooltipContent className="coarse:hidden">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
