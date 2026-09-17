# Pagamento → senha → acesso, e-mail de confirmação e plano em PDF por IA

## 1. Depois do pagamento, ir direto para criar a senha

Hoje o aluno paga e só recebe um e-mail com o link de senha. Vai passar a ser automático:

- Assim que o pagamento é aprovado (PIX na própria página ou volta do cartão), a conta é criada/localizada pelo e-mail da compra e o site já leva o comprador para a tela **"Crie sua senha"**, sem precisar abrir e-mail.
- Isso usa um link de acesso único gerado no servidor no momento da aprovação (válido só para aquela compra).
- Ao salvar a senha, ele entra direto na plataforma (já é o comportamento da tela; fica mantido).
- O e-mail com o link continua sendo enviado como reserva, caso ele feche a página.

## 2. E-mail de confirmação da compra

O aluno recebe um e-mail de confirmação com o plano comprado, o valor e o botão para criar a senha / entrar na plataforma.

Para isso é preciso ativar o envio de e-mails com o seu domínio (guitreinador.online). Não existe remetente gratuito: sem essa etapa, só continua saindo o e-mail padrão de senha. Vou abrir a configuração de domínio de e-mail junto com a entrega.

## 3. Plano em PDF gerado por IA a partir das respostas do funil

- Quando o pagamento é aprovado, a IA lê as respostas do funil daquela pessoa (medidas, objetivo, tempo disponível, experiência, dificuldades, dias de treino) e monta uma divisão de treino semanal com exercícios, séries, repetições, descanso e observações.
- Esse treino é gravado na conta do aluno, aparecendo em **Meus treinos** como qualquer treino criado por você — e você pode editar tudo depois.
- Também é gerado o **PDF do treino**, vinculado ao aluno, com o mesmo layout já usado hoje (nome do profissional, aluno, treino, data e tabela de exercícios). O aluno baixa em "Baixar treino em PDF".
- Se a IA falhar ou estiver sem créditos, a conta e o acesso continuam funcionando normalmente e fica registrado o erro — nada trava a compra.

## Detalhes técnicos

- `src/lib/access.server.ts`: `provisionAccess` passa a gerar o link de recuperação via `auth.admin.generateLink({ type: 'recovery' })` e devolver `actionLink`; mantém a busca por e-mail existente (sem duplicar conta).
- `src/lib/access.functions.ts`: retorna `actionLink` para o cliente.
- `src/routes/funil.tsx`: no polling do PIX e no retorno do cartão, ao receber `actionLink` faz `window.location.href = actionLink`; fallback para a mensagem atual caso não venha link.
- `src/routes/reset-password.tsx`: mensagens de link expirado/inválido mais claras; após salvar, redireciona para `/plataforma`.
- Novo `src/lib/ai-plan.server.ts`: chama o Lovable AI Gateway (`openai/gpt-6-astra`, streaming, saída estruturada) com as respostas do lead → divisão semanal; grava em `student_plans` + `student_plan_exercises` pelo cliente admin.
- Novo `src/lib/ai-plan.functions.ts`: `generateAiPlanFn({ reference })`, chamada pelo webhook do Mercado Pago após aprovação e também pelo funil no sucesso (idempotente por compra).
- PDF: reutiliza `buildWorkoutPdf`; salvo por um caminho de servidor que valida dono do plano (ou admin) antes de gravar em `workout_pdfs` + bucket `workout-pdfs`.
- E-mail de confirmação: templates React Email + fila de envio da infraestrutura de e-mails da Lovable, disparado após a aprovação (depende do domínio configurado).

## Dependências externas

- Configurar o domínio de e-mail (guitreinador.online) para o e-mail de confirmação sair com a sua marca.
- Publicar o site para valer em guitreinador.online.
