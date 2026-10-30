# Roadmap

## Assinaturas mensais Mercado Pago
- [x] Preparar checkout mensal com preço conferido no servidor, consentimento e telas de assinatura; PIX permanece avulso
- [ ] Validar primeira cobrança, renovações e cancelamentos com o Mercado Pago: depende da confirmação do mecanismo de notificações para assinaturas e de uma contratação de teste; nenhuma cobrança real foi executada
- [ ] Ativar assinaturas somente após validação: notificações de assinatura e credenciais de teste ainda pendentes; fluxo permanece desligado, compras antigas preservadas
- [x] Verificar telas administrativas e área do aluno em desktop/mobile, bloqueio de ativação, retorno pendente e recusa do webhook não configurado; 15 testes passaram

## Velocidade e coerência da navegação
- [x] Reduzir carregamentos repetidos e o peso inicial: autenticação compartilhada, PDFs e abas opcionais sob demanda, treinos com exercícios vinculados e assinaturas de aulas em lote
- [x] Alinhar menu lateral e títulos com o conteúdo: Visão geral, Críticas e sugestões, Ofertas extras e título da página atual
- [x] Verificar navegação administrativa autenticada, leitura do treino real de teste, carregamento seletivo de aulas e celular sem rolagem lateral; 12 testes passaram

## Correção do gerador administrativo
- [x] Corrigir geração e salvar somente exercícios com vídeos reais
- [x] Testar criação, regeneração e leitura na conta de teste: quatro dias e 28 exercícios vinculados; player abriu com vídeo assinado
- [ ] Reprodução do arquivo testado: navegador rejeitou formato (erro 4); requer conversão dos arquivos para formato compatível

## Prévias nos treinos do aluno
- [x] Conferir resolução dos vídeos e adicionar prévia clicável por exercício
- [x] Verificar layout e abertura do player com catálogo real em sessão administrativa, sem alterar dados; sem rolagem lateral no celular
- [ ] Confirmar miniatura/reprodução no acesso de aluno: treinos antigos sem vínculo e gravações incompatíveis no Chromium; depende da revisão dos vídeos e autorização para testar a conta do aluno

## Treinos automáticos com vídeos
- [x] Restringir IA e treino imediato ao catálogo de exercícios com vídeo e considerar complexidade
- [x] Garantir vínculo aos vídeos, fallback de outra academia e testar geração/gravação e seleção com catálogo real
- [ ] Confirmar reprodução de todos os arquivos: vídeo real abriu com URL assinada, mas Chromium rejeitou formato/codecs (erro 4); exige revisão/conversão da mídia

## Cadastro manual de alunos
- [x] Corrigir bloqueio no cadastro e validar criação e leitura do aluno no painel

## Acompanhamento de envios
- [x] Criar aba e indicador de progresso fora das janelas de envio
- [x] Manter progresso ao navegar e avisar antes de fechar a página
- [x] Verificar envio e conclusão com a janela fechada

## Identificação de vídeos da biblioteca
- [x] Identificar exercício por imagens do vídeo no envio individual e em massa
- [x] Avisar sobre exercícios e vídeos possivelmente duplicados antes de salvar
- [x] Testar chamadas reais de IA, incerteza e revisão antes do envio; precisão em gravações reais de movimento ainda depende de vídeo do usuário

- [x] Analisar fluxos atuais de cliente, administração, autenticação e pagamentos
- [x] Criar Críticas e Sugestões para cliente e administrador
- [x] Melhorar academia, saudação, check-in, logout e navegação da cliente
- [x] Vincular vídeos da biblioteca aos exercícios dos treinos
- [x] Criar boas-vindas pós-pagamento no primeiro acesso
- [x] Coletar preferências alimentares no funil e exibir ao profissional
- [x] Validar fluxos, segurança e responsividade
- [x] Permitir que o administrador altere a senha de qualquer aluno

## Otimização completa e responsividade mobile
- [x] Auditar todas as telas da área do aluno e painel em celular e desktop
- [x] Corrigir navegação, hierarquia, espaçamentos, overflow e tamanhos de toque
- [x] Revisar estados de carregamento, vazio e erro sem alterar regras existentes
- [x] Validar fluxos principais em celular e desktop
- [x] Reformular toda a identidade visual para preto, vermelho e prata usando o novo logo; preservar funções e validar desktop/mobile.
