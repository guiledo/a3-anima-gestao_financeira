const API = '/api/v1';
const MOBILE_BREAKPOINT = 768;

window.appLogs = [];

function isMobileView() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function updateMobilePageTitle(page) {
  const title = document.getElementById('mobile-page-title');
  if (!title) return;

  const labels = {
    dashboard: 'Dashboard',
    produtos: 'Produtos',
    movimentacoes: 'Movimentacoes',
    relatorios: 'Relatorios',
    historico: 'Historico e Logs',
    infraestrutura: 'Infraestrutura'
  };

  title.textContent = labels[page] || 'Gestao Financeira';
}

function setSidebarOpen(open) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const menuButton = document.getElementById('mobile-menu-btn');

  if (!sidebar || !backdrop) return;

  sidebar.classList.toggle('open', open);
  backdrop.classList.toggle('active', open);
  document.body.classList.toggle('sidebar-open', open);

  if (menuButton) {
    menuButton.setAttribute('aria-expanded', String(open));
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isOpen = sidebar?.classList.contains('open');
  setSidebarOpen(!isOpen);
}

function closeSidebar() {
  setSidebarOpen(false);
}

function syncResponsiveLayout() {
  if (!isMobileView()) closeSidebar();
}

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(node => node.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(node => node.classList.remove('active'));

  document.getElementById(`page-${page}`)?.classList.add('active');
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

  updateMobilePageTitle(page);
  if (isMobileView()) closeSidebar();

  if (page === 'dashboard') loadDashboard();
  if (page === 'produtos') loadProdutos();
  if (page === 'movimentacoes') loadMovimentacoes();
  if (page === 'historico') loadHistorico();
  if (page === 'infraestrutura') loadInfraestrutura();
}

function addAppLog(type, message) {
  const time = new Date().toLocaleTimeString('pt-BR');
  window.appLogs.unshift({ time, type, message });
  if (window.appLogs.length > 100) window.appLogs.pop();
  renderLogs();
}

window.onerror = function onWindowError(message, url, line) {
  addAppLog('error', `JS Error: ${message} na linha ${line}`);
  return false;
};

window.addEventListener('unhandledrejection', event => {
  addAppLog('error', `Promessa rejeitada: ${event.reason}`);
});

function showToast(message, type = 'info') {
  if (type === 'error') addAppLog('error', message);
  if (type === 'success') addAppLog('info', message);

  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: 'OK', error: 'ERRO', info: 'INFO' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'INFO'}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function openModal(title, bodyHTML, footerHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-footer').innerHTML = footerHTML;
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('modal-overlay').classList.remove('active');
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch (ignored) {
      errorBody = null;
    }

    const detail = errorBody?.detail || errorBody?.title || `Erro ${response.status}`;
    throw new Error(detail);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function apiGet(path) {
  return apiRequest(path);
}

async function apiPost(path, data) {
  return apiRequest(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

async function apiPut(path, data) {
  return apiRequest(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

async function apiDelete(path) {
  return apiRequest(path, { method: 'DELETE' });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatTipoPagamento(tipoPagamento) {
  if (tipoPagamento === 'PARCELADO') return 'Parcelado';
  if (tipoPagamento === 'AVISTA') return 'A vista';
  return '-';
}

function formatParcelas(quantidadeParcelas) {
  const parcelas = Number(quantidadeParcelas) || 1;
  return `${parcelas}x`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function buildAbsoluteUrl(path = '') {
  const origin = window.location.origin.replace(/\/$/, '');
  if (!path || path === '/') return `${origin}/`;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildEmptyState(title, subtitle = '', icon = '!') {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-text">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="empty-state-sub">${escapeHtml(subtitle)}</div>` : ''}
    </div>
  `;
}

async function loadDashboard() {
  const grid = document.getElementById('kpi-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Carregando resumo...</div>';

  try {
    const data = await apiGet('/dashboard/resumo');
    const saldo = data.saldoAtual || 0;
    const saldoColor = saldo >= 0 ? 'emerald' : 'red';
    const saldoClass = saldo >= 0 ? 'text-success' : 'text-danger';

    grid.innerHTML = `
      <div class="kpi-card" data-color="emerald">
        <div class="kpi-label">Total entradas</div>
        <div class="kpi-value text-success">${formatCurrency(data.totalEntradas)}</div>
      </div>
      <div class="kpi-card" data-color="red">
        <div class="kpi-label">Total saidas</div>
        <div class="kpi-value text-danger">${formatCurrency(data.totalSaidas)}</div>
      </div>
      <div class="kpi-card" data-color="${saldoColor}">
        <div class="kpi-label">Saldo atual</div>
        <div class="kpi-value ${saldoClass}">${formatCurrency(saldo)}</div>
      </div>
      <div class="kpi-card" data-color="indigo">
        <div class="kpi-label">Produtos ativos</div>
        <div class="kpi-value">${data.totalProdutosAtivos ?? 0}</div>
      </div>
      <div class="kpi-card" data-color="cyan">
        <div class="kpi-label">Itens em estoque</div>
        <div class="kpi-value">${(data.totalItensEmEstoque ?? 0).toLocaleString('pt-BR')}</div>
      </div>
      <div class="kpi-card" data-color="violet">
        <div class="kpi-label">Valor do estoque</div>
        <div class="kpi-value">${formatCurrency(data.valorTotalEstoque)}</div>
      </div>
      <div class="kpi-card" data-color="amber">
        <div class="kpi-label">Movimentacoes</div>
        <div class="kpi-value">${(data.totalMovimentacoes ?? 0).toLocaleString('pt-BR')}</div>
      </div>
    `;
  } catch (err) {
    grid.innerHTML = buildEmptyState('Erro ao carregar dashboard', err.message);
    showToast(`Erro ao carregar dashboard: ${err.message}`, 'error');
  }
}

async function loadProdutos() {
  const tbody = document.getElementById('produtos-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="8"><div class="loading-overlay"><div class="spinner"></div> Carregando...</div></td></tr>';

  try {
    const produtos = await apiGet('/produtos');
    document.getElementById('produtos-count').textContent = `${produtos.length} itens`;

    if (produtos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8">${buildEmptyState('Nenhum produto cadastrado', 'Clique em "Novo Produto" para comecar', '[]')}</td></tr>`;
      return;
    }

    tbody.innerHTML = produtos.map(produto => `
      <tr>
        <td><span class="badge badge-neutral">#${produto.id}</span></td>
        <td class="td-name">${escapeHtml(produto.nome)}</td>
        <td>${escapeHtml(produto.categoria)}</td>
        <td>${formatCurrency(produto.custo)}</td>
        <td><strong>${formatCurrency(produto.preco)}</strong></td>
        <td>${produto.estoque}</td>
        <td>${produto.ativo
          ? '<span class="badge badge-success">ATIVO</span>'
          : '<span class="badge badge-danger">INATIVO</span>'}</td>
        <td class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="openProdutoModal(${produto.id})">Editar</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteProduto(${produto.id})">Excluir</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8">${buildEmptyState('Falha ao carregar produtos', err.message)}</td></tr>`;
    showToast(`Erro ao carregar produtos: ${err.message}`, 'error');
  }
}

function openProdutoModal(id) {
  const isEdit = Boolean(id);

  const body = `
    <input type="hidden" id="prod-id" value="${id || ''}">
    <div class="form-group">
      <label class="form-label">Nome</label>
      <input type="text" id="prod-nome" class="form-input" placeholder="Ex: Caneta Azul" maxlength="120">
    </div>
    <div class="form-group">
      <label class="form-label">Categoria</label>
      <input type="text" id="prod-categoria" class="form-input" placeholder="Ex: Material Escolar" maxlength="80">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Custo (R$)</label>
        <input type="number" id="prod-custo" class="form-input" step="0.01" min="0" placeholder="0.00">
      </div>
      <div class="form-group">
        <label class="form-label">Preco (R$)</label>
        <input type="number" id="prod-preco" class="form-input" step="0.01" min="0" placeholder="0.00">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Estoque</label>
        <input type="number" id="prod-estoque" class="form-input" min="0" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label">Ativo</label>
        <select id="prod-ativo" class="form-select">
          <option value="true">Sim</option>
          <option value="false">Nao</option>
        </select>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-success" onclick="saveProduto()">${isEdit ? 'Atualizar' : 'Criar'}</button>
  `;

  openModal(isEdit ? 'Editar Produto' : 'Novo Produto', body, footer);

  if (isEdit) {
    apiGet(`/produtos/${id}`)
      .then(produto => {
        document.getElementById('prod-nome').value = produto.nome;
        document.getElementById('prod-categoria').value = produto.categoria;
        document.getElementById('prod-custo').value = produto.custo;
        document.getElementById('prod-preco').value = produto.preco;
        document.getElementById('prod-estoque').value = produto.estoque;
        document.getElementById('prod-ativo').value = String(produto.ativo);
      })
      .catch(err => showToast(`Erro ao carregar produto: ${err.message}`, 'error'));
  }
}

async function saveProduto() {
  const id = document.getElementById('prod-id').value;
  const data = {
    nome: document.getElementById('prod-nome').value.trim(),
    categoria: document.getElementById('prod-categoria').value.trim(),
    custo: parseFloat(document.getElementById('prod-custo').value) || 0,
    preco: parseFloat(document.getElementById('prod-preco').value) || 0,
    estoque: parseInt(document.getElementById('prod-estoque').value, 10) || 0,
    ativo: document.getElementById('prod-ativo').value === 'true'
  };

  if (!data.nome || !data.categoria) {
    showToast('Preencha nome e categoria', 'error');
    return;
  }

  try {
    if (id) {
      await apiPut(`/produtos/${id}`, data);
      showToast('Produto atualizado com sucesso', 'success');
    } else {
      await apiPost('/produtos', data);
      showToast('Produto criado com sucesso', 'success');
    }

    closeModal();
    loadProdutos();
    loadDashboard();
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
  }
}

async function deleteProduto(id) {
  if (!confirm('Tem certeza que deseja excluir este produto?')) return;

  try {
    await apiDelete(`/produtos/${id}`);
    showToast('Produto excluido', 'success');
    loadProdutos();
    loadDashboard();
  } catch (err) {
    showToast(`Erro ao excluir: ${err.message}`, 'error');
  }
}
async function loadMovimentacoes() {
  const tbody = document.getElementById('movimentacoes-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="11"><div class="loading-overlay"><div class="spinner"></div> Carregando...</div></td></tr>';

  try {
    const movimentacoes = await apiGet('/movimentacoes');
    document.getElementById('movimentacoes-count').textContent = `${movimentacoes.length} itens`;

    if (movimentacoes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11">${buildEmptyState('Nenhuma movimentacao registrada', 'Clique em "Nova Movimentacao" para comecar', '$')}</td></tr>`;
      return;
    }

    const grupos = movimentacoes
      .slice()
      .sort((a, b) => {
        const clienteA = (a.cliente || '').localeCompare(b.cliente || '', 'pt-BR', { sensitivity: 'base' });
        if (clienteA !== 0) return clienteA;
        return (b.id || 0) - (a.id || 0);
      })
      .reduce((acc, movimentacao) => {
        const cliente = movimentacao.cliente || 'Sem cliente';
        if (!acc[cliente]) acc[cliente] = [];
        acc[cliente].push(movimentacao);
        return acc;
      }, {});

    tbody.innerHTML = Object.entries(grupos).map(([cliente, itens]) => `
      <tr class="client-group-row">
        <td colspan="11">
          <div class="client-group-label">
            <span>${escapeHtml(cliente)}</span>
            <span>${itens.length} lancamento(s)</span>
          </div>
        </td>
      </tr>
      ${itens.map(movimentacao => `
        <tr>
          <td><span class="badge badge-neutral">#${movimentacao.id}</span></td>
          <td class="td-name">${escapeHtml(movimentacao.cliente)}</td>
          <td>${movimentacao.tipo === 'ENTRADA'
            ? '<span class="badge badge-success">ENTRADA</span>'
            : '<span class="badge badge-danger">SAIDA</span>'}</td>
          <td class="td-name">${escapeHtml(movimentacao.descricao)}</td>
          <td>${escapeHtml(movimentacao.categoria)}</td>
          <td>${escapeHtml(formatTipoPagamento(movimentacao.tipoPagamento))}</td>
          <td>${escapeHtml(formatParcelas(movimentacao.quantidadeParcelas))}</td>
          <td>${formatDate(movimentacao.dataPrimeiroVencimento)}</td>
          <td><strong class="${movimentacao.tipo === 'ENTRADA' ? 'text-success' : 'text-danger'}">${formatCurrency(movimentacao.valor)}</strong></td>
          <td>${formatDate(movimentacao.data)}</td>
          <td class="td-actions">
            <button class="btn btn-ghost btn-sm" onclick="openMovimentacaoModal(${movimentacao.id})">Editar</button>
            <button class="btn btn-ghost btn-sm" onclick="deleteMovimentacao(${movimentacao.id})">Excluir</button>
          </td>
        </tr>
      `).join('')}
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="11">${buildEmptyState('Falha ao carregar movimentacoes', err.message)}</td></tr>`;
    showToast(`Erro ao carregar movimentacoes: ${err.message}`, 'error');
  }
}

function openMovimentacaoModal(id) {
  const isEdit = Boolean(id);
  const today = new Date().toISOString().split('T')[0];

  const body = `
    <input type="hidden" id="mov-id" value="${id || ''}">
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select id="mov-tipo" class="form-select">
          <option value="ENTRADA">Entrada</option>
          <option value="SAIDA">Saida</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Cliente</label>
        <input type="text" id="mov-cliente" class="form-input" placeholder="Ex: Cliente XPTO" maxlength="120">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descricao</label>
      <input type="text" id="mov-descricao" class="form-input" placeholder="Ex: Venda do dia" maxlength="160">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Valor (R$)</label>
        <input type="number" id="mov-valor" class="form-input" step="0.01" min="0" placeholder="0.00">
      </div>
      <div class="form-group">
        <label class="form-label">Data</label>
        <input type="date" id="mov-data" class="form-input" value="${today}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Categoria</label>
      <input type="text" id="mov-categoria" class="form-input" placeholder="Ex: Vendas" maxlength="80">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo de pagamento</label>
        <select id="mov-tipo-pagamento" class="form-select" onchange="syncMovimentacaoPagamentoFields()">
          <option value="AVISTA">A vista</option>
          <option value="PARCELADO">Parcelado</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Parcelas</label>
        <input type="number" id="mov-quantidade-parcelas" class="form-input" min="1" max="360" value="1">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Data do primeiro vencimento</label>
      <input type="date" id="mov-primeiro-vencimento" class="form-input" value="${today}">
    </div>
  `;

  const footer = `
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-success" onclick="saveMovimentacao()">${isEdit ? 'Atualizar' : 'Criar'}</button>
  `;

  openModal(isEdit ? 'Editar Movimentacao' : 'Nova Movimentacao', body, footer);
  syncMovimentacaoPagamentoFields();

  if (isEdit) {
    apiGet(`/movimentacoes/${id}`)
      .then(movimentacao => {
        document.getElementById('mov-tipo').value = movimentacao.tipo;
        document.getElementById('mov-cliente').value = movimentacao.cliente;
        document.getElementById('mov-descricao').value = movimentacao.descricao;
        document.getElementById('mov-valor').value = movimentacao.valor;
        document.getElementById('mov-data').value = movimentacao.data;
        document.getElementById('mov-categoria').value = movimentacao.categoria;
        document.getElementById('mov-tipo-pagamento').value = movimentacao.tipoPagamento;
        document.getElementById('mov-quantidade-parcelas').value = movimentacao.quantidadeParcelas;
        document.getElementById('mov-primeiro-vencimento').value = movimentacao.dataPrimeiroVencimento;
        syncMovimentacaoPagamentoFields();
      })
      .catch(err => showToast(`Erro ao carregar movimentacao: ${err.message}`, 'error'));
  }
}

function syncMovimentacaoPagamentoFields() {
  const tipoPagamento = document.getElementById('mov-tipo-pagamento');
  const quantidadeParcelas = document.getElementById('mov-quantidade-parcelas');
  if (!tipoPagamento || !quantidadeParcelas) return;

  if (tipoPagamento.value === 'AVISTA') {
    quantidadeParcelas.value = '1';
    quantidadeParcelas.disabled = true;
    quantidadeParcelas.min = '1';
    return;
  }

  quantidadeParcelas.disabled = false;
  quantidadeParcelas.min = '2';
  if ((parseInt(quantidadeParcelas.value, 10) || 0) < 2) {
    quantidadeParcelas.value = '2';
  }
}

async function saveMovimentacao() {
  const id = document.getElementById('mov-id').value;
  const data = {
    tipo: document.getElementById('mov-tipo').value,
    cliente: document.getElementById('mov-cliente').value.trim(),
    descricao: document.getElementById('mov-descricao').value.trim(),
    valor: parseFloat(document.getElementById('mov-valor').value) || 0,
    data: document.getElementById('mov-data').value,
    categoria: document.getElementById('mov-categoria').value.trim(),
    tipoPagamento: document.getElementById('mov-tipo-pagamento').value,
    quantidadeParcelas: parseInt(document.getElementById('mov-quantidade-parcelas').value, 10) || 1,
    dataPrimeiroVencimento: document.getElementById('mov-primeiro-vencimento').value
  };

  if (data.tipoPagamento === 'AVISTA') {
    data.quantidadeParcelas = 1;
  }

  if (!data.cliente || !data.descricao || !data.categoria || !data.data || !data.dataPrimeiroVencimento) {
    showToast('Preencha todos os campos obrigatorios', 'error');
    return;
  }

  if (data.tipoPagamento === 'PARCELADO' && data.quantidadeParcelas < 2) {
    showToast('Pagamento parcelado precisa de pelo menos 2 parcelas', 'error');
    return;
  }

  try {
    if (id) {
      await apiPut(`/movimentacoes/${id}`, data);
      showToast('Movimentacao atualizada', 'success');
    } else {
      await apiPost('/movimentacoes', data);
      showToast('Movimentacao criada', 'success');
    }

    closeModal();
    loadMovimentacoes();
    loadDashboard();
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
  }
}

async function deleteMovimentacao(id) {
  if (!confirm('Tem certeza que deseja excluir esta movimentacao?')) return;

  try {
    await apiDelete(`/movimentacoes/${id}`);
    showToast('Movimentacao excluida', 'success');
    loadMovimentacoes();
    loadDashboard();
  } catch (err) {
    showToast(`Erro ao excluir: ${err.message}`, 'error');
  }
}

function renderCategoriaTable(title, categorias, colorClass) {
  if (!categorias || categorias.length === 0) return '';

  return `
    <div class="card mt-4">
      <div class="card-header">
        <span class="card-title">${escapeHtml(title)}</span>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Quantidade</th>
              <th>Valor total</th>
            </tr>
          </thead>
          <tbody>
            ${categorias.map(item => `
              <tr>
                <td class="td-name">${escapeHtml(item.categoria)}</td>
                <td>${item.quantidade}</td>
                <td><strong class="text-${colorClass}">${formatCurrency(item.valorTotal)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderFechamentoPorCliente(fechamentoPorCliente) {
  if (!fechamentoPorCliente || fechamentoPorCliente.length === 0) {
    return `
      <div class="card mt-4">
        <div class="card-body">
          ${buildEmptyState('Nenhum cliente com parcelas no periodo selecionado.', 'Cadastre movimentacoes com cliente e vencimento para acompanhar o fechamento mensal.')}
        </div>
      </div>
    `;
  }

  return `
    <div class="card mt-4">
      <div class="card-header">
        <span class="card-title">Fechamento por cliente</span>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Movimentado</th>
              <th>Devido no periodo</th>
              <th>Qtd. lancamentos</th>
              <th>Proximo vencimento</th>
            </tr>
          </thead>
          <tbody>
            ${fechamentoPorCliente.map(cliente => `
              <tr>
                <td class="td-name">${escapeHtml(cliente.cliente)}</td>
                <td>${formatCurrency(cliente.valorTotalMovimentado)}</td>
                <td><strong class="text-success">${formatCurrency(cliente.valorDevidoNoPeriodo)}</strong></td>
                <td>${cliente.quantidadeMovimentacoes}</td>
                <td>${formatDate(cliente.proximoVencimento)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="report-client-grid">
      ${fechamentoPorCliente.map(cliente => `
        <div class="card report-client-card">
          <div class="card-header">
            <span class="card-title">${escapeHtml(cliente.cliente)}</span>
            <span class="badge badge-success">${formatCurrency(cliente.valorDevidoNoPeriodo)}</span>
          </div>
          <div class="card-body">
            <div class="report-client-meta">
              <div class="report-client-metric">
                <span>Total movimentado</span>
                <strong>${formatCurrency(cliente.valorTotalMovimentado)}</strong>
              </div>
              <div class="report-client-metric">
                <span>Lancamentos no periodo</span>
                <strong>${cliente.quantidadeMovimentacoes}</strong>
              </div>
              <div class="report-client-metric">
                <span>Primeiro vencimento</span>
                <strong>${formatDate(cliente.proximoVencimento)}</strong>
              </div>
            </div>

            <div class="report-client-section">
              <h3>Quanto deve por mes</h3>
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th>Valor devido</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${cliente.debitosMensais.map(item => `
                      <tr>
                        <td>${escapeHtml(item.competencia)}</td>
                        <td><strong>${formatCurrency(item.valorDevido)}</strong></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="report-client-section">
              <h3>Movimentacoes do cliente</h3>
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Descricao</th>
                      <th>Categoria</th>
                      <th>Valor</th>
                      <th>Data</th>
                      <th>Pagamento</th>
                      <th>Parcelas</th>
                      <th>1o vencimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${cliente.movimentacoes.map(item => `
                      <tr>
                        <td class="td-name">${escapeHtml(item.descricao)}</td>
                        <td>${escapeHtml(item.categoria)}</td>
                        <td>${formatCurrency(item.valor)}</td>
                        <td>${formatDate(item.data)}</td>
                        <td>${escapeHtml(formatTipoPagamento(item.tipoPagamento))}</td>
                        <td>${escapeHtml(formatParcelas(item.quantidadeParcelas))}</td>
                        <td>${formatDate(item.dataPrimeiroVencimento)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function loadRelatorioFinanceiro() {
  const inicio = document.getElementById('rel-data-inicio').value;
  const fim = document.getElementById('rel-data-fim').value;
  const container = document.getElementById('relatorio-financeiro-content');

  if (!inicio || !fim) {
    showToast('Selecione as datas de inicio e fim', 'error');
    return;
  }

  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Gerando relatorio...</div>';

  try {
    const relatorio = await apiGet(`/relatorios/financeiro?dataInicio=${inicio}&dataFim=${fim}`);

    container.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card" data-color="emerald">
          <div class="kpi-label">Entradas no periodo</div>
          <div class="kpi-value text-success">${formatCurrency(relatorio.totalEntradas)}</div>
        </div>
        <div class="kpi-card" data-color="red">
          <div class="kpi-label">Saidas no periodo</div>
          <div class="kpi-value text-danger">${formatCurrency(relatorio.totalSaidas)}</div>
        </div>
        <div class="kpi-card" data-color="${relatorio.saldoPeriodo >= 0 ? 'emerald' : 'red'}">
          <div class="kpi-label">Saldo do periodo</div>
          <div class="kpi-value ${relatorio.saldoPeriodo >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(relatorio.saldoPeriodo)}</div>
        </div>
        <div class="kpi-card" data-color="amber">
          <div class="kpi-label">Numero de movimentacoes</div>
          <div class="kpi-value">${relatorio.quantidadeMovimentacoes}</div>
        </div>
        <div class="kpi-card" data-color="cyan">
          <div class="kpi-label">Media diaria de entradas</div>
          <div class="kpi-value">${formatCurrency(relatorio.mediaDiariaEntradas)}</div>
        </div>
        <div class="kpi-card" data-color="violet">
          <div class="kpi-label">Media diaria de saidas</div>
          <div class="kpi-value">${formatCurrency(relatorio.mediaDiariaSaidas)}</div>
        </div>
        <div class="kpi-card" data-color="indigo">
          <div class="kpi-label">Clientes com debitos</div>
          <div class="kpi-value">${relatorio.totalClientesComDebitos || 0}</div>
        </div>
        <div class="kpi-card" data-color="emerald">
          <div class="kpi-label">Total devido por cliente</div>
          <div class="kpi-value text-success">${formatCurrency(relatorio.totalDevidoPorClientesNoPeriodo)}</div>
        </div>
      </div>

      ${renderCategoriaTable('Entradas por categoria', relatorio.entradasPorCategoria, 'success')}
      ${renderCategoriaTable('Saidas por categoria', relatorio.saidasPorCategoria, 'danger')}
      ${renderFechamentoPorCliente(relatorio.fechamentoPorCliente)}
    `;

    showToast('Relatorio financeiro gerado', 'success');
  } catch (err) {
    container.innerHTML = buildEmptyState('Falha ao gerar relatorio', err.message);
    showToast(`Erro: ${err.message}`, 'error');
  }
}

async function loadRelatorioProdutos() {
  const container = document.getElementById('relatorio-produtos-content');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Gerando relatorio...</div>';

  try {
    const relatorio = await apiGet('/relatorios/produtos');

    container.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card" data-color="indigo">
          <div class="kpi-label">Total produtos</div>
          <div class="kpi-value">${relatorio.totalProdutos}</div>
        </div>
        <div class="kpi-card" data-color="emerald">
          <div class="kpi-label">Ativos</div>
          <div class="kpi-value text-success">${relatorio.totalProdutosAtivos}</div>
        </div>
        <div class="kpi-card" data-color="red">
          <div class="kpi-label">Inativos</div>
          <div class="kpi-value text-danger">${relatorio.totalProdutosInativos}</div>
        </div>
        <div class="kpi-card" data-color="cyan">
          <div class="kpi-label">Itens em estoque</div>
          <div class="kpi-value">${(relatorio.totalItensEmEstoque || 0).toLocaleString('pt-BR')}</div>
        </div>
        <div class="kpi-card" data-color="amber">
          <div class="kpi-label">Valor estoque (custo)</div>
          <div class="kpi-value">${formatCurrency(relatorio.valorTotalEstoqueCusto)}</div>
        </div>
        <div class="kpi-card" data-color="violet">
          <div class="kpi-label">Valor estoque (venda)</div>
          <div class="kpi-value">${formatCurrency(relatorio.valorTotalEstoqueVenda)}</div>
        </div>
        <div class="kpi-card" data-color="emerald">
          <div class="kpi-label">Margem bruta</div>
          <div class="kpi-value text-success">${formatCurrency(relatorio.margemBrutaEstoque)}</div>
        </div>
      </div>

      ${relatorio.porCategoria && relatorio.porCategoria.length > 0 ? `
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--text-secondary)">Por categoria</h3>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Produtos</th>
                <th>Itens</th>
                <th>Valor custo</th>
                <th>Valor venda</th>
              </tr>
            </thead>
            <tbody>
              ${relatorio.porCategoria.map(item => `
                <tr>
                  <td class="td-name">${escapeHtml(item.categoria)}</td>
                  <td>${item.quantidadeProdutos}</td>
                  <td>${(item.quantidadeItensEstoque || 0).toLocaleString('pt-BR')}</td>
                  <td>${formatCurrency(item.valorEstoqueCusto)}</td>
                  <td><strong>${formatCurrency(item.valorEstoqueVenda)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : buildEmptyState('Sem categorias para exibir')}
    `;

    showToast('Relatorio de produtos gerado', 'success');
  } catch (err) {
    container.innerHTML = buildEmptyState('Falha ao gerar relatorio', err.message);
    showToast(`Erro: ${err.message}`, 'error');
  }
}
function switchHistoricoTab(tabId) {
  document.getElementById('view-timeline').style.display = tabId === 'timeline' ? 'block' : 'none';
  document.getElementById('view-logs').style.display = tabId === 'logs' ? 'block' : 'none';
  document.getElementById('btn-tab-timeline').className = tabId === 'timeline' ? 'btn btn-primary' : 'btn btn-ghost';
  document.getElementById('btn-tab-logs').className = tabId === 'logs' ? 'btn btn-primary' : 'btn btn-ghost';
}

function clearLogs() {
  window.appLogs = [];
  renderLogs();
  showToast('Logs limpos com sucesso', 'success');
}

function clearTimeline() {
  const timeline = document.getElementById('historico-timeline');
  if (!timeline) return;

  timeline.innerHTML = buildEmptyState(
    'A linha do tempo foi limpa apenas na interface.',
    'Clique em "Atualizar" para recarregar as movimentacoes do banco.',
    'X'
  );

  showToast('Linha do tempo limpa da interface', 'info');
}

function renderLogs() {
  const consoleEl = document.getElementById('log-console');
  if (!consoleEl) return;

  if (window.appLogs.length === 0) {
    consoleEl.innerHTML = '<div class="log-entry info"><span class="log-time">--:--:--</span> Nenhum log registrado ate o momento.</div>';
    return;
  }

  consoleEl.innerHTML = window.appLogs.map(log => `
    <div class="log-entry ${escapeHtml(log.type)}">
      <span class="log-time">[${escapeHtml(log.time)}]</span> ${escapeHtml(log.message)}
    </div>
  `).join('');
}

async function loadHistorico() {
  const timeline = document.getElementById('historico-timeline');
  if (!timeline) return;

  timeline.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Carregando historico...</div>';
  renderLogs();

  try {
    const movimentacoes = await apiGet('/movimentacoes');
    movimentacoes.sort((a, b) => b.id - a.id);

    if (movimentacoes.length === 0) {
      timeline.innerHTML = buildEmptyState('Nenhum evento registrado no historico.', '', '[]');
      return;
    }

    timeline.innerHTML = movimentacoes.map(item => {
      const isEntrada = item.tipo === 'ENTRADA';

      return `
        <div class="timeline-item">
          <div class="timeline-icon ${isEntrada ? 'entrada' : 'saida'}">${isEntrada ? '+' : '-'}</div>
          <div class="timeline-content">
            <div class="timeline-date">${formatDate(item.data)} - Movimentacao #${item.id}</div>
            <div class="timeline-title">${escapeHtml(item.descricao)}</div>
            <div class="timeline-details">
              Cliente: <strong>${escapeHtml(item.cliente || 'Sem cliente')}</strong>
              &bull;
              Categoria: <strong>${escapeHtml(item.categoria)}</strong>
              &bull;
              Pagamento: <strong>${escapeHtml(formatTipoPagamento(item.tipoPagamento))} ${escapeHtml(formatParcelas(item.quantidadeParcelas))}</strong>
              &bull;
              Valor: <strong class="${isEntrada ? 'text-success' : 'text-danger'}">${formatCurrency(item.valor)}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');

    addAppLog('info', 'Historico e timeline atualizados com sucesso.');
  } catch (err) {
    timeline.innerHTML = buildEmptyState('Falha ao carregar linha do tempo', err.message);
    showToast(`Erro ao carregar historico: ${err.message}`, 'error');
  }
}

async function fetchStatus(path) {
  try {
    const response = await fetch(path);
    return { ok: response.ok, status: response.status };
  } catch (err) {
    return { ok: false, status: 'offline' };
  }
}

function renderInfraTechs(stack) {
  return stack.map(item => `
    <span class="server-tech-chip">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.version)}</span>
    </span>
  `).join('');
}

function renderInfraEndpoints(endpoints) {
  return endpoints.map(endpoint => {
    const path = endpoint.path || '';
    const browsable = path.startsWith('/') && !path.includes('{') && !path.includes('AAAA-MM-DD');
    const pathHtml = browsable
      ? `<a href="${buildAbsoluteUrl(path)}" target="_blank" rel="noreferrer">${escapeHtml(path)}</a>`
      : `<code>${escapeHtml(path)}</code>`;

    return `
      <div class="server-endpoint-row">
        <span class="badge badge-info">${escapeHtml(endpoint.method)}</span>
        <div>
          <div class="server-endpoint-label">${escapeHtml(endpoint.label)}</div>
          <div class="server-endpoint-path">${pathHtml}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderWarningList(warnings) {
  if (!warnings.length) {
    return buildEmptyState('Nenhum alerta dinamico retornado.');
  }

  return `
    <div class="server-warning-list">
      ${warnings.map(warning => `
        <div class="server-warning-item">
          <span class="badge badge-warning">ALERTA</span>
          <p>${escapeHtml(warning)}</p>
        </div>
      `).join('')}
    </div>
  `;
}

async function loadInfraestrutura() {
  const container = document.getElementById('infraestrutura-content');
  if (!container) return;

  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Carregando infraestrutura...</div>';

  try {
    const [infra, health, dashboard, openApiStatus, swaggerStatus] = await Promise.all([
      apiGet('/infra/stack'),
      apiGet('/health').catch(() => null),
      apiGet('/dashboard/resumo').catch(() => null),
      fetchStatus('/v3/api-docs'),
      fetchStatus('/swagger-ui/index.html')
    ]);

    const frontendUrl = buildAbsoluteUrl('/');
    const apiBaseUrl = buildAbsoluteUrl(infra.access.apiBasePath);
    const healthUrl = buildAbsoluteUrl('/api/v1/health');
    const produtosUrl = buildAbsoluteUrl('/api/v1/produtos');
    const h2Url = infra.database.consoleEnabled ? buildAbsoluteUrl(infra.database.consolePath) : '';
    const sshCommand = `ssh -i <sua-chave> ubuntu@${window.location.hostname} -p ${infra.access.sshPort}`;
    const docsStatus = (openApiStatus.ok || swaggerStatus.ok)
      ? `Docs online (${openApiStatus.status}/${swaggerStatus.status})`
      : `Docs indisponiveis (${openApiStatus.status}/${swaggerStatus.status})`;

    container.innerHTML = `
      <section class="card server-hero">
        <div class="server-hero-copy">
          <span class="badge badge-info">Infra live</span>
          <h2 class="server-hero-title">${escapeHtml(infra.application.displayName)}</h2>
          <p class="server-hero-text">
            Aplicacao publicada como ${escapeHtml(infra.application.packaging)} em
            <code>${escapeHtml(infra.runtime.operatingSystem)}</code>, acessivel em
            <code>${escapeHtml(frontendUrl)}</code>.
          </p>
          <div class="server-badge-row">
            <span class="badge ${health?.api === 'ONLINE' ? 'badge-success' : 'badge-danger'}">API ${escapeHtml(health?.api || 'OFFLINE')}</span>
            <span class="badge ${health?.database === 'ONLINE' ? 'badge-success' : 'badge-warning'}">Banco ${escapeHtml(health?.database || 'DESCONHECIDO')}</span>
            <span class="badge badge-neutral">${escapeHtml(docsStatus)}</span>
            <span class="badge badge-neutral">HTTP ${escapeHtml(String(infra.access.httpPort))}</span>
          </div>
        </div>
        <div class="server-action-row">
          <a class="btn btn-primary" href="${frontendUrl}" target="_blank" rel="noreferrer">Abrir site</a>
          <a class="btn btn-ghost" href="${healthUrl}" target="_blank" rel="noreferrer">Health JSON</a>
          <a class="btn btn-ghost" href="${produtosUrl}" target="_blank" rel="noreferrer">Produtos JSON</a>
          ${h2Url ? `<a class="btn btn-ghost" href="${h2Url}" target="_blank" rel="noreferrer">H2 Console</a>` : ''}
        </div>
      </section>

      ${dashboard ? `
        <div class="kpi-grid server-kpi-grid">
          <div class="kpi-card" data-color="emerald">
            <div class="kpi-label">Saldo atual</div>
            <div class="kpi-value text-success">${formatCurrency(dashboard.saldoAtual)}</div>
          </div>
          <div class="kpi-card" data-color="indigo">
            <div class="kpi-label">Produtos ativos</div>
            <div class="kpi-value">${dashboard.totalProdutosAtivos}</div>
          </div>
          <div class="kpi-card" data-color="cyan">
            <div class="kpi-label">Itens em estoque</div>
            <div class="kpi-value">${(dashboard.totalItensEmEstoque || 0).toLocaleString('pt-BR')}</div>
          </div>
          <div class="kpi-card" data-color="amber">
            <div class="kpi-label">Movimentacoes</div>
            <div class="kpi-value">${(dashboard.totalMovimentacoes || 0).toLocaleString('pt-BR')}</div>
          </div>
        </div>
      ` : ''}

      <div class="server-grid">
        <section class="card server-panel">
          <div class="card-header">
            <span class="card-title">Como conectar</span>
          </div>
          <div class="card-body">
            <div class="server-code-block">
              <span>Frontend</span>
              <code>${escapeHtml(frontendUrl)}</code>
            </div>
            <div class="server-code-block">
              <span>API base</span>
              <code>${escapeHtml(apiBaseUrl)}</code>
            </div>
            <div class="server-code-block">
              <span>SSH</span>
              <code>${escapeHtml(sshCommand)}</code>
            </div>
            <div class="server-code-block">
              <span>Exemplo curl</span>
              <code>${escapeHtml(`curl ${healthUrl}`)}</code>
            </div>
          </div>
        </section>

        <section class="card server-panel">
          <div class="card-header">
            <span class="card-title">Banco de dados</span>
          </div>
          <div class="card-body">
            <div class="server-info-pair"><span>Engine</span><strong>${escapeHtml(infra.database.engine)}</strong></div>
            <div class="server-info-pair"><span>Modo</span><strong>${escapeHtml(infra.database.mode)}</strong></div>
            <div class="server-info-pair"><span>Usuario</span><strong>${escapeHtml(infra.database.username || 'nao informado')}</strong></div>
            <div class="server-code-block">
              <span>JDBC URL</span>
              <code>${escapeHtml(infra.database.url)}</code>
            </div>
            ${infra.database.consoleEnabled ? `
              <div class="server-code-block">
                <span>Console</span>
                <code>${escapeHtml(h2Url)}</code>
              </div>
            ` : ''}
          </div>
        </section>

        <section class="card server-panel">
          <div class="card-header">
            <span class="card-title">Runtime do servidor</span>
          </div>
          <div class="card-body">
            <div class="server-info-pair"><span>Sistema</span><strong>${escapeHtml(infra.runtime.operatingSystem)}</strong></div>
            <div class="server-info-pair"><span>Arquitetura</span><strong>${escapeHtml(infra.runtime.architecture)}</strong></div>
            <div class="server-info-pair"><span>Java</span><strong>${escapeHtml(infra.runtime.javaVersion)}</strong></div>
            <div class="server-info-pair"><span>Runtime</span><strong>${escapeHtml(infra.runtime.javaRuntime)}</strong></div>
            <div class="server-info-pair"><span>JVM</span><strong>${escapeHtml(infra.runtime.javaVm)}</strong></div>
          </div>
        </section>

        <section class="card server-panel">
          <div class="card-header">
            <span class="card-title">Tecnologias envolvidas</span>
          </div>
          <div class="card-body">
            <div class="server-tech-grid">
              ${renderInfraTechs(infra.stack || [])}
            </div>
          </div>
        </section>

        <section class="card server-panel server-panel-wide">
          <div class="card-header">
            <span class="card-title">APIs e acessos publicados</span>
          </div>
          <div class="card-body">
            <div class="server-endpoint-list">
              ${renderInfraEndpoints(infra.endpoints || [])}
            </div>
          </div>
        </section>

        <section class="card server-panel server-panel-wide">
          <div class="card-header">
            <span class="card-title">Riscos e observacoes</span>
          </div>
          <div class="card-body">
            ${renderWarningList(infra.warnings || [])}
          </div>
        </section>
      </div>
    `;
  } catch (err) {
    container.innerHTML = buildEmptyState('Falha ao carregar infraestrutura', err.message);
    showToast(`Erro ao carregar infraestrutura: ${err.message}`, 'error');
  }
}

function setDefaultDates() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  document.getElementById('rel-data-inicio').value = firstDay.toISOString().split('T')[0];
  document.getElementById('rel-data-fim').value = today.toISOString().split('T')[0];
}

async function checkSystemHealth() {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const wrapper = document.getElementById('status-indicator');

  if (!dot || !text || !wrapper) return;

  dot.textContent = '...';
  text.textContent = 'Verificando...';
  text.style.color = 'var(--text-primary)';
  wrapper.style.background = 'rgba(255,255,255,0.05)';

  try {
    const status = await apiGet('/health');

    if (status.api === 'ONLINE' && status.database === 'ONLINE') {
      dot.textContent = 'OK';
      text.textContent = 'Sistemas online';
      text.style.color = 'var(--accent-success)';
      wrapper.style.background = 'rgba(16, 185, 129, 0.1)';
    } else {
      dot.textContent = 'DB';
      text.textContent = 'Banco com alerta';
      text.style.color = 'var(--accent-warning)';
      wrapper.style.background = 'rgba(245, 158, 11, 0.1)';
      addAppLog('warn', `Problema no banco: ${status.database_error || 'desconhecido'}`);
    }
  } catch (err) {
    dot.textContent = 'API';
    text.textContent = 'API offline';
    text.style.color = 'var(--accent-danger)';
    wrapper.style.background = 'rgba(239, 68, 68, 0.1)';
    addAppLog('error', 'Sem conexao com o servidor backend.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setDefaultDates();
  updateMobilePageTitle('dashboard');
  syncResponsiveLayout();
  renderLogs();
  loadDashboard();
  checkSystemHealth();
});

window.addEventListener('resize', syncResponsiveLayout);

setInterval(checkSystemHealth, 30000);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeModal();
    closeSidebar();
  }
});
