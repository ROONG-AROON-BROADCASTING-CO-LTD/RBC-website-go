import { timingSafeEqual } from "node:crypto";
export function isAuthorizedJob(request: Request) {
  const secret = process.env.JOBS_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  return Boolean(
    secret &&
    secret.length >= 32 &&
    actual.length === expected.length &&
    timingSafeEqual(actual, expected),
  );
}
