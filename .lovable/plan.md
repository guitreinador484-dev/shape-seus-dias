# Plataforma de cursos estilo Astron Members

Substituo a aba atual de "aulas em vídeo" por um sistema completo de cursos com módulos, aulas, progresso, comentários, materiais, certificado e controle de acesso — do zero, sem migrar as workouts existentes.

## O que muda pra você

### /admin/plataforma — Gestão
- **Cursos**: criar/editar/publicar, capa, descrição, categoria, ordem na home
- **Módulos**: dentro de cada curso, arrastar pra reordenar
- **Aulas**: título, descrição, vídeo (upload privado), thumbnail, duração, materiais anexos, dias de liberação após matrícula (drip)
- **Alunos por curso**: matricular/remover alunos de cada curso
- **Comentários**: ver e responder comentários das aulas
- **Certificado**: gerado automaticamente ao concluir 100% do curso, com nome do aluno e curso

### /plataforma — Área do aluno (estilo Astron/Netflix)
- Home com faixas de cursos matriculados + capa em destaque
- Página do curso: barra de progresso, lista de módulos e aulas, aula bloqueada mostra "libera em X dias"
- Player imersivo com botão "Marcar como concluída" e próxima aula
- Aba de materiais + aba de comentários por aula
- Botão "Baixar certificado" quando concluir 100%

## Estrutura de dados

Tabelas novas em `public` (todas com RLS + GRANTs):

```text
courses            id, title, slug, description, cover_path, is_published, order_index
course_modules     id, course_id, title, order_index
course_lessons     id, module_id, title, description, video_path,
                   thumbnail_path, duration_seconds, order_index,
                   release_days (drip: 0 = imediato)
lesson_materials   id, lesson_id, title, url|file_path, kind
lesson_comments    id, lesson_id, user_id, parent_id, content
lesson_progress    user_id, lesson_id, completed_at, watched_seconds  (PK composta)
course_enrollments user_id, course_id, enrolled_at  (PK composta)
course_certificates user_id, course_id, issued_at, code (PK composta)
```

RLS:
- Aluno vê cursos/módulos/aulas apenas se estiver em `course_enrollments`.
- Aluno só marca progresso pra si; só comenta em cursos onde está matriculado.
- Admin (via `has_role`) gerencia tudo.
- Drip calculado por: `enrolled_at + release_days` — aula "trancada" no client até liberar.

## Como fica a navegação

- Aba lateral do admin ganha item **"Cursos"** (substitui gerenciamento antigo de vídeos)
- Aba do aluno passa a ter **"Meus cursos"** no lugar de "Aulas em vídeo"
- Rota pública nova: `/plataforma/curso/$slug` (dentro de `_authenticated`)

## Ordem de entrega

1. Migração do banco (8 tabelas + RLS + GRANTs + função de certificado)
2. Bucket privado `course-assets` + policies (vídeos, capas, materiais)
3. Server functions em `src/lib/courses.functions.ts` (admin) e `src/lib/student-courses.functions.ts` (aluno)
4. Painel admin `/admin/plataforma/cursos` com editor de curso/módulo/aula, matrículas e moderação de comentários
5. Área do aluno redesenhada em `/plataforma` com faixas + página do curso + player
6. Geração de certificado em PDF client-side (jsPDF) ao atingir 100%

## Detalhes técnicos

- Vídeos e materiais em bucket privado com signed URLs (padrão já usado no projeto).
- Progresso incremental salvo no `timeupdate` do player (throttle 15s).
- Comentários com 1 nível de resposta.
- Drip calculado no servidor via view/RPC pra evitar bypass no client.
- Não migro as workouts atuais — elas continuam funcionando na aba "Meu treino"; a aba antiga "Aulas em vídeo" é substituída pela nova "Meus cursos".

## Fora do escopo desta entrega

- Gamificação (XP, ranking) — pode vir depois
- Checkout/pagamentos — matrícula é manual pelo admin
- Live/aulas ao vivo
- App mobile nativo