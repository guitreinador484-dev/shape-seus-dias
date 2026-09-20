# Melhorar PDFs de treino e alimentação

## Resultado
- Deixar o PDF de treino mais profissional, organizado e fácil de acompanhar.
- Permitir um PDF alimentar fixo na página **Nutrição**, disponível automaticamente para quem comprar uma oferta marcada com acesso à alimentação.
- Permitir escolher, em cada oferta extra, se ela libera **Alimentação**, **Aulas em vídeo** ou ambos.

## Banco e acesso
- Criar uma tabela para guardar a identificação das ofertas compradas em cada venda, preservando o histórico mesmo que a oferta seja editada depois.
- Criar uma tabela para o PDF alimentar fixo, com título, arquivo, versão, situação e datas.
- Criar armazenamento privado para PDFs de alimentação.
- Aplicar permissões para que somente o administrador envie, substitua ou exclua arquivos.
- Liberar a leitura do PDF somente para administradores e alunos com uma compra aprovada que contenha uma oferta configurada para liberar alimentação.
- Manter compatibilidade com compras antigas que já possuem o acesso adicional atual.

## Painel de ofertas extras
- Adicionar em cada oferta os controles **Libera alimentação** e **Libera aulas em vídeo**.
- Enviar ao pagamento os identificadores das ofertas selecionadas, além do valor total.
- Após a aprovação, liberar apenas os recursos marcados nas ofertas compradas.

## Página Nutrição
- Adicionar uma seção **PDF alimentar para compradores**.
- Permitir enviar um PDF, mostrar uma prévia do arquivo selecionado, acompanhar o envio e depois abrir, baixar, substituir ou excluir.
- Mostrar claramente quantos alunos têm acesso por compra da oferta de alimentação.
- Manter os planos alimentares individuais já existentes sem alterações.

## Área do aluno
- Mostrar o PDF fixo no início da aba Dieta para quem tem direito, com botões **Abrir PDF** e **Baixar**.
- Exibir carregamento, erro e estado vazio em português.
- Manter a aba bloqueada para quem não comprou uma oferta que libere alimentação.

## PDF de treino
- Melhorar cabeçalho, identificação do aluno e do plano, destaque de objetivo e metas, tabela dos exercícios e rodapé.
- Aumentar legibilidade, espaçamento e contraste; quebrar textos longos corretamente e repetir o cabeçalho da tabela em novas páginas.
- Adicionar campos visuais para acompanhamento de carga e conclusão sem remover os dados atuais.
- Preservar geração automática, envio, substituição, abertura e download atuais.

## Validação
- Testar configuração da oferta, compra registrada, liberação por tipo de conteúdo, envio/substituição/exclusão do PDF alimentar e visualização pelo aluno.
- Conferir o novo PDF de treino visualmente em todas as páginas e corrigir cortes ou sobreposições.
- Validar painel e área do aluno no computador e no celular.
