import assert from "node:assert/strict";
import test from "node:test";
import nodemailer, { type SendMailOptions } from "nodemailer";
import {
  emailConfigurationIssues,
  emailSender,
} from "../src/lib/service-config";
import { sendTransactionalEmail } from "../src/lib/server/email";

test("Gmail configuration requires an app password and prevents sender impersonation", () => {
  const env = {
    EMAIL_PROVIDER: "gmail",
    GMAIL_USER: "sender@gmail.com",
    GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop",
  };
  assert.deepEqual(emailConfigurationIssues(env), []);
  assert.equal(emailSender(env), "RBC GO <sender@gmail.com>");
  assert.deepEqual(
    emailConfigurationIssues({
      ...env,
      EMAIL_FROM: "RBC GO <other@gmail.com>",
    }),
    ["EMAIL_FROM"],
  );
  assert.ok(
    emailConfigurationIssues({
      ...env,
      GMAIL_APP_PASSWORD: "ordinary-password",
    }).includes("GMAIL_APP_PASSWORD"),
  );
  assert.ok(
    emailConfigurationIssues({ EMAIL_PROVIDER: "unknown" }).includes(
      "EMAIL_PROVIDER",
    ),
  );
  assert.deepEqual(
    emailConfigurationIssues({
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "RBC GO <hello@example.test>",
    }),
    [],
  );
});

test("Gmail delivery uses encrypted SMTP, detects rejection and returns no credential details", async (context) => {
  const keys = [
    "EMAIL_PROVIDER",
    "GMAIL_USER",
    "GMAIL_APP_PASSWORD",
    "EMAIL_FROM",
    "RESEND_API_KEY",
  ] as const;
  const previous = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, {
    EMAIL_PROVIDER: "gmail",
    GMAIL_USER: "sender@gmail.com",
    GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop",
    EMAIL_FROM: "",
    RESEND_API_KEY: "",
  });
  const messages: SendMailOptions[] = [];
  let rejected = false;
  let fail = false;
  let closed = 0;
  context.mock.method(nodemailer, "createTransport", (options: unknown) => {
    assert.deepEqual(options, {
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: "sender@gmail.com", pass: "abcdefghijklmnop" },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    return {
      async sendMail(message: SendMailOptions) {
        if (fail) throw new Error("Provider error containing a secret");
        messages.push(message);
        return {
          accepted: rejected ? [] : ["customer@example.test"],
          rejected: rejected ? ["customer@example.test"] : [],
        };
      },
      close() {
        closed++;
      },
    };
  });
  try {
    const input = {
      to: "customer@example.test",
      subject: "Your code",
      text: "123456",
      idempotencyKey: "test-message",
    };
    await sendTransactionalEmail(input);
    await sendTransactionalEmail(input);
    assert.equal(messages[0].from, "RBC GO <sender@gmail.com>");
    assert.equal(messages[0].to, input.to);
    assert.equal(messages[0].text, input.text);
    assert.equal(messages[0].messageId, messages[1].messageId);
    rejected = true;
    await assert.rejects(sendTransactionalEmail(input), {
      message: "email_delivery_failed",
    });
    fail = true;
    await assert.rejects(sendTransactionalEmail(input), {
      message: "email_delivery_failed",
    });
    assert.equal(closed, 4);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
