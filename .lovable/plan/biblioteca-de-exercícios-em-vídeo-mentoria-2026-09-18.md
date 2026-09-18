# Biblioteca de Exercícios em vídeo (Mentoria)

Área exclusiva para alunos da mentoria, com vídeos por exercício e por academia de Volta Redonda. Mantém o visual, as cores e os componentes que o painel já usa.

## 1. Banco de dados

Novas tabelas:
- **exercises** — nome, grupo muscular (Peito, Costas, Pernas, Ombros, Bíceps, Tríceps, Abdômen, Glúteos, Cardio, Outros), descrição.
- **gyms** — nome, bairro/endereço, ativo/inativo.
- **exercise_videos** — exercício, academia (vazio = vale para todas), título, observações, arquivo do vídeo, miniatura, data.
- **user_gym_preference** — academia escolhida por cada aluno.

Alterações:
- Novo papel **aluno_mentoria** somado aos papéis atuais (admin, online, presencial).
- Os exercícios do treino do aluno ganham ligação opcional com um exercício da biblioteca.

Regras de acesso (aplicadas no banco, não só na tela):
- Só o administrador cria, edita e apaga exercícios, academias e vídeos.
- Só administrador e aluno de mentoria conseguem ver os vídeos.
- Cada aluno só vê e altera a própria escolha de academia.
- Lista de academias e exercícios visível para quem está logado.

Arquivos de vídeo em um espaço privado de armazenamento, com link temporário assinado na hora de assistir. Limite de tamanho configurável (padrão 200 MB), aceitando mp4, mov e webm.

## 2. Painel do administrador

Novo item no menu lateral, no grupo Conteúdo: **Biblioteca de Exercícios** (`/admin/biblioteca`), com três abas:

1. **Exercícios** — listar, criar, editar e excluir; busca por nome e filtro por grupo muscular.
2. **Academias** — listar, criar, editar, excluir e ativar/desativar academias de Volta Redonda.
3. **Vídeos** — botão "Adicionar vídeo" com:
   - envio do arquivo por arrastar e soltar ou seleção, com barra de progresso;
   - campo de busca para escolher o exercício, com opção "+ Criar novo exercício" na hora;
   - escolha da academia, incluindo "Todas as academias";
   - título e observações opcionais.
   Listagem com miniatura, exercício, academia e data; filtros por exercício e academia; ações editar, trocar vídeo e excluir. Vários vídeos por exercício (um por academia).

Na página do aluno (`/admin/alunos` e perfil do aluno): botão para marcar/desmarcar **aluno da mentoria**, com confirmação e aviso de sucesso.

## 3. Área do aluno

- Nova aba **Mentoria** dentro da plataforma (`/plataforma/mentoria`), visível só para aluno de mentoria. Quem não tem o acesso vê uma mensagem explicando que o conteúdo é exclusivo da mentoria, com botão para voltar.
- No topo da área da mentoria, seletor da academia onde o aluno treina; a escolha fica salva na conta. No primeiro acesso, pedimos a escolha antes de mostrar a biblioteca; pode trocar quando quiser.
- **Biblioteca navegável**: lista de exercícios com busca e filtro por grupo muscular, exibindo o vídeo da academia escolhida.
- **Exercício do dia**: cada exercício do treino vira clicável e abre uma janela com nome, grupo muscular, player com controles e tela cheia, observações e o vídeo certo:
  1. vídeo da academia escolhida;
  2. senão, vídeo genérico;
  3. senão, "Vídeo ainda não disponível para esta academia".
  Fecha no X, clicando fora ou com ESC.

## 4. Detalhes técnicos

- Migração cria tabelas, novo valor do papel, coluna de ligação nos exercícios do treino, GRANTs e políticas RLS.
- Novo espaço privado de armazenamento `exercise-videos` com políticas por papel; leitura via link assinado gerado em função de servidor.
- Novos módulos: `src/lib/exercise-library.functions.ts` (consultas e gravações), painel `src/components/admin/exercise-library-panel.tsx`, rota `src/routes/_authenticated/admin.biblioteca.tsx`, rota `src/routes/_authenticated/plataforma.mentoria.tsx` e modal reutilizável `src/components/platform/exercise-video-dialog.tsx`.
- Vídeos com `preload="metadata"` e carregamento sob demanda; tudo responsivo com prioridade para celular; avisos de sucesso/erro em português.

## 5. Fora do escopo

- Não altero treinos, vendas, funil, nutrição nem cursos, além de tornar os exercícios do treino clicáveis.
