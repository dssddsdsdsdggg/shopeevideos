# Shopee Vídeo Studio PWA

Esta versão não usa VPS nem automação de navegador remoto. Prompts, rascunhos, imagens e processamento de mídia ficam no navegador. A chave Gemini é guardada somente na sessão quando essa opção está marcada.

## Abrir no Windows

1. Execute `start-pwa.bat`.
2. Abra `http://localhost:4173`.
3. Use o botão **Instalar app** do navegador.

## Instalar no iPhone

O PWA precisa estar publicado em um endereço HTTPS. Abra esse endereço no Safari, toque em **Compartilhar**, escolha **Adicionar à Tela de Início** e confirme.

## Instalar no Android

Abra o endereço HTTPS no Chrome, toque em **Instalar app** ou use o menu e escolha **Adicionar à tela inicial**.

## Publicação sem VPS

Publique os arquivos desta pasta em uma hospedagem estática HTTPS. Não inclua uma chave Gemini nos arquivos. Depois de publicar, restrinja a chave no Google AI Studio ao domínio usado, quando essa opção estiver disponível no projeto.
