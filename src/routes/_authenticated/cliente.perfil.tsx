import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientGetProfile, clientUpdateProfile } from "@/lib/admin-content.functions";

export const Route = createFileRoute("/_authenticated/cliente/perfil")({ component: Perfil });

function Perfil() {
  const get = useServerFn(clientGetProfile);
  const save = useServerFn(clientUpdateProfile);
  const [form, setForm] = useState<any>({ full_name: "", phone: "", location: "" });
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get().then((d: any) => {
      setForm({
        full_name: d.profile?.full_name ?? d.customer?.full_name ?? "",
        phone: d.profile?.phone ?? d.customer?.phone ?? "",
        location: d.customer?.location ?? "",
      });
      setEmail(d.profile?.email ?? "");
    }); /* eslint-disable-line */
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await save({ data: form });
      toast.success("Perfil actualizado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl">Mi perfil</h1>
      <form
        onSubmit={onSubmit}
        className="mt-6 space-y-4 bg-warm-white border border-sand/60 rounded-xl p-6"
      >
        <div>
          <Label>Email</Label>
          <Input value={email} disabled />
        </div>
        <div>
          <Label>Nombre completo *</Label>
          <Input
            required
            value={form.full_name}
            onChange={(e) => setForm((f: any) => ({ ...f, full_name: e.target.value }))}
          />
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div>
          <Label>Ubicación</Label>
          <Input
            value={form.location}
            onChange={(e) => setForm((f: any) => ({ ...f, location: e.target.value }))}
            placeholder="Lima, Perú"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>
    </div>
  );
}
