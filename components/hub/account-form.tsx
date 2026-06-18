"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type ActionResult,
  updatePasswordAction,
  updateProfileAction,
} from "@/app/(hub)/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function Notice({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  if (result.error) {
    return (
      <p role="alert" className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
        {result.error}
      </p>
    );
  }
  if (result.notice) {
    return (
      <p className="rounded-md border border-success/30 bg-success-bg px-3 py-2 text-sm text-success">
        {result.notice}
      </p>
    );
  }
  return null;
}

export function AccountForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [nameValue, setNameValue] = useState(name);
  const [password, setPassword] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [nameResult, setNameResult] = useState<ActionResult | null>(null);
  const [pwResult, setPwResult] = useState<ActionResult | null>(null);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameResult(null);
    const res = await updateProfileAction({ name: nameValue });
    setSavingName(false);
    setNameResult(res);
    if (!res.error) router.refresh();
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPw(true);
    setPwResult(null);
    const res = await updatePasswordAction({ password });
    setSavingPw(false);
    setPwResult(res);
    if (!res.error) setPassword("");
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hồ sơ</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="space-y-4" noValidate>
            <Notice result={nameResult} />
            <Field label="Tên hiển thị" htmlFor="acc-name">
              <Input
                id="acc-name"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                placeholder="Tên của bạn"
              />
            </Field>
            <Field label="Email" htmlFor="acc-email">
              <Input id="acc-email" value={email} disabled readOnly />
            </Field>
            <Button type="submit" loading={savingName} disabled={nameValue.trim() === name.trim()}>
              Lưu hồ sơ
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Đổi mật khẩu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4" noValidate>
            <Notice result={pwResult} />
            <Field label="Mật khẩu mới" htmlFor="acc-pw">
              <Input
                id="acc-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                autoComplete="new-password"
              />
            </Field>
            <Button type="submit" loading={savingPw} disabled={password.length < 6}>
              Đổi mật khẩu
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
