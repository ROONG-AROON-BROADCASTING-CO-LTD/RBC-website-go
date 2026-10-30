"use client";

import { Button } from "@/components/ui/button";
import { useRBC } from "@/components/rbc/provider";
import { Panel } from "@/components/rbc/common";

export function AvailabilityCalendar() {
  const { state, setState, t } = useRBC();
  return (
    <Panel
      title="November 2026"
      description="Select dates to block or release."
    >
      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <p
            key={day}
            className="pb-3 text-center text-xs text-muted-foreground"
          >
            {t(day)}
          </p>
        ))}
        {Array.from({ length: 30 }, (_, i) => {
          const day = i + 1;
          const date = `2026-11-${String(day).padStart(2, "0")}`;
          const blocked = state.partner.blocked.includes(date);
          return (
            <Button
              key={day}
              variant={blocked ? "default" : "outline"}
              aria-label={`${day} ${t("November 2026")} · ${t(blocked ? "Blocked" : "Available")}`}
              aria-pressed={blocked}
              className="min-h-11 w-full px-1"
              onClick={() =>
                setState((s) => ({
                  ...s,
                  partner: {
                    ...s.partner,
                    blocked: blocked
                      ? s.partner.blocked.filter((d) => d !== date)
                      : [...s.partner.blocked, date],
                  },
                }))
              }
            >
              {day}
            </Button>
          );
        })}
      </div>
      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="size-3 rounded bg-primary" />
        {t("Blocked")} · {state.partner.blocked.length}
      </p>
    </Panel>
  );
}
