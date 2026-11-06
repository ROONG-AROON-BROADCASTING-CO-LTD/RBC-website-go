type Environment = Record<string, string | undefined>;

export function emailProvider(env: Environment = process.env) {
  return env.EMAIL_PROVIDER?.trim() || "resend";
}

export function emailSender(env: Environment = process.env) {
  return (
    env.EMAIL_FROM?.trim() ||
    (emailProvider(env) === "gmail" && env.GMAIL_USER
      ? `RBC GO <${env.GMAIL_USER.trim()}>`
      : "")
  );
}

export function emailConfigurationIssues(env: Environment = process.env) {
  const issues: string[] = [];
  const provider = emailProvider(env);
  const sender = emailSender(env);
  const address = sender.match(/<([^<>]+)>/)?.[1] ?? sender;
  if (provider === "gmail") {
    if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(env.GMAIL_USER ?? ""))
      issues.push("GMAIL_USER");
    if (
      !/^[a-z0-9]{16}$/i.test((env.GMAIL_APP_PASSWORD ?? "").replace(/\s/g, ""))
    )
      issues.push("GMAIL_APP_PASSWORD");
    if (address.toLowerCase() !== env.GMAIL_USER?.toLowerCase())
      issues.push("EMAIL_FROM");
  } else if (provider === "resend") {
    if (!env.RESEND_API_KEY?.startsWith("re_")) issues.push("RESEND_API_KEY");
  } else issues.push("EMAIL_PROVIDER");
  if (
    !address ||
    !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(address) ||
    /YOUR_DOMAIN/i.test(address) ||
    /[\r\n]/.test(sender)
  )
    issues.push("EMAIL_FROM");
  return [...new Set(issues)];
}

export function appOrigin(env: Environment = process.env) {
  try {
    const url = new URL(env.APP_BASE_URL ?? "");
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      )
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}
