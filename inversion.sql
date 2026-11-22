-- Capital Investment (Tesis): base de datos en Supabase
-- Pegar completo en Supabase > SQL Editor > Run. Se puede ejecutar más de una vez.
-- Después de ejecutarlo, ver el final del archivo para registrarte como administrador.

create table if not exists public.inv_config (
  id int primary key default 1 check (id = 1),
  banco text not null default 'Banco (completar)',
  tipo_cuenta text not null default 'Ahorros',
  numero_cuenta text not null default '0000000000',
  titular text not null default 'Titular (completar)',
  identificacion text not null default '',
  paypal text not null default 'estalimm@gmail.com',
  whatsapp text not null default '593985568519',
  aviso text not null default ''
);
insert into public.inv_config (id) values (1) on conflict (id) do nothing;

create table if not exists public.inv_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.inv_es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.inv_admins where user_id = auth.uid());
$$;

create table if not exists public.inv_inversiones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 3 and 120),
  contacto text not null check (char_length(contacto) between 5 and 120),
  monto numeric(10,2) not null check (monto >= 10 and monto <= 10000),
  meses int not null check (meses between 1 and 24),
  renovar boolean not null default false,
  metodo text not null check (metodo in ('deposito','transferencia','paypal')),
  referencia text not null check (char_length(referencia) between 3 and 80),
  acepta_riesgos boolean not null check (acepta_riesgos = true),
  estado text not null default 'pendiente'
    check (estado in ('pendiente','confirmada','liquidada','rechazada')),
  creada_en timestamptz not null default now(),
  confirmada_en timestamptz,
  liquidada_en timestamptz,
  monto_liquidado numeric(12,2),
  nota_admin text
);
create index if not exists inv_inversiones_user on public.inv_inversiones (user_id);

create table if not exists public.inv_resultados (
  mes date primary key check (extract(day from mes) = 1),
  utilidad_pct numeric(7,3) not null check (utilidad_pct between -100 and 1000),
  nota text not null default '',
  publicado_en timestamptz not null default now()
);

-- Tope de $10.000 por inversionista (solo cuentan las vigentes)
create or replace function public.inv_tope() returns trigger
language plpgsql security definer set search_path = public as $$
declare total numeric;
begin
  select coalesce(sum(monto),0) into total from public.inv_inversiones
   where user_id = new.user_id and estado in ('pendiente','confirmada')
     and (tg_op = 'INSERT' or id <> new.id);
  if total + new.monto > 10000 then
    raise exception 'El total vigente por inversionista no puede superar 10000 USD';
  end if;
  return new;
end $$;
drop trigger if exists inv_tope_trg on public.inv_inversiones;
create trigger inv_tope_trg before insert on public.inv_inversiones
  for each row execute function public.inv_tope();

-- Seguridad por filas (RLS)
alter table public.inv_config enable row level security;
alter table public.inv_admins enable row level security;
alter table public.inv_inversiones enable row level security;
alter table public.inv_resultados enable row level security;

drop policy if exists cfg_leer on public.inv_config;
create policy cfg_leer on public.inv_config for select using (true);
drop policy if exists cfg_editar on public.inv_config;
create policy cfg_editar on public.inv_config for update using (public.inv_es_admin()) with check (public.inv_es_admin());

drop policy if exists adm_leer on public.inv_admins;
create policy adm_leer on public.inv_admins for select using (user_id = auth.uid());

drop policy if exists res_leer on public.inv_resultados;
create policy res_leer on public.inv_resultados for select using (true);
drop policy if exists res_escribir on public.inv_resultados;
create policy res_escribir on public.inv_resultados for all using (public.inv_es_admin()) with check (public.inv_es_admin());

drop policy if exists inv_ver_propias on public.inv_inversiones;
create policy inv_ver_propias on public.inv_inversiones for select
  using (user_id = auth.uid() or public.inv_es_admin());
drop policy if exists inv_crear on public.inv_inversiones;
create policy inv_crear on public.inv_inversiones for insert to authenticated
  with check (user_id = auth.uid() and estado = 'pendiente'
              and confirmada_en is null and liquidada_en is null and monto_liquidado is null);
drop policy if exists inv_admin_editar on public.inv_inversiones;
create policy inv_admin_editar on public.inv_inversiones for update
  using (public.inv_es_admin()) with check (public.inv_es_admin());

grant select on public.inv_config, public.inv_resultados to anon, authenticated;
grant update on public.inv_config to authenticated;
grant insert, update, delete on public.inv_resultados to authenticated;
grant select, insert, update on public.inv_inversiones to authenticated;
grant select on public.inv_admins to authenticated;

-- Préstamos: solicitudes que el administrador revisa. No hay desembolso automático.
alter table public.inv_config add column if not exists tasa_prestamo_anual numeric(5,2) not null default 18;

create table if not exists public.inv_prestamos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 3 and 120),
  contacto text not null check (char_length(contacto) between 5 and 120),
  monto numeric(10,2) not null check (monto between 50 and 5000),
  plazo_meses int not null check (plazo_meses between 1 and 36),
  tasa_anual numeric(5,2) not null,
  cuota numeric(10,2) not null,
  destino text not null check (char_length(destino) between 3 and 200),
  estado text not null default 'solicitada' check (estado in ('solicitada','aprobada','rechazada','desembolsada','pagada')),
  creada_en timestamptz not null default now(),
  nota_admin text
);
create index if not exists inv_prestamos_user on public.inv_prestamos (user_id);
alter table public.inv_prestamos enable row level security;
drop policy if exists pre_ver on public.inv_prestamos;
create policy pre_ver on public.inv_prestamos for select using (user_id = auth.uid() or public.inv_es_admin());
drop policy if exists pre_crear on public.inv_prestamos;
create policy pre_crear on public.inv_prestamos for insert to authenticated
  with check (user_id = auth.uid() and estado = 'solicitada');
drop policy if exists pre_admin on public.inv_prestamos;
create policy pre_admin on public.inv_prestamos for update using (public.inv_es_admin()) with check (public.inv_es_admin());
grant select, insert, update on public.inv_prestamos to authenticated;
grant update (tasa_prestamo_anual) on public.inv_config to authenticated;

-- Perfil del cliente de la banca virtual
create table if not exists public.inv_perfiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null default '' check (char_length(nombre) <= 120),
  telefono text not null default '' check (char_length(telefono) <= 30),
  ciudad text not null default '' check (char_length(ciudad) <= 80),
  actualizado_en timestamptz not null default now()
);
alter table public.inv_perfiles enable row level security;
drop policy if exists perf_ver on public.inv_perfiles;
create policy perf_ver on public.inv_perfiles for select using (user_id = auth.uid() or public.inv_es_admin());
drop policy if exists perf_crear on public.inv_perfiles;
create policy perf_crear on public.inv_perfiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists perf_editar on public.inv_perfiles;
create policy perf_editar on public.inv_perfiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.inv_perfiles to authenticated;

-- ADMINISTRADOR: entra una vez a inversion.html con tu Google, y luego ejecuta esto
-- cambiando el correo por el tuyo:
--   insert into public.inv_admins (user_id)
--   select id from auth.users where email = 'estalimm@gmail.com'   -- si entras con Google
--   -- o, si creaste tu cuenta con usuario (ej. admin): where email = 'estalimm+ci.admin@gmail.com'
--   on conflict do nothing;

-- ============ Certificados de inversión: verificación pública (sin datos sensibles) ============
create or replace function public.inv_verificar(p_codigo text)
returns table (titular text, monto numeric, meses int, estado text, creada_en timestamptz, confirmada_en timestamptz)
language sql stable security definer set search_path = public as $$
  select split_part(trim(i.nombre), ' ', 1) || ' ' ||
         regexp_replace(trim(substr(trim(i.nombre), length(split_part(trim(i.nombre), ' ', 1)) + 1)), '(\S)\S*', '\1.', 'g'),
         i.monto, i.meses, i.estado, i.creada_en, i.confirmada_en
  from public.inv_inversiones i
  where i.estado in ('confirmada','liquidada')
    and 'CI-' || upper(substr(replace(i.id::text, '-', ''), 1, 12)) = upper(trim(p_codigo))
  limit 1;
$$;
revoke all on function public.inv_verificar(text) from public;
grant execute on function public.inv_verificar(text) to anon, authenticated;
