-- Migração: alunos.curso (texto) -> alunos.curso_id (chave estrangeira para cursos)
-- Rode no SQL Editor do Supabase, UMA vez, em um projeto que já tem a tabela alunos.
-- Os dados dos alunos são preservados.

-- 1) cria a tabela cursos (lado 1 do relacionamento)
create table if not exists cursos (
  id bigint generated always as identity primary key,
  nome text not null unique,
  criado_em timestamptz default now()
);

-- 2) cada nome de curso diferente que já existe em alunos vira um curso
insert into cursos (nome)
select distinct curso from alunos where curso is not null and curso <> ''
on conflict (nome) do nothing;

insert into cursos (nome) values ('Sem curso') on conflict (nome) do nothing;

-- 3) nova coluna com a chave estrangeira (ainda pode ficar vazia)
alter table alunos add column if not exists
  curso_id bigint references cursos(id) on delete restrict;

-- 4) liga cada aluno ao curso que tem o mesmo nome do texto antigo
update alunos a set curso_id = c.id
from cursos c
where c.nome = coalesce(nullif(a.curso, ''), 'Sem curso');

-- 5) agora todos têm curso: a coluna vira obrigatória
alter table alunos alter column curso_id set not null;

-- 6) a coluna de texto antiga não é mais necessária
alter table alunos drop column if exists curso;
