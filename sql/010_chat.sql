-- 010 · Chat global del estudio
-- Tabla de mensajes + Realtime habilitado

create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references profiles(id) on delete cascade,
  content     text not null check (char_length(content) > 0),
  created_at  timestamptz not null default now()
);

-- Índice para listar mensajes cronológicamente
create index idx_chat_messages_created on chat_messages(created_at desc);

-- RLS
alter table chat_messages enable row level security;

-- Cualquier usuario autenticado puede leer todos los mensajes
create policy "Chat: lectura para autenticados"
  on chat_messages for select
  to authenticated
  using (true);

-- Solo puede insertar mensajes en su propio nombre
create policy "Chat: insertar propio"
  on chat_messages for insert
  to authenticated
  with check (sender_id = auth.uid());

-- Habilitar Realtime para esta tabla
alter publication supabase_realtime add table chat_messages;
