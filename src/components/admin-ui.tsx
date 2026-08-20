import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-brand-terracotta">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl font-light leading-tight text-foreground sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center justify-stretch gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}

export function FormDialog({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
  onSubmit,
  submitting,
  submitLabel = "Guardar",
  contentClassName = "max-w-2xl",
}: {
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting?: boolean;
  submitLabel?: string;
  contentClassName?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={`${contentClassName} w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:w-full`}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          <DialogFooter className="sticky bottom-0 -mx-1 bg-background/95 py-2 backdrop-blur">
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Guardando…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewButton({ onClick, label = "Nuevo" }: { onClick?: () => void; label?: string }) {
  return (
    <Button
      onClick={onClick}
      variant="hero"
      size="lg"
      className="w-full rounded-full px-6 shadow-lg sm:w-auto"
    >
      <Plus className="h-4 w-4" /> {label}
    </Button>
  );
}

export function useDialog<T = any>() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);
  return {
    open,
    setOpen,
    data,
    openWith: (d: T | null = null) => {
      setData(d);
      setOpen(true);
    },
    close: () => setOpen(false),
  };
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function moneyPEN(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v);
}

export function formatDate(s?: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return s;
  }
}
