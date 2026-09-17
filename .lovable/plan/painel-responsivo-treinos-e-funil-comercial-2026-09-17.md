# Painel responsivo, Treinos e Funil comercial

## Objetivo
Deixar todas as telas administrativas utilizáveis no celular, reorganizar Treinos com ações claras e transformar a lista atual de leads em um funil comercial com etapas persistidas.

## Implementação

### 1. Responsividade do painel
- Ajustar cabeçalhos e barras de ações para empilharem no celular, mantendo a ação principal sempre acessível.
- Trocar tabelas largas por cartões compactos no celular, preservando tabelas no desktop.
- Adaptar filtros, seletores, formulários, abas, editores de curso e janelas para a largura da tela, com rolagem apenas onde necessária.
- Garantir que o menu lateral continue recolhível no celular e feche após a navegação.
- Revisar Dashboard, Alunos, Perfil do aluno, Treinos, Nutrição, Cursos, Aulas, Plataforma do aluno, Engajamento, Vendas, Funil e Ofertas extras.

### 2. Página de Treinos
- Criar um cabeçalho com “Novo treino” como ação principal e filtros compactos por aluno.
- Exibir cada treino com nome, aluno, dia, quantidade de exercícios, atualização, situação do PDF e menu “Ações”.
- Manter adicionar exercícios e biblioteca dentro da edição do treino, adaptadas ao celular.
- Agrupar Visualizar/Editar, Gerar ou baixar PDF, Duplicar e Excluir; ações destrutivas terão confirmação.
- Criar estado vazio com escolha de aluno e botão para cadastrar o primeiro treino.

### 3. Funil comercial real
- Usar as etapas: Lead → Contato → Interessado → Oferta → Compra → Aluno.
- Salvar cada mudança de etapa no banco, com validação de administrador e histórico mínimo da última alteração.
- Mostrar um quadro em colunas no desktop e uma visão compacta por etapa no celular, com contagens e cartões de contato.
- Permitir mover uma pessoa para frente ou para trás por um seletor claro em cada cartão.
- Ao chegar em Compra, relacionar uma compra já existente pelo e-mail; ao chegar em Aluno, criar/liberar o acesso usando o fluxo seguro existente, sem duplicar e-mail. Quando faltarem dados necessários, mostrar exatamente o que precisa ser preenchido.
- Manter compatibilidade com leads antigos, convertendo os estados atuais para a etapa correspondente.

### 4. Validação
- Testar navegação e ações centrais em desktop e celular.
- Conferir estados vazio, carregando, erro e sucesso.
- Confirmar que as mudanças do funil persistem após recarregar e que a criação de aluno não duplica contas.

## Detalhes técnicos
- Será adicionada uma migração segura para ampliar os estados permitidos de `leads` e registrar `stage_updated_at`; as permissões existentes continuam restritas ao administrador.
- As alterações de etapa e a conversão em aluno ocorrerão em funções protegidas no servidor.
- Os dados e rotas existentes serão preservados; a revisão altera apresentação e organiza ações sem apagar funcionalidades.
