import {
  appOrigin,
  emailConfigurationIssues,
  emailProvider,
} from "../src/lib/service-config.ts";

const production = process.argv.includes("--production");
const issues = [];
function check(label, ready) {
  console.log(`${ready ? "OK" : "MISSING"} ${label}`);
  if (!ready) issues.push(label);
}
check("DATABASE_URL", Boolean(process.env.DATABASE_URL));
check("APP_BASE_URL", Boolean(appOrigin()));
for (const key of [
  "EMAIL_PROVIDER",
  ...(emailProvider() === "gmail"
    ? ["GMAIL_USER", "GMAIL_APP_PASSWORD"]
    : ["RESEND_API_KEY"]),
  "EMAIL_FROM",
])
  check(key, !emailConfigurationIssues().includes(key));
check(
  "PARTNER_OTP_SECRET (32+ characters)",
  (process.env.PARTNER_OTP_SECRET?.length ?? 0) >= 32,
);
check(
  "JOBS_SECRET (32+ characters)",
  (process.env.JOBS_SECRET?.length ?? 0) >= 32,
);
check(
  "Google OAuth environment",
  ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"].every(
    (key) => process.env[key],
  ),
);
const mode = process.env.OMISE_MODE ?? "test";
check("OMISE_MODE", mode === "test" || mode === "live");
check(
  `Omise ${mode} keys`,
  Boolean(
    process.env.OMISE_PUBLIC_KEY?.startsWith(`pkey_${mode}_`) &&
    process.env.OMISE_SECRET_KEY?.startsWith(`skey_${mode}_`),
  ),
);
check("OMISE_WEBHOOK_SECRET", Boolean(process.env.OMISE_WEBHOOK_SECRET));
console.log(
  "INFO Customer verification uses email OTP; Twilio is not required.",
);
console.log(
  "INFO Commission policy is stored in the database (migration 14), default 10%; manage it in Staff > Business overview.",
);
if (production) {
  check(
    "Live payment mode explicitly enabled",
    mode === "live" && process.env.ENABLE_LIVE_PAYMENTS === "true",
  );
  check("Public HTTPS origin", appOrigin()?.startsWith("https://"));
  check(
    "HTTPS Google callback matches origin",
    process.env.GOOGLE_REDIRECT_URI ===
      `${appOrigin()}/api/auth/google/callback`,
  );
}
console.log(
  `Configuration: ${issues.length ? `${issues.length} item(s) need attention` : "ready"}. No secret values printed.`,
);
process.exitCode = issues.length ? 1 : 0;
