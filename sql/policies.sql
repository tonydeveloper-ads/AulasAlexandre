-- Políticas de estudo: liberam a chave anon para ler, criar, alterar e apagar.
-- ATENÇÃO: com using (true), qualquer pessoa com a anon key mexe nos dados.
-- Serve para aprender CRUD, não para um app real com dados sensíveis.
-- Pode rodar de novo sem erro (drop policy if exists).

-- 1) liga o RLS nas duas tabelas
alter table cursos enable row level security;
alter table alunos enable row level security;

-- ===================== CURSOS =====================
drop policy if exists "cursos_select_anon" on cursos;
create policy "cursos_select_anon" on cursos for select to anon using (true);

drop policy if exists "cursos_insert_anon" on cursos;
create policy "cursos_insert_anon" on cursos for insert to anon with check (true);

drop policy if exists "cursos_update_anon" on cursos;
create policy "cursos_update_anon" on cursos for update to anon
  using (true) with check (true);

drop policy if exists "cursos_delete_anon" on cursos;
create policy "cursos_delete_anon" on cursos for delete to anon using (true);

-- ===================== ALUNOS =====================
drop policy if exists "alunos_select_anon" on alunos;
create policy "alunos_select_anon" on alunos for select to anon using (true);

drop policy if exists "alunos_insert_anon" on alunos;
create policy "alunos_insert_anon" on alunos for insert to anon with check (true);

drop policy if exists "alunos_update_anon" on alunos;
create policy "alunos_update_anon" on alunos for update to anon
  using (true) with check (true);

drop policy if exists "alunos_delete_anon" on alunos;
create policy "alunos_delete_anon" on alunos for delete to anon using (true);
