(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const maxImageBytes = 12 * 1024 * 1024;
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  let workflow = 'dress';
  let models = [];
  let selectedModel = 0;
  let outfit = null;
  let layout = null;
  let product = null;

  function status(message, state = '') {
    const node = $('fashionStatus');
    if (!node) return;
    node.textContent = message;
    node.dataset.state = state;
  }
  function toast(message) {
    const node = $('toast');
    if (!node) return;
    $('toastText').textContent = message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
  }
  function mime(file) {
    if (allowedTypes.has(file.type)) return file.type;
    return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' })[(file.name.split('.').pop() || '').toLowerCase()] || '';
  }
  function validate(file) {
    if (!mime(file)) throw new Error('Use uma imagem JPG, PNG ou WebP.');
    if (file.size > maxImageBytes) throw new Error('Cada imagem pode ter no máximo 12 MB.');
    return file;
  }
  function setPreview(imageId, placeholderId, file) {
    const image = $(imageId);
    const placeholder = $(placeholderId);
    if (image.dataset.objectUrl) URL.revokeObjectURL(image.dataset.objectUrl);
    image.removeAttribute('src');
    image.hidden = true;
    if (!file) {
      placeholder.hidden = false;
      return;
    }
    const url = URL.createObjectURL(file);
    image.dataset.objectUrl = url;
    image.src = url;
    image.hidden = false;
    placeholder.hidden = true;
  }
  function currentFiles() {
    return workflow === 'dress'
      ? [models[selectedModel]?.file || null, outfit]
      : [layout, product];
  }
  function promptText() {
    const templates = window.SVS_FASHION_PROMPTS || {};
    const text = templates[workflow === 'dress' ? 'mannequin' : 'productLayout'] || '';
    const extra = $('fashionExtraPrompt')?.value.trim();
    return extra ? `${text}\n\nINSTRUÇÕES ADICIONAIS DO USUÁRIO:\n${extra}` : text;
  }
  async function copyPrompt() {
    const text = promptText();
    if (window.SVSExclusiveBridge?.copyText) {
      await window.SVSExclusiveBridge.copyText(text);
      return true;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast('Prompt copiado.');
      return true;
    } catch {
      $('fashionPromptPreview').focus();
      $('fashionPromptPreview').select();
      status('O texto ficou selecionado. Toque e segure e escolha Copiar.', 'error');
      return false;
    }
  }
  function providerUrl() {
    return $('fashionProvider').value === 'flow'
      ? 'https://labs.google/fx/tools/flow'
      : 'https://gemini.google.com/app';
  }
  function updatePrompt() {
    $('fashionPromptPreview').value = promptText();
    $('fashionDressPanel').hidden = workflow !== 'dress';
    $('fashionLayoutPanel').hidden = workflow !== 'layout';
    $('fashionDressMode').classList.toggle('active', workflow === 'dress');
    $('fashionLayoutMode').classList.toggle('active', workflow === 'layout');
    $('fashionDressMode').setAttribute('aria-selected', String(workflow === 'dress'));
    $('fashionLayoutMode').setAttribute('aria-selected', String(workflow === 'layout'));
    $('fashionBaseCaption').textContent = workflow === 'dress'
      ? `Imagem 1 · Modelo ${selectedModel + 1} selecionado`
      : 'Imagem 1 · Layout de referência';
    $('fashionReferenceCaption').textContent = workflow === 'dress'
      ? 'Imagem 2 · Roupa de referência'
      : 'Imagem 2 · Foto original do produto';
    const useFlow = $('fashionProvider').value === 'flow';
    $('fashionProjectOption').hidden = true;
    $('fashionGenerateBtn').textContent = `Copiar prompt e abrir ${useFlow ? 'Google Flow' : 'Gemini'}`;
    setPreview('fashionPreviewBase', 'fashionPreviewBasePlaceholder', workflow === 'dress' ? models[selectedModel]?.file : layout);
    setPreview('fashionPreviewReference', 'fashionPreviewReferencePlaceholder', workflow === 'dress' ? outfit : product);
  }
  function renderModels() {
    const gallery = $('fashionModelGallery');
    gallery.replaceChildren();
    if (!models.length) {
      const empty = document.createElement('div');
      empty.className = 'fashion-empty';
      empty.textContent = 'Suas imagens base aparecerão aqui. Você pode selecionar até três opções.';
      gallery.append(empty);
      selectedModel = 0;
      updatePrompt();
      return;
    }
    if (selectedModel >= models.length) selectedModel = 0;
    models.forEach((item, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `fashion-model-card${index === selectedModel ? ' selected' : ''}`;
      card.setAttribute('aria-pressed', String(index === selectedModel));
      card.title = `Usar ${item.file.name}`;
      const image = document.createElement('img');
      image.src = item.url;
      image.alt = `Prévia de ${item.file.name}`;
      const badge = document.createElement('b');
      badge.textContent = index === selectedModel ? 'SELECIONADA' : `MODELO ${index + 1}`;
      const name = document.createElement('span');
      name.textContent = item.file.name;
      card.append(image, badge, name);
      card.addEventListener('click', () => {
        selectedModel = index;
        renderModels();
      });
      gallery.append(card);
    });
    updatePrompt();
  }
  function setMode(mode) {
    workflow = mode === 'layout' ? 'layout' : 'dress';
    updatePrompt();
    status(workflow === 'dress'
      ? 'Escolha uma imagem base e a roupa de referência.'
      : 'Envie o layout e a foto original do produto.');
  }
  function setSingleFile(input, assign) {
    const file = input.files?.[0];
    if (!file) return;
    try {
      assign(validate(file));
      input.value = '';
      updatePrompt();
      status(`Imagem carregada: ${file.name}`, 'success');
    } catch (error) {
      input.value = '';
      status(error.message, 'error');
    }
  }
  async function shareReferences() {
    const files = currentFiles();
    if (files.some(file => !file)) {
      status(workflow === 'dress'
        ? 'Selecione uma imagem base e a roupa de referência.'
        : 'Selecione o layout e a foto original do produto.', 'error');
      return;
    }
    if (!navigator.share || !navigator.canShare?.({ files })) {
      status('O compartilhamento de arquivos não está disponível neste navegador. Abra Gemini ou Flow e selecione as duas imagens pela galeria.', 'error');
      return;
    }
    try {
      await navigator.share({ files, title: 'Referências do Fashion Studio', text: 'Imagem 1: base/layout. Imagem 2: roupa/produto.' });
      status('Referências compartilhadas. Agora cole o prompt copiado.', 'success');
    } catch (error) {
      if (error?.name !== 'AbortError') status(`Não consegui compartilhar: ${error.message}`, 'error');
    }
  }
  async function openProvider() {
    const files = currentFiles();
    if (files.some(file => !file)) {
      status(workflow === 'dress'
        ? 'Selecione uma imagem base e a roupa de referência antes de continuar.'
        : 'Selecione o layout e a foto do produto antes de continuar.', 'error');
      return;
    }
    await copyPrompt();
    const popup = window.open(providerUrl(), '_blank', 'noopener,noreferrer');
    if (!popup) location.href = providerUrl();
    status('Prompt copiado. Na ferramenta aberta, anexe as duas imagens na ordem mostrada e cole o texto.', 'success');
  }

  $('fashionModelFiles')?.addEventListener('change', event => {
    const files = [...event.target.files];
    if (!files.length) return;
    try {
      if (files.length > 3) throw new Error('Selecione no máximo três imagens base.');
      files.forEach(validate);
      models.forEach(model => URL.revokeObjectURL(model.url));
      models = files.map(file => ({ file, url: URL.createObjectURL(file) }));
      event.target.value = '';
      selectedModel = 0;
      renderModels();
      status(`${files.length} imagem(ns) base carregada(s). Escolha qual deseja usar.`, 'success');
    } catch (error) {
      event.target.value = '';
      models.forEach(model => URL.revokeObjectURL(model.url));
      models = [];
      renderModels();
      status(error.message, 'error');
    }
  });
  $('fashionOutfitFile')?.addEventListener('change', event => setSingleFile(event.target, file => { outfit = file; }));
  $('fashionLayoutFile')?.addEventListener('change', event => setSingleFile(event.target, file => { layout = file; }));
  $('fashionProductFile')?.addEventListener('change', event => setSingleFile(event.target, file => { product = file; }));
  $('fashionDressMode')?.addEventListener('click', () => setMode('dress'));
  $('fashionLayoutMode')?.addEventListener('click', () => setMode('layout'));
  $('fashionExtraPrompt')?.addEventListener('input', updatePrompt);
  $('fashionProvider')?.addEventListener('change', updatePrompt);
  $('fashionConnectBtn')?.addEventListener('click', shareReferences);
  $('fashionCopyPromptBtn')?.addEventListener('click', copyPrompt);
  $('fashionGenerateBtn')?.addEventListener('click', openProvider);

  const shareButton = $('fashionConnectBtn');
  if (shareButton) shareButton.textContent = 'Compartilhar imagens';
  const howTo = document.querySelector('.fashion-howto');
  if (howTo) howTo.innerHTML = '<strong>Como usar no celular</strong><ol><li>Escolha a imagem base e a referência.</li><li>Toque em “Compartilhar imagens” para enviá-las pelo menu do aparelho, ou anexe-as manualmente na ferramenta.</li><li>Toque em “Copiar prompt e abrir” e cole o texto no Gemini ou Flow.</li><li>O PWA não envia suas imagens a servidores próprios e não depende de VPS.</li></ol>';
  const notice = document.querySelector('.fashion-notice');
  if (notice) notice.textContent = 'Suas imagens permanecem no aparelho. O PWA prepara a ordem e o prompt; o envio final acontece diretamente na ferramenta oficial escolhida.';
  renderModels();
  updatePrompt();
})();
