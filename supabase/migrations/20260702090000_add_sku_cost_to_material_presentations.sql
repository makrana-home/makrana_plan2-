alter table public.material_presentations
  add column if not exists sku text,
  add column if not exists cost numeric(10,2);

alter table public.material_presentations
  alter column cost drop not null,
  alter column cost drop default;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'material_presentations_cost_nonnegative'
      and conrelid = 'public.material_presentations'::regclass
  ) then
    alter table public.material_presentations
      add constraint material_presentations_cost_nonnegative
      check (cost is null or cost >= 0);
  end if;
end;
$$;

comment on column public.material_presentations.sku is
  'SKU propio de la presentacion o variante del material.';
comment on column public.material_presentations.cost is
  'Costo unitario opcional de la presentacion o variante del material.';

notify pgrst, 'reload schema';
