import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FormDialog, NewButton, PageHeader, slugify, useDialog } from "@/components/admin-ui";
import {
  adminGetManualByPiece,
  adminListManualWorkspace,
  adminUpsertManual,
} from "@/lib/admin-manual.functions";
import { supabase } from "@/integrations/supabase/client";
import { BookOpenText, ImageIcon, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { getPresentationUnitLabel } from "@/lib/presentation-units";

export const Route = createFileRoute("/_authenticated/admin/manual")({
  validateSearch: (search: Record<string, unknown>) => ({
    pieceId: typeof search.pieceId === "string" ? search.pieceId : undefined,
  }),
  component: ManualPage,
});

function ManualPage() {
  const search = Route.useSearch();
  const listWorkspace = useServerFn(adminListManualWorkspace);
  const getManualByPiece = useServerFn(adminGetManualByPiece);
  const upsertManual = useServerFn(adminUpsertManual);
  const dlg = useDialog<any>();
  const openedFromSearch = useRef<string | null>(null);

  const [rows, setRows] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [form, setForm] = useState<any>(blankManual());
  const [activePiece, setActivePiece] = useState<any | null>(null);
  const [pieceLocked, setPieceLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [manualFilter, setManualFilter] = useState("_all");
  const [pieceSearch, setPieceSearch] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesText =
        !q ||
        row.name?.toLowerCase().includes(q) ||
        row.sku?.toLowerCase().includes(q) ||
        row.category?.name?.toLowerCase().includes(q) ||
        row.measurements?.toLowerCase().includes(q) ||
        row.manual?.title?.toLowerCase().includes(q);
      const matchesStatus =
        manualFilter === "_all" ||
        (manualFilter === "with" && row.manual) ||
        (manualFilter === "without" && !row.manual);
      return matchesText && matchesStatus;
    });
  }, [rows, searchTerm, manualFilter]);

  const pieceOptions = useMemo(() => {
    const q = pieceSearch.trim().toLowerCase();
    return rows
      .filter(
        (row) => !q || row.name?.toLowerCase().includes(q) || row.sku?.toLowerCase().includes(q),
      )
      .slice(0, 60);
  }, [rows, pieceSearch]);

  const materialOptions = useMemo(() => {
    const q = materialSearch.trim().toLowerCase();
    return materials
      .filter(
        (material) =>
          !q ||
          material.name?.toLowerCase().includes(q) ||
          material.sku?.toLowerCase().includes(q) ||
          material.presentations?.some((presentation: any) =>
            presentation.sku?.toLowerCase().includes(q),
          ),
      )
      .slice(0, 80);
  }, [materials, materialSearch]);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listWorkspace();
      setRows(data.rows ?? []);
      setMaterials(data.materials ?? []);
      if (data.warning) {
        toast.warning("Manual cargó las piezas, pero falta revisar una conexión auxiliar.");
      }
    } catch (error: any) {
      toast.error(error.message ?? "No se pudo cargar Manual.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!search.pieceId || rows.length === 0 || openedFromSearch.current === search.pieceId) return;
    const row = rows.find((item) => item.id === search.pieceId);
    if (!row) return;
    openedFromSearch.current = search.pieceId;
    void openForPiece(row, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.pieceId, rows]);

  async function openForPiece(piece: any, locked: boolean) {
    try {
      const data = await getManualByPiece({ data: { piece_id: piece.id } });
      setActivePiece(data.piece);
      setPieceLocked(locked);
      setPieceSearch(formatPieceLabel(data.piece));
      setForm(toManualForm(data.piece, data.manual));
      dlg.openWith(data.piece);
    } catch (error: any) {
      toast.error(error.message ?? "No se pudo abrir el manual.");
    }
  }

  function openFromZero() {
    setActivePiece(null);
    setPieceLocked(false);
    setPieceSearch("");
    setMaterialSearch("");
    setForm(blankManual());
    dlg.openWith(null);
  }

  async function onPieceSelected(pieceId: string) {
    if (pieceId === "_none") {
      setActivePiece(null);
      setForm(blankManual());
      return;
    }
    const piece = rows.find((row) => row.id === pieceId);
    if (!piece) return;
    await openForPiece(piece, false);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.piece_id) {
      toast.error("Selecciona una pieza existente.");
      return;
    }

    setSaving(true);
    try {
      await upsertManual({ data: form });
      toast.success("Manual guardado");
      dlg.close();
      await refresh();
    } catch (error: any) {
      toast.error(error.message ?? "No se pudo guardar el manual.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Manual"
        description="Ficha tecnica de produccion enlazada a las piezas existentes."
        eyebrow="Produccion"
        actions={<NewButton onClick={openFromZero} label="Crear manual desde cero" />}
      />

      <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,420px)_220px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar pieza, SKU, categoria o medidas..."
            className="h-12 rounded-2xl border-sand/80 bg-warm-white/75 pl-11 text-base shadow-md shadow-clay/10 focus-visible:border-accent focus-visible:ring-accent/20"
          />
        </label>
        <Select value={manualFilter} onValueChange={setManualFilter}>
          <SelectTrigger className="h-12 rounded-2xl border-sand/80 bg-warm-white/75 px-5 text-base shadow-md shadow-clay/10 focus-visible:border-accent focus-visible:ring-accent/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los estados</SelectItem>
            <SelectItem value="without">Sin manual</SelectItem>
            <SelectItem value="with">Con manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-sand/80 bg-warm-white/75 shadow-sm">
        <Table className="min-w-[980px]">
          <TableHeader className="bg-cream/75">
            <TableRow>
              <TableHead>Nombre de la pieza</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Medidas</TableHead>
              <TableHead>Estado del manual</TableHead>
              <TableHead className="w-44 text-right">Accion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Sin piezas para mostrar. Primero crea la pieza en el modulo Piezas y luego vuelve
                  a Manual.
                </TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Cargando piezas...
                </TableCell>
              </TableRow>
            )}
            {filteredRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <BookOpenText className="h-4 w-4 text-accent" />
                    <span>{row.name}</span>
                    {row.type === "kit" && (
                      <Badge variant="outline" className="ml-1">
                        Kit
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.sku || "—"}</TableCell>
                <TableCell>{row.category?.name || "—"}</TableCell>
                <TableCell>{row.measurements || "—"}</TableCell>
                <TableCell>
                  <ManualStatusBadge hasManual={Boolean(row.manual)} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant={row.manual ? "outline" : "default"}
                    className="rounded-full"
                    onClick={() => openForPiece(row, true)}
                  >
                    {row.manual ? (
                      <>
                        <Pencil className="h-4 w-4" /> Editar manual
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Crear manual
                      </>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FormDialog
        open={dlg.open}
        onOpenChange={dlg.setOpen}
        title={form.id ? "Editar manual" : "Crear manual"}
        description={
          activePiece
            ? `Pieza relacionada: ${formatPieceLabel(activePiece)}`
            : "Selecciona una pieza existente."
        }
        onSubmit={onSubmit}
        submitting={saving}
        submitLabel="Guardar manual"
        contentClassName="max-w-5xl"
      >
        <ManualPieceField
          rows={rows}
          pieceOptions={pieceOptions}
          activePiece={activePiece}
          pieceLocked={pieceLocked}
          pieceSearch={pieceSearch}
          setPieceSearch={setPieceSearch}
          value={form.piece_id}
          onPieceSelected={onPieceSelected}
        />

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
          <div>
            <Label>Titulo *</Label>
            <Input
              required
              value={form.title}
              onChange={(event) =>
                setForm((current: any) => ({ ...current, title: event.target.value }))
              }
            />
          </div>
          <div>
            <Label>Cantidad *</Label>
            <Input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.quantity}
              onChange={(event) =>
                setForm((current: any) => ({ ...current, quantity: event.target.value }))
              }
            />
          </div>
        </div>

        <div>
          <Label>Descripcion</Label>
          <Textarea
            rows={4}
            value={form.description ?? ""}
            onChange={(event) =>
              setForm((current: any) => ({ ...current, description: event.target.value }))
            }
          />
        </div>

        <div>
          <Label>Medidas</Label>
          <Textarea
            rows={2}
            value={form.measurements ?? ""}
            onChange={(event) =>
              setForm((current: any) => ({ ...current, measurements: event.target.value }))
            }
          />
        </div>

        <ManualMaterialsField
          form={form}
          setForm={setForm}
          materialSearch={materialSearch}
          setMaterialSearch={setMaterialSearch}
          materialOptions={materialOptions}
          allMaterials={materials}
        />

        <ManualImagesField form={form} setForm={setForm} activePiece={activePiece} />

        <div>
          <Label>Observaciones</Label>
          <Textarea
            rows={3}
            value={form.notes ?? ""}
            onChange={(event) =>
              setForm((current: any) => ({ ...current, notes: event.target.value }))
            }
          />
        </div>
      </FormDialog>
    </div>
  );
}

function ManualPieceField({
  rows,
  pieceOptions,
  activePiece,
  pieceLocked,
  pieceSearch,
  setPieceSearch,
  value,
  onPieceSelected,
}: {
  rows: any[];
  pieceOptions: any[];
  activePiece: any | null;
  pieceLocked: boolean;
  pieceSearch: string;
  setPieceSearch: (value: string) => void;
  value: string;
  onPieceSelected: (pieceId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-sand/70 bg-cream/35 p-4">
      <Label>Pieza relacionada *</Label>
      {pieceLocked ? (
        <Input className="mt-2" value={activePiece ? formatPieceLabel(activePiece) : ""} disabled />
      ) : (
        <div className="mt-2 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
          <Input
            value={pieceSearch}
            onChange={(event) => setPieceSearch(event.target.value)}
            placeholder="Buscar pieza por nombre o SKU"
          />
          <Select
            value={value || "_none"}
            onValueChange={onPieceSelected}
            disabled={rows.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una pieza" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Selecciona una pieza existente</SelectItem>
              {pieceOptions.map((piece) => (
                <SelectItem key={piece.id} value={piece.id}>
                  {formatPieceLabel(piece)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {rows.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Primero crea la pieza en el modulo Piezas y luego vuelve a Manual.
        </p>
      )}
    </div>
  );
}

function ManualMaterialsField({
  form,
  setForm,
  materialSearch,
  setMaterialSearch,
  materialOptions,
  allMaterials,
}: {
  form: any;
  setForm: (updater: any) => void;
  materialSearch: string;
  setMaterialSearch: (value: string) => void;
  materialOptions: any[];
  allMaterials: any[];
}) {
  const visibleMaterials = (form.materials ?? []).filter((item: any) => !item._deleted);

  function addMaterial() {
    setForm((current: any) => ({
      ...current,
      materials: [
        ...(current.materials ?? []),
        {
          material_id: "",
          material_presentation_id: null,
          quantity: 0,
          unit: "",
          notes: "",
        },
      ],
    }));
  }

  function updateMaterial(index: number, updater: (item: any) => any) {
    setForm((current: any) => ({
      ...current,
      materials: (current.materials ?? []).map((item: any, currentIndex: number) =>
        currentIndex === index ? updater(item) : item,
      ),
    }));
  }

  function removeMaterial(index: number) {
    setForm((current: any) => ({
      ...current,
      materials: (current.materials ?? []).flatMap((item: any, currentIndex: number) => {
        if (currentIndex !== index) return [item];
        return item.id ? [{ ...item, _deleted: true }] : [];
      }),
    }));
  }

  return (
    <section className="rounded-2xl border border-sand/70 bg-warm-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label className="text-base">Materiales usados</Label>
          <Input
            value={materialSearch}
            onChange={(event) => setMaterialSearch(event.target.value)}
            placeholder="Buscar material por nombre o SKU"
            className="mt-2 w-full min-w-[260px]"
          />
        </div>
        <Button type="button" variant="outline" className="rounded-full" onClick={addMaterial}>
          <Plus className="h-4 w-4" /> Agregar material
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {(form.materials ?? []).map((item: any, index: number) => {
          if (item._deleted) return null;
          const material = allMaterials.find((entry) => entry.id === item.material_id);
          const presentations = material?.presentations ?? [];
          return (
            <div
              key={item.id ?? `material-${index}`}
              className="rounded-xl border border-sand/70 p-3"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_minmax(180px,240px)_120px_120px_auto] lg:items-end">
                <div>
                  <Label className="text-xs">Material</Label>
                  <Select
                    value={item.material_id || "_none"}
                    onValueChange={(value) =>
                      updateMaterial(index, (current) => ({
                        ...current,
                        material_id: value === "_none" ? "" : value,
                        material_presentation_id: null,
                        unit: "",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Selecciona material</SelectItem>
                      {materialOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {formatMaterialLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Presentacion</Label>
                  <Select
                    value={item.material_presentation_id || "_none"}
                    onValueChange={(value) =>
                      updateMaterial(index, (current) => {
                        const presentation = presentations.find((entry: any) => entry.id === value);
                        return {
                          ...current,
                          material_presentation_id: value === "_none" ? null : value,
                          unit: presentation?.unit ?? current.unit ?? "",
                        };
                      })
                    }
                    disabled={!material}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Sin presentacion</SelectItem>
                      {presentations.map((presentation: any) => (
                        <SelectItem key={presentation.id} value={presentation.id}>
                          {formatPresentationLabel(presentation)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Cantidad</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity ?? 0}
                    onChange={(event) =>
                      updateMaterial(index, (current) => ({
                        ...current,
                        quantity: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Unidad</Label>
                  <Input
                    value={item.unit ?? ""}
                    onChange={(event) =>
                      updateMaterial(index, (current) => ({ ...current, unit: event.target.value }))
                    }
                    placeholder="m, und..."
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeMaterial(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Input
                value={item.notes ?? ""}
                onChange={(event) =>
                  updateMaterial(index, (current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Notas del material"
                className="mt-3"
              />
            </div>
          );
        })}
        {visibleMaterials.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Sin materiales registrados para este manual.
          </p>
        )}
      </div>
    </section>
  );
}

function ManualImagesField({
  form,
  setForm,
  activePiece,
}: {
  form: any;
  setForm: (updater: any) => void;
  activePiece: any | null;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const visibleImages = (form.images ?? []).filter((image: any) => !image._deleted);

  async function uploadFile(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Sube una imagen JPG o PNG.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("La imagen debe pesar maximo 6 MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const base = slugify(activePiece?.name || form.title || "manual");
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now();
      const path = `manuales/${base}-${id}.${ext}`;
      const { error } = await supabase.storage.from("manual-images").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("manual-images").getPublicUrl(path);
      setForm((current: any) => ({
        ...current,
        images: [
          ...(current.images ?? []),
          {
            image_url: data.publicUrl,
            storage_path: path,
            alt_text: activePiece?.name ?? current.title ?? "",
            order_index: (current.images ?? []).filter((image: any) => !image._deleted).length,
          },
        ],
      }));
      toast.success("Imagen agregada.");
    } catch (error: any) {
      toast.error(error.message ?? "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  function updateImage(index: number, key: string, value: any) {
    setForm((current: any) => ({
      ...current,
      images: (current.images ?? []).map((image: any, currentIndex: number) =>
        currentIndex === index ? { ...image, [key]: value } : image,
      ),
    }));
  }

  function removeImage(index: number) {
    setForm((current: any) => ({
      ...current,
      images: (current.images ?? []).flatMap((image: any, currentIndex: number) => {
        if (currentIndex !== index) return [image];
        return image.id ? [{ ...image, _deleted: true }] : [];
      }),
    }));
  }

  return (
    <section className="rounded-2xl border border-sand/70 bg-warm-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label className="text-base">Imagenes</Label>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => document.getElementById(inputId)?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4" /> {uploading ? "Subiendo..." : "Agregar imagen"}
        </Button>
      </div>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        onChange={(event) => uploadFile(event.target.files?.[0])}
      />

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(form.images ?? []).map((image: any, index: number) => {
          if (image._deleted) return null;
          return (
            <div
              key={image.id ?? image.storage_path ?? index}
              className="rounded-xl border border-sand/70 p-3"
            >
              <div className="grid grid-cols-[72px_1fr_auto] gap-3">
                {image.image_url ? (
                  <img
                    src={image.image_url}
                    alt={image.alt_text || "Imagen del manual"}
                    className="h-[72px] w-[72px] rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-[72px] w-[72px] items-center justify-center rounded-lg bg-cream text-accent/60">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                )}
                <div className="space-y-2">
                  <Input
                    value={image.alt_text ?? ""}
                    onChange={(event) => updateImage(index, "alt_text", event.target.value)}
                    placeholder="Texto alternativo"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={image.order_index ?? 0}
                    onChange={(event) => updateImage(index, "order_index", event.target.value)}
                    placeholder="Orden"
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeImage(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
        {visibleImages.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin imagenes cargadas para este manual.</p>
        )}
      </div>
    </section>
  );
}

function ManualStatusBadge({ hasManual }: { hasManual: boolean }) {
  if (hasManual) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Con manual</Badge>
    );
  }
  return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Sin manual</Badge>;
}

function blankManual(piece?: any) {
  return {
    id: null,
    piece_id: piece?.id ?? "",
    title: piece ? `Manual de ${piece.name}` : "",
    description: "",
    measurements: piece?.measurements ?? "",
    quantity: 1,
    notes: "",
    images: [],
    materials: [],
  };
}

function toManualForm(piece: any, manual: any | null) {
  if (!manual) return blankManual(piece);
  return {
    id: manual.id,
    piece_id: manual.piece_id,
    title: manual.title ?? "",
    description: manual.description ?? "",
    measurements: manual.measurements ?? piece?.measurements ?? "",
    quantity: manual.quantity ?? 1,
    notes: manual.notes ?? "",
    images: (manual.images ?? []).map((image: any, index: number) => ({
      id: image.id,
      image_url: image.image_url ?? "",
      storage_path: image.storage_path ?? "",
      alt_text: image.alt_text ?? "",
      order_index: image.order_index ?? index,
    })),
    materials: (manual.materials ?? []).map((material: any) => ({
      id: material.id,
      material_id: material.material_id ?? "",
      material_presentation_id: material.material_presentation_id ?? null,
      quantity: material.quantity ?? 0,
      unit: material.unit ?? "",
      notes: material.notes ?? "",
    })),
  };
}

function formatPieceLabel(piece: any) {
  return `${piece.name}${piece.sku ? ` (${piece.sku})` : ""}`;
}

function formatMaterialLabel(material: any) {
  return `${material.name}${material.sku ? ` (${material.sku})` : ""}`;
}

function formatPresentationLabel(presentation: any) {
  const sku = presentation.sku ? ` - ${presentation.sku}` : "";
  return `${getPresentationUnitLabel(presentation.unit, presentation.label)}${sku}`;
}
