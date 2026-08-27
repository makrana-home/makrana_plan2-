import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, CheckCircle2, Send } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitComplaintBookEntry, type ComplaintBookInput } from "@/lib/complaint-book.functions";

export const Route = createFileRoute("/_public/libro-de-reclamaciones")({
  head: () => ({ meta: [{ title: "Libro de Reclamaciones | Makrana Home Art" }] }),
  component: LibroDeReclamaciones,
});

const fieldClass = "mt-2 bg-warm-white";
const selectClass = "mt-2 h-10 w-full rounded-md border border-input bg-warm-white px-3 text-sm";

function LibroDeReclamaciones() {
  const submitEntry = useServerFn(submitComplaintBookEntry);
  const [submitting, setSubmitting] = useState(false);
  const [claimNumber, setClaimNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form)) as Record<string, FormDataEntryValue>;
    try {
      const result = await submitEntry({
        data: {
          ...values,
          claimed_amount: values.claimed_amount || "",
          sworn_declaration: values.sworn_declaration === "on",
          contact_authorization: values.contact_authorization === "on",
        } as unknown as ComplaintBookInput,
      });
      setClaimNumber(result.claimNumber);
      form.reset();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause: any) {
      setError(cause?.message ?? "No se pudo registrar la solicitud. Inténtalo nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-warm-white py-12 sm:py-16 md:py-20">
      <div className="container-makrana max-w-5xl">
        <header className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-brand-terracotta">
            <BookOpen className="h-7 w-7" />
          </span>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-terracotta">
            Atención al consumidor
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
            Libro de Reclamaciones
          </h1>
        </header>

        {claimNumber && (
          <div
            role="status"
            className="mx-auto mt-8 max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-900"
          >
            <CheckCircle2 className="mx-auto h-7 w-7" />
            <p className="mt-2 font-semibold">Tu solicitud fue registrada correctamente.</p>
            <p className="mt-1 text-sm">
              Código de seguimiento: <strong>{claimNumber}</strong>
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-8 rounded-3xl border border-sand bg-cream/55 p-5 shadow-sm sm:p-8"
        >
          <FormSection title="Identificación del reclamante" required>
            <Field label="Nombres" name="first_name" required />
            <Field label="Primer apellido" name="first_surname" required />
            <Field label="Segundo apellido" name="second_surname" required />
            <SelectField
              label="Tipo de documentación"
              name="document_type"
              options={["DNI", "RUC", "CE", "Pasaporte"]}
            />
            <Field label="Número de documentación" name="document_number" required />
            <Field label="Celular" name="phone" type="tel" required />
            <Field label="Departamento" name="department" required />
            <Field label="Provincia" name="province" required />
            <Field label="Distrito" name="district" required />
            <Field label="Dirección" name="address" required />
            <Field label="Referencia" name="reference" />
            <Field label="Correo electrónico" name="email" type="email" required />
          </FormSection>

          <FormSection title="Detalle del reclamo y orden del consumidor" required>
            <SelectField
              label="Tipo de reclamo"
              name="claim_type"
              options={["Reclamación", "Queja"]}
            />
            <SelectField
              label="Tipo de consumo"
              name="consumption_type"
              options={["Producto", "Servicio"]}
            />
            <Field label="N.º de pedido" name="order_number" required />
            <Field
              label="Fecha de reclamación / queja"
              name="claim_date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
            <Field label="Proveedor" name="provider" />
            <Field
              label="Monto reclamado (S/.)"
              name="claimed_amount"
              type="number"
              step="0.01"
              min="0"
            />
            <TextField
              label="Descripción del producto o servicio"
              name="product_description"
              rows={3}
            />
            <Field label="Fecha de compra" name="purchase_date" type="date" />
            <Field label="Fecha de consumo" name="consumption_date" type="date" />
            <Field label="Fecha de caducidad" name="expiration_date" type="date" />
            <TextField
              label="Detalle de la Reclamación / Queja, según lo indicado por el cliente"
              name="claim_detail"
              rows={4}
              required
              wide
            />
            <TextField label="Pedido del cliente" name="customer_request" rows={4} required wide />
          </FormSection>

          <div className="rounded-2xl border border-sand/70 bg-warm-white/70 p-5 text-xs leading-relaxed text-muted-foreground">
            <p>
              <strong>(1) Reclamación:</strong> Desacuerdo relacionado con productos y/o servicios.{" "}
              <strong>(2) Queja:</strong> Desacuerdo no relacionado con productos y/o servicios, o
              malestar con la atención al público.
            </p>
            <label className="mt-4 flex items-start gap-3">
              <input
                name="sworn_declaration"
                type="checkbox"
                required
                className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
              />
              <span>
                Declaro que soy el dueño del servicio y acepto el contenido de este formulario bajo
                Declaración Jurada sobre la veracidad de los hechos descritos.
              </span>
            </label>
            <label className="mt-4 flex items-start gap-3">
              <input
                name="contact_authorization"
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
              />
              <span>
                Autorizo ser contactado después de la tramitación para evaluar la calidad y
                satisfacción del proceso de atención.
              </span>
            </label>
            <div className="mt-5 space-y-2 border-t border-sand pt-4">
              <p>
                La formulación del reclamo no excluye el recurso a otros medios de resolución de
                controversias ni es requisito previo para presentar una denuncia ante el Indecopi.
              </p>
              <p>
                El proveedor debe responder la reclamación en un plazo no superior a quince (15)
                días hábiles improrrogables.
              </p>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" variant="hero" disabled={submitting} className="rounded-full px-7">
            <Send className="h-4 w-4" />
            {submitting ? "Registrando..." : "Enviar reclamo"}
          </Button>
        </form>
      </div>
    </section>
  );
}

function FormSection({
  title,
  required,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="font-display text-xl text-foreground">{title}</legend>
      {required && <p className="mt-1 text-xs text-muted-foreground">* Datos requeridos</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}
function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} className={fieldClass} {...props} />
    </div>
  );
}
function SelectField({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <select id={name} name={name} required className={selectClass}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
function TextField({
  label,
  name,
  wide,
  ...props
}: { label: string; name: string; wide?: boolean } & React.ComponentProps<typeof Textarea>) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : "sm:col-span-2"}>
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} className={fieldClass} {...props} />
    </div>
  );
}
