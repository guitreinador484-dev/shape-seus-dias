# Assinaturas mensais com Mercado Pago

## O que será alterado
- Novas contratações poderão ser assinaturas mensais dos planos Básico, Intermediário e Avançado, usando o Mercado Pago já conectado.
- Alimentação e aulas selecionadas entrarão no total mensal da assinatura, com os valores já configurados no funil.
- Antes de confirmar, o cliente verá o total por mês e aceitará expressamente a cobrança recorrente no cartão.
- O PIX continuará disponível como compra avulsa, claramente identificado como não recorrente. Compras antigas não serão convertidas nem cobradas novamente.

## Compra e acesso
- Encaminhar o cliente à autorização segura da assinatura no Mercado Pago; a plataforma não armazenará dados de cartão.
- Liberar conta, treino e adicionais somente após confirmar a primeira cobrança aprovada — autorizar uma assinatura não significa que o pagamento já foi recebido.
- Manter o fluxo de criação de senha para novos compradores e reutilizar a conta de quem já é aluno, sem recriar conta ou reenviar senha a cada renovação.
- Registrar as cobranças seguintes e renovar o período de acesso uma única vez por pagamento aprovado.
- Permitir consultar e cancelar a assinatura na área do aluno e no painel de vendas. Cancelar interrompe cobranças futuras, mantendo o período já pago; cobrança recusada não renova o acesso.
- Preservar acessos administrativos, presenciais e concessões manuais existentes.

## Segurança e ativação
- Validar no servidor os preços dos planos e adicionais publicados, sem aceitar valores ou permissões enviados pelo navegador como fonte de verdade.
- Confirmar notificações do Mercado Pago, conferir os pagamentos diretamente com o serviço e impedir processamento duplicado.
- Deixar a ativação administrativa bloqueada enquanto os requisitos de notificações e o teste de assinatura não estiverem confirmados.
- Nenhuma cobrança real será feita durante a implementação sem autorização específica.

## Detalhes técnicos
- Adicionar registros de assinaturas e cobranças com permissões de leitura para o próprio aluno e administradores; gravações de pagamento somente pelo servidor.
- Integrar a API de Assinaturas do Mercado Pago e suas notificações ao provisionamento existente, preservando o pagamento avulso.
- Usar testes para recorrência de um mês, soma dos adicionais, confirmação da primeira cobrança, renovação idempotente e cancelamento sem perda do período pago.
- Conferir o fluxo no computador e celular e informar claramente qualquer etapa que dependa de configuração ou teste no Mercado Pago antes de publicar.