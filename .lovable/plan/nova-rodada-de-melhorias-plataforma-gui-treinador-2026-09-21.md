# Nova rodada de melhorias — Plataforma Gui Treinador

## Objetivo
Evoluir a plataforma atual sem recriar telas, substituir autenticação ou alterar o funcionamento dos pagamentos. As mudanças serão incrementais, com foco na experiência mobile, segurança dos dados e reaproveitamento dos recursos existentes.

## O que será preservado
- Área autenticada e proteção atual das páginas privadas.
- Pagamento Mercado Pago, criação de conta/senha e geração automática do treino.
- Abas atuais: treino, aulas, dieta, evolução, ficha, cursos e mentoria.
- Biblioteca privada de exercícios, academias, vídeos por exercício e preferência de academia.
- Painel administrativo, tema configurável, PDFs e regras de acesso por plano/order bump.

## Implementação

### 1. Críticas e sugestões
- Criar uma tabela segura de feedbacks vinculada à cliente autenticada, com tipo, mensagem, status e datas.
- Permitir que cada cliente envie e consulte apenas os próprios feedbacks; o administrador poderá visualizar e organizar todos.
- Adicionar uma tela simples na área da cliente com tipo, mensagem, validação, envio, carregamento, sucesso e erro.
- Adicionar “Feedbacks” ao painel administrativo, com filtros por tipo/status, identificação da cliente e marcação como lido/resolvido.

### 2. Escolha de academia na Mentoria
- Manter a preferência já salva em `user_gym_preference`.
- Trocar o seletor discreto por cartões claros com nome, bairro/localização, indicador de seleção e botão “Selecionar academia”.
- Mostrar a academia atual em destaque e oferecer “Alterar academia”.
- Preservar o modal obrigatório no primeiro acesso e o fallback vídeo da academia → vídeo geral.
- Exibir estados de carregamento, lista vazia e erro, com boa experiência no celular.

### 3. Saudação personalizada
- Carregar `profiles.full_name` junto aos dados já buscados na plataforma.
- Usar o primeiro nome válido na saudação: “Olá, Maria 👋”.
- Usar com segurança “Olá 👋” quando o nome estiver ausente.

### 4. Check-in mais destacado
- Manter integralmente a lógica e os dados atuais.
- Reorganizar o cartão para destacar a ação principal, melhorar áreas de toque e adaptar calendário/botão no celular.
- Diferenciar claramente os estados “Salvar check-in” e “Check-in realizado”, sem mudar o comportamento de gravação.
- Integrar o acesso rápido “Check-in” ao novo menu inferior.

### 5. Sair da conta com segurança
- Criar confirmação “Tem certeza que deseja sair?” no menu/perfil.
- Padronizar a saída: cancelar requisições, limpar dados protegidos em cache, encerrar sessão e substituir o histórico pela tela de login.
- Manter a proteção já existente para impedir retorno a páginas privadas pelo botão voltar.

### 6. Vídeos nos exercícios dos treinos
- Reutilizar `exercises`, `exercise_videos`, `student_plan_exercises.exercise_id`, vídeos privados e links temporários já existentes.
- Mostrar “Assistir execução” em todo exercício que tenha vínculo, não apenas para clientes da mentoria, respeitando o acesso ao treino.
- Quando um treino antigo tiver apenas o nome, localizar o exercício normalizado como compatibilidade; novos treinos continuarão gravando o vínculo direto.
- Manter no painel Biblioteca de Exercícios as ações já existentes de cadastrar, alterar, remover e associar vídeos.
- Exibir estado claro quando ainda não houver vídeo, sem bloquear a execução do treino.

### 7. Boas-vindas após pagamento confirmado
- Adicionar ao perfil o registro de conclusão das boas-vindas e criar configuração administrativa para URL/título/texto do vídeo.
- Após login, verificar no servidor se a cliente possui compra aprovada vinculada ao próprio usuário e ainda não concluiu essa etapa.
- Mostrar uma tela protegida “Pagamento confirmado! 🎉”, vídeo responsivo e botão “Começar minha jornada”.
- Registrar a conclusão somente ao clicar no botão; se sair antes, retomar no próximo acesso.
- Não acionar pela tentativa de pagamento, pela página pública ou por compra pendente.
- Compras futuras poderão reabrir o fluxo somente se representarem uma nova jornada ainda não concluída, usando a compra aprovada como referência, sem repetir em todo login.

### 8. Preferências alimentares no funil
- Adicionar uma etapa curta antes da escolha do plano/checkout, em blocos adequados ao celular.
- Coletar preferências, alimentos evitados, restrições, alergias, rotina e objetivo alimentar, com aviso de que não é diagnóstico médico.
- Salvar as respostas inicialmente no lead junto às respostas do funil, sem interromper o checkout.
- No provisionamento após pagamento, copiar essas respostas para um registro nutricional vinculado à cliente.
- Exibir as informações no perfil administrativo do aluno para o profissional consultar.
- Validar textos e limites no navegador e no servidor.

### 9. Menu da área da cliente
- Manter as abas existentes e reorganizá-las em uma navegação responsiva controlada pelo mesmo estado.
- No celular, criar barra inferior fixa com: Início, Treinos, Check-in, Mentoria e Perfil.
- Quando a cliente não tiver Mentoria, o espaço continuará oferecendo acesso às funções existentes apropriadas, sem criar um botão sem destino.
- Colocar Dieta, Aulas, Evolução, Ficha, Cursos e Feedback em “Perfil/Mais”, preservando todos os acessos e regras atuais.
- No desktop, manter navegação ampla e clara no topo, sem cobrir conteúdo.
- Reservar espaço inferior com suporte à área segura de iPhone/Android e destacar a seção ativa.

### 10. Revisão e validação
- Validar login, logout, proteção da rota e persistência de sessão.
- Validar envio/leitura de feedback, academia, saudação, check-in, treino e vídeos.
- Validar compra aprovada → conta → login → boas-vindas → plataforma e não repetição após conclusão.
- Validar coleta nutricional no funil e consulta administrativa.
- Testar desktop e celular, incluindo carregamento, vazios, erros, sucesso, modais, áreas de toque e conteúdo não encoberto.
- Corrigir apenas problemas diretamente ligados a esses fluxos, sem ampliar o escopo.

## Alterações no banco e segurança
- Nova tabela `feedbacks`, com acesso da cliente apenas aos próprios registros e gestão exclusiva do administrador.
- Nova tabela `nutrition_intake` para preferências alimentares vinculadas à cliente, com leitura/edição próprias e gestão administrativa.
- Novos campos em `profiles` para controlar a etapa de boas-vindas concluída e a última compra apresentada.
- Índices para consultas por cliente, status e data.
- Regras de acesso em todas as novas estruturas, permissões explícitas e atualização automática de datas.
- A compra aprovada continuará sendo a fonte de verdade; nenhuma decisão de acesso será feita apenas no navegador.

## Detalhes técnicos
- Reutilizar o componente atual de vídeo do exercício e o vínculo `exercise_id` já existente.
- Reutilizar `quiz_config` para o vídeo/textos administrativos de boas-vindas, evitando uma estrutura paralela de configurações.
- Criar funções protegidas no servidor para verificar/concluir boas-vindas e para ações administrativas de feedback.
- Manter as leituras da própria cliente sob as regras de acesso do banco.
- Separar os novos blocos visuais em componentes pequenos para reduzir o tamanho da página principal sem reescrever sua arquitetura.
