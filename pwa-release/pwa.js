(() => {
  'use strict';
  const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let installPrompt = null;
  document.body.classList.toggle('pwa-standalone', isStandalone);
  document.querySelectorAll('.navbtn[data-view="video"]').forEach(node => node.remove());
  document.getElementById('videoView')?.remove();
  document.getElementById('videoAutomationMount')?.remove();
  const shopeeImport = document.querySelector('#shopeeProductUrl')?.closest('.field');
  if (shopeeImport) shopeeImport.remove();
  const creatorMicrocopy = document.querySelector('#creatorView .microcopy');
  if (creatorMicrocopy) creatorMicrocopy.textContent = 'Campos salvos automaticamente · Ctrl/⌘ + Enter para gerar · prompts, áudio e legendas usam sua chave Gemini quando necessário.';

  const guideCards = [...document.querySelectorAll('#guideView .guide-panel')];
  const guideFour = guideCards.find(card => card.querySelector('h3')?.textContent.includes('04'));
  if (guideFour) guideFour.innerHTML = '<h3>04 · Leve o resultado para o gerador</h3><p>Gere e copie o prompt no estúdio. Depois, abra o Gemini ou Google Flow, anexe as fotos reais e cole o texto. O PWA não usa navegador remoto nem automação em VPS. A criação final respeita os recursos e limites disponíveis na sua conta Google.</p>';
  const geminiNotice = document.querySelector('#geminiView .ai-notice');
  if (geminiNotice) geminiNotice.innerHTML = '<strong>Privacidade:</strong> a API é usada para textos, análise de imagens, áudio e legendas. Sua chave fica somente nesta sessão do navegador e nunca é embutida no PWA. Para criar vídeo, copie o prompt e use diretamente sua conta no Gemini ou Google Flow.';

  const topActions = document.querySelector('.top-actions');
  const status = document.createElement('span');
  status.className = 'pwa-status';
  status.innerHTML = '<i class="pwa-status-dot" aria-hidden="true"></i><span></span>';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  function renderNetwork() {
    const online = navigator.onLine;
    status.dataset.online = String(online);
    status.querySelector('span').textContent = online ? (isStandalone ? 'App pronto' : 'Online') : 'Modo offline';
  }
  renderNetwork();
  addEventListener('online', renderNetwork);
  addEventListener('offline', renderNetwork);
  const installButton = document.createElement('button');
  installButton.type = 'button';
  installButton.className = 'pwa-install-button';
  installButton.setAttribute('aria-label', 'Instalar aplicativo');
  installButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 19h14"/></svg><span>Instalar app</span>';
  if (topActions) topActions.prepend(status, installButton);

  const dialog = document.createElement('dialog');
  dialog.className = 'pwa-dialog';
  dialog.innerHTML = '<div class="pwa-dialog-card"><div class="pwa-dialog-icon" aria-hidden="true">↗</div><h2>Instale no iPhone</h2><p>O Safari instala este estúdio como um aplicativo independente.</p><ol><li>Toque no botão <strong>Compartilhar</strong> do Safari.</li><li>Role o menu e escolha <strong>Adicionar à Tela de Início</strong>.</li><li>Confirme em <strong>Adicionar</strong>.</li></ol><button class="primary" type="button">Entendi</button></div>';
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.body.append(dialog);
  async function install() {
    if (isStandalone) return;
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice.catch(() => null);
      installPrompt = null;
      installButton.hidden = true;
      return;
    }
    if (isIOS) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      return;
    }
    alert('Abra o menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.');
  }
  installButton.addEventListener('click', install);
  addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });
  addEventListener('appinstalled', () => {
    installPrompt = null;
    installButton.hidden = true;
    window.SVSExclusiveBridge?.toast?.('Aplicativo instalado.');
  });
  if (isStandalone) installButton.hidden = true;
  const creator = document.getElementById('creatorView');
  if (creator && !isStandalone) {
    const welcome = document.createElement('section');
    welcome.className = 'pwa-welcome';
    welcome.innerHTML = '<div class="pwa-welcome-copy"><span class="pwa-welcome-kicker">APP INSTALÁVEL</span><strong>Seu estúdio pode ficar na tela inicial</strong><p>Instale para abrir em tela cheia, manter o rascunho no aparelho e acessar as ferramentas com menos etapas.</p></div><div class="pwa-welcome-actions"><button class="primary" type="button" data-pwa-install>Instalar no aparelho</button></div>';
    welcome.querySelector('button').addEventListener('click', install);
    creator.prepend(welcome);
  }
  const resultActions = document.querySelector('#creatorView .resultactions');
  if (resultActions) {
    const launch = (label, url) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = label;
      button.addEventListener('click', async () => {
        const result = window.SVSExclusiveBridge?.getCurrent?.();
        if (!result?.visual) {
          window.SVSExclusiveBridge?.toast?.('Gere um prompt antes de abrir o provedor.');
          return;
        }
        const popup = window.open(url, '_blank', 'noopener,noreferrer');
        await window.SVSExclusiveBridge.copyText(result.visual);
        if (!popup) location.href = url;
      });
      return button;
    };
    resultActions.append(
      launch('Copiar e abrir Gemini', 'https://gemini.google.com/app'),
      launch('Copiar e abrir Flow', 'https://labs.google/fx/tools/flow')
    );
  }
  const requestedView = new URLSearchParams(location.search).get('view');
  if (requestedView && requestedView !== 'video') {
    document.querySelector('.navbtn[data-view="' + CSS.escape(requestedView) + '"]')?.click();
  }
  if ('storage' in navigator && 'persist' in navigator.storage) navigator.storage.persist().catch(() => false);
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const update = document.createElement('div');
  update.className = 'pwa-update';
  update.innerHTML = '<span>Uma versão nova do estúdio está pronta.</span><button type="button">Atualizar</button>';
  document.body.append(update);
  navigator.serviceWorker.register('./service-worker.js', { scope: './' }).then(registration => {
    function offer(worker) {
      if (!worker || !navigator.serviceWorker.controller) return;
      update.classList.add('show');
      update.querySelector('button').onclick = () => worker.postMessage({ type: 'SKIP_WAITING' });
    }
    offer(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') offer(worker);
      });
    });
  }).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
})();
