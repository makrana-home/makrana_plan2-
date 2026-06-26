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
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
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
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
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
    <Button onClick={onClick} variant="hero" size="sm">
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
