"use client";

import { Button } from "@/components/ui/button";
import { useRBC } from "@/components/rbc/provider";

export function SocialIcon({ provider }: { provider: "google" | "facebook" }) {
  return provider === "google" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.13H3.07v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.9a6 6 0 0 1 0-3.8V7.51H3.07a10 10 0 0 0 0 8.98l3.34-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.97c1.47 0 2.79.5 3.82 1.5l2.87-2.88A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.51l3.34 2.59C7.2 7.73 9.4 5.97 12 5.97Z"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <circle cx="12" cy="12" r="11" fill="#1877F2" />
      <path
        fill="white"
        d="M13.6 22.9v-7.7h2.6l.4-3.1h-3V10c0-.9.25-1.5 1.5-1.5h1.6V5.7c-.28-.04-1.25-.12-2.38-.12-2.35 0-3.96 1.43-3.96 4.06v2.46H7.7v3.1h2.66v7.7a11.4 11.4 0 0 0 3.24 0Z"
      />
    </svg>
  );
}

export function SocialButtons({
  onSelect,
}: {
  onSelect: (provider: "google" | "facebook") => void;
}) {
  const { t } = useRBC();
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        variant="outline"
        size="lg"
        aria-label={t("Continue with Google")}
        onClick={() => onSelect("google")}
      >
        <SocialIcon provider="google" />
        Google
      </Button>
      <Button
        variant="outline"
        size="lg"
        aria-label={t("Continue with Facebook")}
        onClick={() => onSelect("facebook")}
      >
        <SocialIcon provider="facebook" />
        Facebook
      </Button>
    </div>
  );
}
