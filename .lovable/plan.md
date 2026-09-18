# Campo de exercício por digitação no envio de vídeos

Só muda o campo **Exercício** do formulário de envio de vídeo da Biblioteca. Todo o resto (envio do arquivo, academia, título, observações, listagens) continua igual.

## No banco

- Nova coluna `name_normalized` na tabela de exercícios: nome em minúsculo, sem acento e sem espaços extras, preenchida sozinha por gatilho ao criar ou editar.
- Preenchimento dos exercícios que já existem; nomes repetidos são unificados antes de criar o índice.
- Índice único nessa coluna, para o banco nunca aceitar dois exercícios com o mesmo nome.
- Nova função de servidor "buscar ou criar exercício": recebe o nome digitado, normaliza, devolve o exercício existente ou cria um novo em uma única operação — mesmo se dois vídeos forem enviados ao mesmo tempo, não nasce duplicado.
- Criação e edição de exercícios seguem restritas ao administrador; alunos (curso e mentoria) só leem.

## No formulário

- O seletor atual vira um campo de digitação com sugestões: conforme digita, aparecem os exercícios já cadastrados, ignorando maiúsculas, acentos e espaços extras.
- Clicou na sugestão: o vídeo é vinculado ao exercício existente.
- Nome que não existe: aparece em destaque `+ Criar "nome digitado"`; ao clicar ou apertar Enter, o exercício é criado e vinculado.
- Ao criar, um campo rápido e opcional de grupo muscular (pode ficar em branco e ser ajustado depois).
- Nome muito parecido com um já existente: aviso "Já existe um exercício com esse nome" e sugestão de usar o existente.
- Nome salvo padronizado: sem espaços extras e com a primeira letra maiúscula.
- Selo **Novo** ao lado do exercício criado ali na hora.
- Campo obrigatório: sem exercício, o botão de salvar não envia.
- Mensagens: "Exercício criado e vídeo vinculado" ou "Vídeo vinculado ao exercício existente".
- Estados de carregando, erro e lista vazia tratados; tudo em português e pensado para o celular.

## Na aba Exercícios

- Continua permitindo editar nome e grupo muscular.
- Nova ação **Mesclar**: escolher dois exercícios duplicados e juntar — os vídeos passam para o exercício escolhido e o duplicado é removido.

## Detalhes técnicos

- Migração: coluna `name_normalized`, função `public.normalize_exercise_name`, gatilho de preenchimento, deduplicação dos dados atuais, índice `UNIQUE`, e `public.find_or_create_exercise(_name text, _muscle_group text)` como `SECURITY DEFINER` com verificação de admin via `has_role` e `ON CONFLICT (name_normalized) DO UPDATE ... RETURNING`.
- `src/lib/exercise-videos.ts`: novas funções `findOrCreateExercise` (chama o RPC) e `mergeExercises`.
- `src/components/admin/exercise-library-panel.tsx`: `ExerciseCombobox` reescrito para digitação livre + criação inline; envio do vídeo passa a resolver o `exercise_id` pelo RPC antes de gravar.
