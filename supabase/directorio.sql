-- =====================================================================
--  DIRECTORIO DE ABOGADOS ECUADOR · base de datos (Supabase / PostgreSQL)
--  Se ejecuta UNA vez en: Supabase > SQL Editor > New query > Run.
--  Es seguro volver a ejecutarlo (usa "if not exists" / "create or replace").
--
--  Seguridad:
--   · Todas las tablas tienen RLS (reglas por fila) activado.
--   · Cada abogado solo puede crear, editar y borrar SU perfil.
--   · La insignia "verificado" y el promedio de estrellas NO los puede tocar
--     nadie desde la página: solo se cambian desde este panel o por triggers.
--   · Un usuario solo puede calificar una vez a cada abogado y nunca al suyo.
--   · Límites diarios, filtro de insultos/enlaces y ocultamiento automático
--     de comentarios que reciben 3 reportes distintos.
-- =====================================================================

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm  with schema extensions;

-- ---------- Utilidades ----------------------------------------------
-- Texto en minúsculas y sin tildes (para buscar "Bolivar" y encontrar "Bolívar").
create or replace function public.dir_norm(t text)
returns text language sql stable set search_path = public, extensions as
$$ select lower(unaccent('unaccent', coalesce(t, ''))) $$;

-- Rechaza insultos, enlaces y teléfonos dentro de comentarios y respuestas.
create or replace function public.dir_texto_ok(t text)
returns void language plpgsql stable set search_path = public, extensions as
$$
declare n text := public.dir_norm(t);
begin
  if n ~ '(https?:|www\.|\.com\b|\.ec\b|\.net\b|\.org\b|bit\.ly|wa\.me|@[a-z0-9_]{3,})'
     or n ~ '(\+?593|\m0)9([ .-]?[0-9]){8}' then
    raise exception 'No se permiten enlaces, correos ni teléfonos en los comentarios.' using errcode = 'P0001';
  end if;
  if n ~ '\m(hijueputa|hijoputa|hdp|malparido|gonorrea|imbecil|estupido|estupida|idiota|basura|mierda|maldito|maldita|pendejo|pendeja|cabron|cabrona|puta|puto|ctm|careverga|verga)\M'
     or n ~ 'hijo de puta|hijo de su madre|la puta madre' then
    raise exception 'Tu texto contiene lenguaje ofensivo. Corrígelo y vuelve a enviarlo.' using errcode = 'P0001';
  end if;
end $$;

-- ---------- Tabla: abogados ------------------------------------------
create table if not exists public.abogados (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references auth.users(id) on delete cascade,
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now(),
  nombres              text not null check (char_length(nombres) between 5 and 120),
  matricula            text not null check (char_length(matricula) between 3 and 30),
  matricula_norm       text not null unique,
  celular              text not null check (celular ~ '^09[0-9]{8}$'),
  direccion            text not null check (char_length(direccion) between 5 and 200),
  provincia            text not null check (provincia in ('Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi','El Oro','Esmeraldas','Galápagos','Guayas','Imbabura','Loja','Los Ríos','Manabí','Morona Santiago','Napo','Orellana','Pastaza','Pichincha','Santa Elena','Santo Domingo de los Tsáchilas','Sucumbíos','Tungurahua','Zamora Chinchipe')),
  canton               text not null check (char_length(canton) between 2 and 60),
  especialidades       text[] not null check (cardinality(especialidades) between 1 and 5),
  provincias_atencion  text[] not null default '{}' check (cardinality(provincias_atencion) <= 24),
  modalidad            text not null default 'ambas' check (modalidad in ('presencial','virtual','ambas')),
  descripcion          text check (descripcion is null or (char_length(descripcion) <= 500 and descripcion !~* '(https?:|www\.)')),
  universidad          text check (universidad is null or char_length(universidad) <= 100),
  anios_experiencia    smallint check (anios_experiencia is null or anios_experiencia between 0 and 70),
  correo               text check (correo is null or (char_length(correo) <= 120 and correo ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  horario              text check (horario is null or char_length(horario) <= 120),
  avatar_url           text check (avatar_url is null or (char_length(avatar_url) <= 500 and avatar_url ~ '^https://')),
  verificado           boolean not null default false,
  estado               text not null default 'activo' check (estado in ('activo','oculto','en_revision')),
  acepta_publicar      boolean not null check (acepta_publicar),
  promedio             numeric(3,2) not null default 0,
  total_calificaciones integer not null default 0,
  busqueda             text not null default ''
);

create index if not exists abogados_provincia_idx on public.abogados (provincia, canton);
create index if not exists abogados_especialidades_idx on public.abogados using gin (especialidades);
create index if not exists abogados_busqueda_idx on public.abogados using gin (busqueda extensions.gin_trgm_ops);

-- Calcula campos derivados y protege los campos que solo controla el servidor.
create or replace function public.dir_abogados_antes()
returns trigger language plpgsql set search_path = public, extensions as
$$
begin
  new.nombres  := regexp_replace(btrim(new.nombres), '\s+', ' ', 'g');
  new.matricula := btrim(new.matricula);
  new.matricula_norm := upper(regexp_replace(new.matricula, '[^0-9A-Za-z]', '', 'g'));
  if char_length(new.matricula_norm) < 3 then
    raise exception 'La matrícula no es válida.' using errcode = 'P0001';
  end if;
  new.canton := btrim(new.canton);
  new.descripcion := nullif(btrim(coalesce(new.descripcion, '')), '');
  if new.descripcion is not null then perform public.dir_texto_ok(new.descripcion); end if;
  perform public.dir_texto_ok(new.nombres);
  new.actualizado_en := now();
  new.busqueda := public.dir_norm(
    new.nombres || ' ' || new.matricula || ' ' || new.provincia || ' ' || new.canton || ' ' ||
    array_to_string(new.especialidades, ' ') || ' ' || coalesce(new.universidad, '') || ' ' || coalesce(new.direccion, ''));
  if tg_op = 'INSERT' then
    new.verificado := false; new.promedio := 0; new.total_calificaciones := 0; new.estado := 'activo';
  elsif new.matricula_norm is distinct from old.matricula_norm then
    new.verificado := false;  -- si cambia la matrícula hay que verificarla de nuevo
  end if;
  return new;
end $$;

drop trigger if exists dir_abogados_antes on public.abogados;
create trigger dir_abogados_antes before insert or update on public.abogados
  for each row execute function public.dir_abogados_antes();

alter table public.abogados enable row level security;

drop policy if exists abogados_leer   on public.abogados;
drop policy if exists abogados_crear  on public.abogados;
drop policy if exists abogados_editar on public.abogados;
drop policy if exists abogados_borrar on public.abogados;
create policy abogados_leer   on public.abogados for select to anon, authenticated
  using (estado = 'activo' or user_id = auth.uid());
create policy abogados_crear  on public.abogados for insert to authenticated
  with check (user_id = auth.uid());
create policy abogados_editar on public.abogados for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy abogados_borrar on public.abogados for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.abogados from anon, authenticated;
grant select on public.abogados to anon, authenticated;
grant insert (user_id, nombres, matricula, celular, direccion, provincia, canton, especialidades,
              provincias_atencion, modalidad, descripcion, universidad, anios_experiencia, correo,
              horario, avatar_url, acepta_publicar)
  on public.abogados to authenticated;
grant update (nombres, matricula, celular, direccion, provincia, canton, especialidades,
              provincias_atencion, modalidad, descripcion, universidad, anios_experiencia, correo,
              horario, avatar_url)
  on public.abogados to authenticated;
grant delete on public.abogados to authenticated;

-- Ocultar o mostrar el propio perfil (no permite saltarse una revisión).
create or replace function public.dir_ocultar_perfil(p_ocultar boolean)
returns void language plpgsql security definer set search_path = public as
$$
begin
  update public.abogados
     set estado = case when p_ocultar then 'oculto' else 'activo' end
   where user_id = auth.uid() and estado in ('activo','oculto');
  if not found then raise exception 'No se pudo cambiar el estado del perfil.' using errcode = 'P0001'; end if;
end $$;

-- ---------- Tabla: calificaciones y comentarios ----------------------
create table if not exists public.calificaciones_abogados (
  id              uuid primary key default gen_random_uuid(),
  abogado_id      uuid not null references public.abogados(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  nombre          text not null default 'Usuario' check (char_length(nombre) <= 80),
  avatar_url      text check (avatar_url is null or avatar_url ~ '^https://'),
  estrellas       smallint not null check (estrellas between 1 and 5),
  trato           smallint check (trato between 1 and 5),
  claridad        smallint check (claridad between 1 and 5),
  puntualidad     smallint check (puntualidad between 1 and 5),
  comentario      text not null check (char_length(btrim(comentario)) between 10 and 1000),
  respuesta       text check (respuesta is null or char_length(respuesta) <= 800),
  respondido_en   timestamptz,
  estado          text not null default 'publicada' check (estado in ('publicada','en_revision','oculta')),
  unique (abogado_id, user_id)
);
create index if not exists calif_abogado_idx on public.calificaciones_abogados (abogado_id, creado_en desc);

create or replace function public.dir_calif_antes()
returns trigger language plpgsql security definer set search_path = public, auth as
$$
declare u record;
begin
  new.comentario := btrim(new.comentario);
  perform public.dir_texto_ok(new.comentario);
  new.actualizado_en := now();
  if tg_op = 'INSERT' then
    select coalesce(nullif(raw_user_meta_data->>'full_name',''), nullif(raw_user_meta_data->>'name',''), split_part(email,'@',1), 'Usuario') as nombre,
           coalesce(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture') as avatar
      into u from auth.users where id = new.user_id;
    new.nombre := left(coalesce(u.nombre, 'Usuario'), 80);
    new.avatar_url := case when u.avatar like 'https://%' then u.avatar else null end;
    new.estado := 'publicada'; new.respuesta := null; new.respondido_en := null;

    if exists (select 1 from public.abogados where id = new.abogado_id and user_id = new.user_id) then
      raise exception 'No puedes calificar tu propio perfil.' using errcode = 'P0001';
    end if;
    -- Abogados que compiten en la misma provincia y especialidad no se califican entre sí.
    if exists (select 1 from public.abogados yo join public.abogados el on el.id = new.abogado_id
                where yo.user_id = new.user_id and yo.provincia = el.provincia
                  and yo.especialidades && el.especialidades) then
      raise exception 'Los abogados no pueden calificar a colegas de su misma provincia y especialidad.' using errcode = 'P0001';
    end if;
    if (select count(*) from public.calificaciones_abogados
         where user_id = new.user_id and creado_en > now() - interval '1 day') >= 10 then
      raise exception 'Alcanzaste el límite de calificaciones por hoy. Intenta mañana.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists dir_calif_antes on public.calificaciones_abogados;
create trigger dir_calif_antes before insert or update on public.calificaciones_abogados
  for each row execute function public.dir_calif_antes();

-- Recalcula promedio y total del abogado.
create or replace function public.dir_calif_despues()
returns trigger language plpgsql security definer set search_path = public as
$$
declare ids uuid[] := array[]::uuid[];
begin
  if tg_op in ('INSERT','UPDATE') then ids := ids || new.abogado_id; end if;
  if tg_op in ('DELETE','UPDATE') then ids := ids || old.abogado_id; end if;
  update public.abogados a
     set promedio = coalesce((select round(avg(c.estrellas)::numeric, 2) from public.calificaciones_abogados c
                               where c.abogado_id = a.id and c.estado = 'publicada'), 0),
         total_calificaciones = (select count(*) from public.calificaciones_abogados c
                                  where c.abogado_id = a.id and c.estado = 'publicada')
   where a.id = any(ids);
  return null;
end $$;

drop trigger if exists dir_calif_despues on public.calificaciones_abogados;
create trigger dir_calif_despues after insert or update or delete on public.calificaciones_abogados
  for each row execute function public.dir_calif_despues();

alter table public.calificaciones_abogados enable row level security;
drop policy if exists calif_leer   on public.calificaciones_abogados;
drop policy if exists calif_crear  on public.calificaciones_abogados;
drop policy if exists calif_editar on public.calificaciones_abogados;
drop policy if exists calif_borrar on public.calificaciones_abogados;
create policy calif_leer   on public.calificaciones_abogados for select to anon, authenticated
  using (estado = 'publicada' or user_id = auth.uid());
create policy calif_crear  on public.calificaciones_abogados for insert to authenticated
  with check (user_id = auth.uid());
create policy calif_editar on public.calificaciones_abogados for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy calif_borrar on public.calificaciones_abogados for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.calificaciones_abogados from anon, authenticated;
grant select on public.calificaciones_abogados to anon, authenticated;
grant insert (abogado_id, user_id, estrellas, trato, claridad, puntualidad, comentario)
  on public.calificaciones_abogados to authenticated;
grant update (estrellas, trato, claridad, puntualidad, comentario)
  on public.calificaciones_abogados to authenticated;
grant delete on public.calificaciones_abogados to authenticated;

-- El abogado responde (o borra su respuesta) a un comentario de SU perfil.
create or replace function public.dir_responder(p_id uuid, p_texto text)
returns void language plpgsql security definer set search_path = public as
$$
declare t text := nullif(btrim(coalesce(p_texto, '')), '');
begin
  if t is not null then
    if char_length(t) > 800 then raise exception 'La respuesta es demasiado larga.' using errcode = 'P0001'; end if;
    perform public.dir_texto_ok(t);
  end if;
  update public.calificaciones_abogados c
     set respuesta = t, respondido_en = case when t is null then null else now() end
    from public.abogados a
   where c.id = p_id and a.id = c.abogado_id and a.user_id = auth.uid();
  if not found then raise exception 'No tienes permiso para responder este comentario.' using errcode = 'P0001'; end if;
end $$;

-- ---------- Reportes -------------------------------------------------
create table if not exists public.dir_reportes (
  id         uuid primary key default gen_random_uuid(),
  creado_en  timestamptz not null default now(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  tipo       text not null check (tipo in ('abogado','calificacion')),
  objetivo   uuid not null,
  motivo     text not null check (motivo in ('falso','ofensivo','spam','suplantacion','otro')),
  detalle    text check (detalle is null or char_length(detalle) <= 300),
  unique (tipo, objetivo, user_id)
);

create or replace function public.dir_reportes_antes()
returns trigger language plpgsql security definer set search_path = public as
$$
begin
  if (select count(*) from public.dir_reportes where user_id = new.user_id and creado_en > now() - interval '1 day') >= 20 then
    raise exception 'Alcanzaste el límite de reportes por hoy.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists dir_reportes_antes on public.dir_reportes;
create trigger dir_reportes_antes before insert on public.dir_reportes
  for each row execute function public.dir_reportes_antes();

-- 3 reportes de personas distintas ocultan el comentario hasta que lo revises.
-- (Los perfiles de abogados nunca se ocultan solos: lo decides tú en el panel.)
create or replace function public.dir_reportes_despues()
returns trigger language plpgsql security definer set search_path = public as
$$
begin
  if new.tipo = 'calificacion'
     and (select count(distinct user_id) from public.dir_reportes where tipo = 'calificacion' and objetivo = new.objetivo) >= 3 then
    update public.calificaciones_abogados set estado = 'en_revision' where id = new.objetivo and estado = 'publicada';
  end if;
  return null;
end $$;
drop trigger if exists dir_reportes_despues on public.dir_reportes;
create trigger dir_reportes_despues after insert on public.dir_reportes
  for each row execute function public.dir_reportes_despues();

alter table public.dir_reportes enable row level security;
drop policy if exists reportes_crear on public.dir_reportes;
create policy reportes_crear on public.dir_reportes for insert to authenticated
  with check (user_id = auth.uid());
revoke all on public.dir_reportes from anon, authenticated;
grant insert (user_id, tipo, objetivo, motivo, detalle) on public.dir_reportes to authenticated;

-- ---------- Búsqueda y resumen ---------------------------------------
create or replace function public.dir_buscar(
  p_q text default '', p_provincia text default null, p_canton text default null,
  p_especialidad text default null, p_verificados boolean default false,
  p_orden text default 'relevancia', p_limite int default 12, p_desde int default 0)
returns jsonb language sql stable set search_path = public, extensions as
$$
  with params as (
    select string_to_array(btrim(regexp_replace(public.dir_norm(left(coalesce(p_q, ''), 120)), '[^a-z0-9 ]', ' ', 'g')), ' ') as w
  ),
  filtrados as (
    select a.*
      from public.abogados a, params
     where a.estado = 'activo'
       and (nullif(p_provincia, '') is null or a.provincia = p_provincia or p_provincia = any(a.provincias_atencion))
       and (nullif(p_canton, '') is null or a.canton = p_canton)
       and (nullif(p_especialidad, '') is null or p_especialidad = any(a.especialidades))
       and (not coalesce(p_verificados, false) or a.verificado)
       and a.busqueda like all (array(select '%' || x || '%' from unnest(params.w) x where x <> ''))
  ),
  ordenados as (
    select f.*,
           row_number() over (order by
             case when nullif(p_provincia, '') is not null and f.provincia = p_provincia then 0 else 1 end,
             case when p_orden = 'relevancia' and f.verificado then 0 else 1 end,
             case when p_orden in ('relevancia', 'calificacion') then f.promedio end desc nulls last,
             case when p_orden in ('relevancia', 'calificacion') then f.total_calificaciones end desc nulls last,
             case when p_orden = 'recientes' then f.creado_en end desc nulls last,
             f.nombres) as rn
      from filtrados f
  )
  select jsonb_build_object(
    'total', (select count(*) from filtrados),
    'items', coalesce((
      select jsonb_agg(to_jsonb(o) - 'rn' - 'busqueda' - 'matricula_norm' - 'user_id' - 'acepta_publicar' - 'estado' order by o.rn)
        from ordenados o
       where o.rn > greatest(coalesce(p_desde, 0), 0)
         and o.rn <= greatest(coalesce(p_desde, 0), 0) + least(greatest(coalesce(p_limite, 12), 1), 50)
    ), '[]'::jsonb))
$$;

create or replace function public.dir_resumen()
returns jsonb language sql stable set search_path = public as
$$
  select jsonb_build_object(
    'abogados',      (select count(*) from public.abogados where estado = 'activo'),
    'verificados',   (select count(*) from public.abogados where estado = 'activo' and verificado),
    'calificaciones',(select count(*) from public.calificaciones_abogados where estado = 'publicada'),
    'provincias',    coalesce((select jsonb_object_agg(provincia, n) from
                        (select provincia, count(*) n from public.abogados where estado = 'activo' group by provincia) p), '{}'::jsonb)
  )
$$;

revoke execute on function public.dir_buscar(text,text,text,text,boolean,text,int,int) from public, anon, authenticated;
revoke execute on function public.dir_resumen() from public, anon, authenticated;
revoke execute on function public.dir_responder(uuid,text) from public, anon, authenticated;
revoke execute on function public.dir_ocultar_perfil(boolean) from public, anon, authenticated;
-- Las funciones de los triggers no deben poder llamarse desde la API.
revoke execute on function public.dir_abogados_antes() from public, anon, authenticated;
revoke execute on function public.dir_calif_antes() from public, anon, authenticated;
revoke execute on function public.dir_calif_despues() from public, anon, authenticated;
revoke execute on function public.dir_reportes_antes() from public, anon, authenticated;
revoke execute on function public.dir_reportes_despues() from public, anon, authenticated;
grant execute on function public.dir_buscar(text,text,text,text,boolean,text,int,int) to anon, authenticated;
grant execute on function public.dir_resumen() to anon, authenticated;
grant execute on function public.dir_responder(uuid,text) to authenticated;
grant execute on function public.dir_ocultar_perfil(boolean) to authenticated;

-- =====================================================================
--  CÓMO VERIFICAR A UN ABOGADO (lo haces tú, en el SQL Editor):
--    1) Comprueba su matrícula en la consulta pública del Foro de Abogados
--       del Consejo de la Judicatura.
--    2) Ejecuta:  update public.abogados set verificado = true
--                  where matricula_norm = upper(regexp_replace('17-2015-123','[^0-9A-Za-z]','','g'));
--    Para quitar la insignia:  ... set verificado = false ...
--    Para restaurar un comentario ocultado por reportes:
--       update public.calificaciones_abogados set estado = 'publicada' where id = '...';
--    Para ver reportes:  select * from public.dir_reportes order by creado_en desc;
-- =====================================================================
