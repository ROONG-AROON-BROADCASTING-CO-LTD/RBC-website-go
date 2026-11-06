const origin = process.env.JOBS_BASE_URL ?? "http://web:3000";
const secret = process.env.JOBS_SECRET;
if (!secret || secret.length < 32)
  throw new Error("Set JOBS_SECRET (at least 32 characters)");
for (;;) {
  for (const job of ["email", "payments"]) {
    try {
      const response = await fetch(`${origin}/api/jobs/${job}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(120000),
      });
      console.log(`${new Date().toISOString()} ${job}: ${response.status}`);
    } catch {
      console.error(`${new Date().toISOString()} ${job}: unavailable`);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 60000));
}
