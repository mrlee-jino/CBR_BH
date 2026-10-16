"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export function SecurityForm({ factorId, verified }: { factorId?: string; verified: boolean }) {
  const [enrollment, setEnrollment] = useState<{ id: string; qr: string; secret: string } | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function enroll() {
    setPending(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      for (const factor of factors.all.filter(
        (item) => item.factor_type === "totp" && item.status === "unverified",
      ))
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "PuyoHub authenticator",
      });
      if (error) throw error;
      setEnrollment({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch {
      setMessage("Couldn’t start authenticator setup. Please try again.");
    } finally {
      setPending(false);
    }
  }
  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    const id = enrollment?.id ?? factorId;
    if (!id || !/^\d{6}$/.test(code)) {
      setMessage("Enter the six-digit code from your authenticator.");
      setPending(false);
      return;
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: id, code });
      if (error) throw error;
      setEnrollment(null);
      router.refresh();
    } catch {
      setMessage("That code could not be verified. Try the current code from your authenticator.");
    } finally {
      setPending(false);
    }
  }
  if (verified)
    return (
      <p className="form-message success" role="status">
        Authenticator verification is complete for this session. Admin permissions still require an
        assigned admin role.
      </p>
    );
  return (
    <div className="auth-form">
      {!factorId && !enrollment && (
        <button className="button" onClick={enroll} disabled={pending}>
          {pending ? "Preparing…" : "Set up an authenticator"}
        </button>
      )}
      {enrollment && (
        <div className="mfa-setup">
          <p>Scan this QR code with your authenticator app. Keep the setup key private.</p>
          <Image
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.qr)}`}
            alt="Authenticator setup QR code; keep it private"
            width={200}
            height={200}
            unoptimized
          />
          <details>
            <summary>Enter the setup key manually</summary>
            <code>{enrollment.secret}</code>
          </details>
        </div>
      )}
      {(enrollment || factorId) && (
        <form onSubmit={verify} className="auth-form">
          <div className="field">
            <label htmlFor="code">Authenticator code</label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
            />
          </div>
          <button className="button" disabled={pending}>
            {pending ? "Verifying…" : "Verify authenticator"}
          </button>
        </form>
      )}
      {message && (
        <p className="form-message" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
