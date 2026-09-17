# Treinos em PDF, acesso do aluno e correções

## 1. PDF do treino (admin)

Na aba **Treinos**, cada treino do aluno ganha o botão **Gerar PDF**.
O PDF é montado com os dados já cadastrados: nome do aluno, nome do treino,
data, e a lista de exercícios com séries, repetições, carga, descanso e
observações. Cabeçalho com o nome do profissional.

Depois de gerado aparecem: **Ver**, **Baixar**, **Gerar novamente**
(substitui o anterior) e **Excluir**. Um treino tem sempre um único PDF atual,
então não sobram arquivos soltos.

Também é possível **enviar um PDF pronto** do computador e vinculá-lo ao aluno
e ao treino escolhidos.

Falta hoje o campo **Carga** no exercício — será adicionado ao cadastro e ao PDF.

## 2. Área do aluno

Na aba **Meu treino**, cada dia de treino com PDF disponível mostra
**Baixar treino em PDF** e um link para visualizar. O aluno só enxerga os
próprios treinos e arquivos.

## 3. Compra → acesso do aluno

O fluxo já existe; será reforçado:
- busca pelo e-mail da compra antes de criar qualquer conta (sem contas duplicadas);
- compra repetida do mesmo e-mail apenas renova o acesso da conta existente;
- e-mail de definição de senha reenviado se a conta já existir sem senha.

A tela **Crie sua senha** (nova senha + confirmar senha, com validação e
mensagens claras) substitui a tela atual de redefinição, redirecionando para a
área do aluno ao concluir.

## 4. Cadastro manual de aluno

- E-mail já existente passa a dar a mensagem "Este e-mail já está cadastrado"
  em vez de erro técnico.
- Após salvar, o aluno aparece na lista na hora, sem recarregar a página.
- Estados de carregando, sucesso e erro revisados no formulário.

## 5. Menu lateral

Remoção de **Configurações** do menu do admin. A página continua existindo para
não quebrar nada, apenas sai da navegação principal.

## 6. Auditoria de botões

Varredura dos painéis administrativos e da área do aluno: botões sem ação são
removidos ou ligados, ações destrutivas ganham confirmação, e salvar/editar/
excluir passam a mostrar carregando + mensagem de sucesso ou erro.

## 7. Segurança

Regras de acesso no banco para os PDFs: o aluno lê apenas os próprios; somente
o administrador cria, substitui e exclui. Arquivos ficam em armazenamento
privado, acessados por link temporário — nunca por URL pública.

---

## Detalhes técnicos

- Migração: coluna `load_text` em `student_plan_exercises`; nova tabela
  `workout_pdfs` (`student_id`, `plan_id` único, `file_path`, `version`,
  `generated_at`, `source` gerado/upload) com GRANTs + RLS
  (aluno: SELECT próprio; admin via `has_role`: ALL).
- Bucket privado `workout-pdfs` com políticas em `storage.objects` baseadas em
  `has_role` e no prefixo `<user_id>/`.
- Geração do PDF com `jspdf` (já instalado) no cliente admin; upload do blob
  via server fn `saveWorkoutPdf` (`supabaseAdmin`, checagem `assertAdmin`).
- Server fns novas em `src/lib/workout-pdf.functions.ts`:
  `saveWorkoutPdf`, `deleteWorkoutPdf`, `getWorkoutPdfUrl` (signed URL 1h,
  valida dono ou admin).
- `provisionAccess` em `src/lib/access.server.ts`: busca prévia por e-mail em
  `auth.users` via `listUsers`, não só em `profiles`.
- `/reset-password` renomeado na UI para "Crie sua senha" com confirmação.
