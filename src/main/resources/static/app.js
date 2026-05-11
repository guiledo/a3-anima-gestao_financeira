const API = '/api/v1';
const MOBILE_BREAKPOINT = 768;

window.appLogs = [];
window.currentDashboardData = null;
window.movTypeFilter = null;






function isMobileView() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function updateMobilePageTitle(page) {
  const title = document.getElementById('mobile-page-title');
  if (!title) return;

  const labels = {
    dashboard: 'Dashboard',
    produtos: 'Produtos',
    movimentacoes: 'Movimentações',
    relatorios: 'Relatórios',
    historico: 'Histórico e Logs',
    infraestrutura: 'Gestão de Infra',
    usuarios: 'Usuários'
  };

  title.textContent = labels[page] || 'Gestão Financeira';
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

function toggleCard(cardId) {
  const card = document.getElementById(cardId);
  if (card) card.classList.toggle('collapsed');
}

function navigateTo(page) {
  if (window.sqlLogsInterval) {
    clearInterval(window.sqlLogsInterval);
    window.sqlLogsInterval = null;
  }

  try { 
    const cu = getCurrentUser(); 
    if (cu.username) addAppLog('info', `Navegação: ${page} por ${cu.username}`); 
  } catch(e) {}

  const restrictedForUsers = ['infraestrutura', 'usuarios'];
  if (sessionStorage.getItem('authA3') === 'true' && !isAdmin() && restrictedForUsers.includes(page)) {
    showToast('Acesso restrito para funcionários.', 'error');
    navigateTo('dashboard');
    return;
  }

  if (isAuthenticated() && !isSuperuser() && page === 'usuarios') {
    showToast('Apenas superusuario pode gerenciar usuarios.', 'error');
    navigateTo('dashboard');
    return;
  }

  document.querySelectorAll('.page').forEach(node => node.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(node => node.classList.remove('active'));

  document.getElementById(`page-${page}`)?.classList.add('active');
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

  updateMobilePageTitle(page);
  if (isMobileView()) closeSidebar();

  // Reset filter if navigating normally (unless we just came from card drilldown)
  if (page !== 'movimentacoes') {
    window.movTypeFilter = null;
  }

  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'produtos': loadProdutos(); break;
    case 'clientes': loadClientes(); break;
    case 'movimentacoes': loadMovimentacoes(); break;
    case 'historico': loadHistorico(); break;
    case 'infraestrutura': loadInfraestrutura(); break;
    case 'usuarios': loadUsuarios(); break;
  }
}

/**
 * Navega para movimentações aplicando um filtro de tipo.
 */
function navigateToMovimentacoesWithFilter(type) {
  window.movTypeFilter = type;
  navigateTo('movimentacoes');
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
  const response = await fetch(`${API}${path}`, {
    credentials: 'same-origin',
    ...options
  });

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch (ignored) {
      errorBody = null;
    }

    const detail = errorBody?.detail || errorBody?.title || `Erro ${response.status}`;
    if ((response.status === 401 || response.status === 403) && path !== '/auth/login') {
      clearCurrentUser();
      const loginScreen = document.getElementById('login-screen');
      const secureApp = document.getElementById('secure-app');
      if (loginScreen) loginScreen.style.display = '';
      if (secureApp) secureApp.style.display = 'none';
    }
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
  if (tipoPagamento === 'AVISTA') return 'À vista';
  return '-';
}

function formatParcelas(quantidadeParcelas, valorTotal = 0) {
  const parcelas = Math.max(Number(quantidadeParcelas) || 1, 1);
  const valor = Number(valorTotal) || 0;

  if (parcelas === 1) {
    return valor > 0 ? `1 parcela de ${formatCurrency(valor)}` : '1 parcela única';
  }

  if (valor > 0) {
    return `${parcelas}x de ${formatCurrency(valor / parcelas)}`;
  }

  return `${parcelas} parcelas`;
}

function updateMovimentacaoParcelaPreview() {
  const preview = document.getElementById('mov-parcelas-preview');
  const tipoPagamento = document.getElementById('mov-tipo-pagamento');
  const quantidadeParcelas = document.getElementById('mov-quantidade-parcelas');
  const valor = document.getElementById('mov-valor');
  if (!preview || !tipoPagamento || !quantidadeParcelas || !valor) return;

  const parcelas = Math.max(parseInt(quantidadeParcelas.value, 10) || 1, 1);
  const valorTotal = parseFloat(valor.value) || 0;

  if (tipoPagamento.value === 'AVISTA' || parcelas === 1) {
    preview.textContent = valorTotal > 0
      ? `Parcela única de ${formatCurrency(valorTotal)}.`
      : 'Pagamento em parcela única.';
    return;
  }

  if (valorTotal > 0) {
    preview.textContent = `${parcelas} parcelas de ${formatCurrency(valorTotal / parcelas)}.`;
    return;
  }

  preview.textContent = `${parcelas} parcelas. Informe o valor para calcular cada parcela.`;
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

    window.currentDashboardData = { ...data, saldoAtual: saldo };

    grid.innerHTML = `
      <div class="kpi-card" data-color="emerald" data-action="filter-mov" data-type="ENTRADA" title="Ver todas as entradas">
        <div class="kpi-label">📈 Total Entradas</div>
        <div class="kpi-value text-success">${formatCurrency(data.totalEntradas)}</div>
        <div class="kpi-hint">↗ Ver movimentações</div>
      </div>
      <div class="kpi-card" data-color="red" data-action="filter-mov" data-type="SAIDA" title="Ver todas as saídas">
        <div class="kpi-label">📉 Total Saídas</div>
        <div class="kpi-value text-danger">${formatCurrency(data.totalSaidas)}</div>
        <div class="kpi-hint">↗ Ver movimentações</div>
      </div>
      <div class="kpi-card" data-color="${saldoColor}" data-action="show-saldo" title="Ver balanço geral">
        <div class="kpi-label">💰 Saldo Atual</div>
        <div class="kpi-value ${saldoClass}">${formatCurrency(saldo)}</div>
        <div class="kpi-hint">↗ Ver balanço</div>
      </div>
      <div class="kpi-card" data-color="indigo" data-action="show-produtos" title="Ver catálogo de produtos">
        <div class="kpi-label">📦 Produtos Ativos</div>
        <div class="kpi-value">${data.totalProdutosAtivos ?? 0}</div>
        <div class="kpi-hint">↗ Ver produtos</div>
      </div>
      <div class="kpi-card" data-color="cyan" data-action="show-produtos" title="Ver inventário de estoque">
        <div class="kpi-label">🏪 Itens em Estoque</div>
        <div class="kpi-value">${(data.totalItensEmEstoque ?? 0).toLocaleString('pt-BR')}</div>
        <div class="kpi-hint">↗ Ver estoque</div>
      </div>
      <div class="kpi-card" data-color="violet" data-action="show-produtos" title="Ver valor total do estoque">
        <div class="kpi-label">💎 Valor do Estoque</div>
        <div class="kpi-value">${formatCurrency(data.valorTotalEstoque)}</div>
        <div class="kpi-hint">↗ Ver produtos</div>
      </div>
      <div class="kpi-card" data-color="amber" data-nav="movimentacoes" title="Ver todas as movimentações">
        <div class="kpi-label">🔄 Movimentações</div>
        <div class="kpi-value">${(data.totalMovimentacoes ?? 0).toLocaleString('pt-BR')}</div>
        <div class="kpi-hint">↗ Ver todas</div>
      </div>
    `;

    // Attach robust listeners to each card
    grid.querySelectorAll('.kpi-card').forEach(card => {
      card.addEventListener('click', () => {
        const { action, type, nav } = card.dataset;
        if (action === 'filter-mov') {
          navigateToMovimentacoesWithFilter(type);
        } else if (action === 'show-saldo') {
          showSaldoDrilldown();
        } else if (action === 'show-produtos') {
          showProdutosDrilldown();
        } else if (nav) {
          navigateTo(nav);
        }
      });
    });
    
    // Asynchronously render charts using the dashboard payload and by fetching movimentacoes
    renderDashboardCharts(data);
    
  } catch (err) {
    grid.innerHTML = buildEmptyState('Erro ao carregar dashboard', err.message);
    showToast(`Erro ao carregar dashboard: ${err.message}`, 'error');
  }
}

// ─── Charting Logic ───
let chartInstances = {};

/**
 * Exibe um modal com o detalhamento das movimentações ao clicar em um gráfico.
 * @param {string} type - 'ENTRADA', 'SAIDA' ou uma data 'YYYY-MM-DD'
 * @param {string} title - Título para o modal
 */
async function showChartDrilldown(type, title) {
  openModal(title, `<div class="loading-overlay"><div class="spinner"></div> Filtrando dados...</div>`, '');
  
  try {
    const allMovs = await apiGet('/movimentacoes');
    let filtered = [];
    
    if (type === 'ENTRADA' || type === 'SAIDA') {
      filtered = allMovs.filter(m => m.tipo === type);
    } else {
      filtered = allMovs.filter(m => m.data === type);
    }

    if (filtered.length === 0) {
      document.getElementById('modal-body').innerHTML = buildEmptyState('Nenhuma movimentação encontrada', 'Nenhum registro para este critério.');
      return;
    }

    filtered.sort((a,b) => new Date(b.data) - new Date(a.data));

    const html = `
      <div class="table-wrapper">
        <table style="min-width: 100%;">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(m => `
              <tr>
                <td style="font-size: 11px;">${formatDate(m.data)}</td>
                <td>
                  <div style="font-weight:600; font-size: 13px;">${escapeHtml(m.descricao)}</div>
                  <div style="font-size: 11px; color: var(--text-muted)">${escapeHtml(m.categoria)}</div>
                </td>
                <td class="${m.tipo === 'ENTRADA' ? 'text-success' : 'text-danger'}" style="font-weight:700; text-align:right">
                  ${m.tipo === 'ENTRADA' ? '+' : '-'}${formatCurrency(m.valor)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-footer').innerHTML = `<button class="btn btn-primary" onclick="closeModal()">Fechar</button>`;
    
  } catch (err) {
    document.getElementById('modal-body').innerHTML = buildEmptyState('Erro ao carregar detalhes', err.message);
  }
}

/**
 * Exibe um detalhamento resumido dos produtos no modal.
 */
async function showProdutosDrilldown() {
  openModal('Resumo do Catálogo', `<div class="loading-overlay"><div class="spinner"></div> Carregando lista...</div>`, '');
  
  try {
    const produtos = await apiGet('/produtos');
    const ativos = produtos.filter(p => p.ativo);

    if (produtos.length === 0) {
      document.getElementById('modal-body').innerHTML = buildEmptyState('Nenhum produto cadastrado', 'O catálogo está vazio.');
      return;
    }

    const html = `
      <div style="margin-bottom: 12px; font-size: 13px; color: var(--text-secondary);">
        Exibindo <b>${ativos.length}</b> produtos ativos de <b>${produtos.length}</b> totais.
      </div>
      <div class="table-wrapper">
        <table style="min-width: 100%;">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Preço</th>
              <th>Estoque</th>
            </tr>
          </thead>
          <tbody>
            ${produtos.slice(0, 50).map(p => `
              <tr>
                <td>
                  <div style="font-weight:600; font-size: 13px;">${escapeHtml(p.nome)}</div>
                  <div style="font-size: 11px; color: var(--text-muted)">${escapeHtml(p.categoria)} ${p.ativo ? '' : '<span class="text-danger">(Inativo)</span>'}</div>
                </td>
                <td style="font-weight:600">${formatCurrency(p.preco)}</td>
                <td>
                  <span class="badge ${p.estoque < 5 ? 'badge-danger' : 'badge-neutral'}">${p.estoque}</span>
                </td>
              </tr>
            `).join('')}
            ${produtos.length > 50 ? '<tr><td colspan="3" style="text-align:center; padding: 10px; font-size:11px; color:var(--text-muted)">E mais ${produtos.length - 50} itens...</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `;
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-footer').innerHTML = `
      <button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
      <button class="btn btn-primary" onclick="navigateTo('produtos'); closeModal();">Gerenciar Produtos</button>
    `;
  } catch (err) {
    document.getElementById('modal-body').innerHTML = buildEmptyState('Erro ao carregar produtos', err.message);
  }
}

/**
 * Exibe o detalhamento do saldo atual.
 */
async function showSaldoDrilldown() {
  const dashData = window.currentDashboardData;
  if (!dashData) return;

  const html = `
    <div style="display: grid; gap: 16px;">
      <div class="card" style="padding: 16px; background: rgba(52, 211, 153, 0.05); border-color: var(--accent-success);">
        <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Total Entradas</div>
        <div style="font-size: 20px; font-weight: 800; color: var(--accent-success);">${formatCurrency(dashData.totalEntradas)}</div>
      </div>
      <div class="card" style="padding: 16px; background: rgba(248, 113, 113, 0.05); border-color: var(--accent-danger);">
        <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Total Saídas</div>
        <div style="font-size: 20px; font-weight: 800; color: var(--accent-danger);">${formatCurrency(dashData.totalSaidas)}</div>
      </div>
      <div style="padding: 16px; text-align: center; border-top: 1px solid var(--border); margin-top: 8px;">
        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 4px;">Saldo Final Disponível</div>
        <div style="font-size: 28px; font-weight: 800; color: ${dashData.saldoAtual >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">${formatCurrency(dashData.saldoAtual)}</div>
      </div>
    </div>
  `;
  
  openModal('Balanço Geral', html, `
    <button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
    <button class="btn btn-primary" onclick="navigateTo('movimentacoes'); closeModal();">Ver Movimentações</button>
  `);
}

async function renderDashboardCharts(dashData) {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.color = '#94A3B8';
  Chart.defaults.font.family = "'Outfit', sans-serif";
  
  // 1. Balance Doughnut Chart
  const ctxBalance = document.getElementById('balanceChart');
  if (ctxBalance) {
    if (chartInstances['balance']) chartInstances['balance'].destroy();
    chartInstances['balance'] = new Chart(ctxBalance, {
      type: 'doughnut',
      data: {
        labels: ['Lucro/Entradas', 'Despesas/Saídas'],
        datasets: [{
          data: [dashData.totalEntradas || 0, dashData.totalSaidas || 0],
          backgroundColor: [
            'rgba(52, 211, 153, 0.8)', // accent-success
            'rgba(248, 113, 113, 0.8)' // accent-danger
          ],
          borderColor: '#141722',
          borderWidth: 6,
          hoverOffset: 15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20 } }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const type = index === 0 ? 'ENTRADA' : 'SAIDA';
            navigateToMovimentacoesWithFilter(type);
          }
        }
      }
    });
  }

  // 2. Financial Pipeline Line Chart
  const ctxFinancial = document.getElementById('financialChart');
  if (ctxFinancial) {
    try {
      const movimentacoes = await apiGet('/movimentacoes');
      // Aggregate by Date
      const timelineMap = {};
      movimentacoes.forEach(mov => {
        if (!timelineMap[mov.data]) timelineMap[mov.data] = { entrada: 0, saida: 0 };
        if (mov.tipo === 'ENTRADA') timelineMap[mov.data].entrada += mov.valor;
        else timelineMap[mov.data].saida += mov.valor;
      });

      // Sort dates
      const dates = Object.keys(timelineMap).sort();
      const entradasData = dates.map(d => timelineMap[d].entrada);
      const saidasData = dates.map(d => timelineMap[d].saida);

      if (chartInstances['financial']) chartInstances['financial'].destroy();
      chartInstances['financial'] = new Chart(ctxFinancial, {
        type: 'line',
        data: {
          labels: dates.map(formatDate),
          datasets: [
            {
              label: 'Entradas Diárias',
              data: entradasData,
              borderColor: '#38BDF8', // accent-primary
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4
            },
            {
              label: 'Saídas Diárias',
              data: saidasData,
              borderColor: '#F87171',
              backgroundColor: 'rgba(248, 113, 113, 0.05)',
              borderWidth: 2,
              fill: true,
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' } }
          },
          plugins: { 
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
              }
            }
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const rawDate = dates[index];
              showChartDrilldown(rawDate, `Movimentações em ${formatDate(rawDate)}`);
            }
          }
        }
      });
    } catch (e) {
      console.error('Failed to load chart timeline data', e);
    }
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
      tbody.innerHTML = `<tr><td colspan="8">${buildEmptyState('Nenhum produto cadastrado', 'Clique em "Novo Produto" para começar', '[]')}</td></tr>`;
      return;
    }

    tbody.innerHTML = produtos.map(produto => {
      const actionButtons = canWriteProducts()
        ? `
          <button class="btn btn-ghost btn-sm" onclick="openProdutoModal(${produto.id})">Editar</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteProduto(${produto.id})">Excluir</button>
        `
        : '<span class="muted">Catálogo administrado</span>';

      return `
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
          ${actionButtons}
        </td>
      </tr>
    `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8">${buildEmptyState('Falha ao carregar produtos', err.message)}</td></tr>`;
    showToast(`Erro ao carregar produtos: ${err.message}`, 'error');
  }
}

function openProdutoModal(id) {
  if (!canWriteProducts()) {
    showToast('Produtos são administrados por ADMIN ou SUPERUSER.', 'error');
    return;
  }

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
        <label class="form-label">Preço (R$)</label>
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
          <option value="false">Não</option>
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
  if (!canWriteProducts()) {
    showToast('Produtos são administrados por ADMIN ou SUPERUSER.', 'error');
    return;
  }

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
  if (!canWriteProducts()) {
    showToast('Produtos são administrados por ADMIN ou SUPERUSER.', 'error');
    return;
  }

  if (!confirm('Tem certeza que deseja excluir este produto?')) return;

  try {
    await apiDelete(`/produtos/${id}`);
    showToast('Produto excluído', 'success');
    loadProdutos();
    loadDashboard();
  } catch (err) {
    showToast(`Erro ao excluir: ${err.message}`, 'error');
  }
}
async function loadMovimentacoes() {
  const tbody = document.getElementById('movimentacoes-tbody');
  const countBadge = document.getElementById('movimentacoes-count');
  if (!tbody) return;

  tbody.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Carregando...</div>';

  try {
    let movimentacoes = await apiGet('/movimentacoes');
    
    // Aplicar filtro se existir
    if (window.movTypeFilter) {
      movimentacoes = movimentacoes.filter(m => m.tipo === window.movTypeFilter);
    }

    if (countBadge) countBadge.textContent = `${movimentacoes.length} itens`;

    if (movimentacoes.length === 0) {
      tbody.innerHTML = buildEmptyState('Nenhuma movimentação encontrada', window.movTypeFilter ? 'Tente limpar o filtro para ver tudo.' : 'Clique em "Nova Movimentação" para começar', '$');
      return;
    }

    // Sort globally
    movimentacoes.sort((a, b) => {
      const dateA = new Date(a.data).getTime() || 0;
      const dateB = new Date(b.data).getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;
      return (b.id || 0) - (a.id || 0);
    });

    let html = '';
    
    // Se estiver filtrado, adicionar aviso e botão de limpar
    if (window.movTypeFilter) {
      const label = window.movTypeFilter === 'ENTRADA' ? 'Entradas' : 'Saídas';
      html += `
        <div style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; background: rgba(56, 189, 248, 0.1); padding: 12px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-hover);">
          <div style="font-size: 13px; font-weight: 600;">
            <span class="text-primary">Filtro Ativo:</span> Mostrando apenas <b>${label}</b>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="window.movTypeFilter = null; loadMovimentacoes();" style="font-size: 11px;">Limpar Filtro</button>
        </div>
      `;
    }

    html += movimentacoes.map(movimentacao => {
      const isEntrada = movimentacao.tipo === 'ENTRADA';
      const iconClass = isEntrada ? 'entrada' : 'saida';
      const symbol = isEntrada ? '+' : '-';
      const colorClass = isEntrada ? 'text-success' : 'text-danger';
      const actionButtons = canWriteMovimentacoes()
        ? `
                <button class="btn btn-ghost btn-sm" onclick="openMovimentacaoModal(${movimentacao.id})" style="padding: 4px 8px; font-size: 11px;">Editar</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteMovimentacao(${movimentacao.id})" style="padding: 4px 8px; font-size: 11px; color: var(--accent-danger);">Excluir</button>
        `
        : '<span class="muted">Somente leitura</span>';

      return `
        <div class="timeline-item">
          <div class="timeline-icon ${iconClass}">${symbol}</div>
          <div class="timeline-content" style="display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border); padding: 12px; border-radius: var(--radius-md);">
            <div style="flex: 1;">
              <div class="timeline-date">${formatDate(movimentacao.data)} &bull; ${escapeHtml(movimentacao.categoria)}</div>
              <div class="timeline-title">${escapeHtml(movimentacao.descricao)}</div>
              <div class="timeline-details">
                Cliente: <b>${escapeHtml(movimentacao.cliente)}</b> &nbsp;|&nbsp; 
                Vendedor: <b>${escapeHtml(movimentacao.vendedorNome || movimentacao.vendedorUsername || 'Nao informado')}</b> &nbsp;|&nbsp;
                Qtd: <b>${movimentacao.quantidade || 1}</b> &nbsp;|&nbsp;
                ${escapeHtml(formatTipoPagamento(movimentacao.tipoPagamento))} 
                (${escapeHtml(formatParcelas(movimentacao.quantidadeParcelas, movimentacao.valor))})
              </div>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
              <strong class="${colorClass}" style="font-size: 16px;">${formatCurrency(movimentacao.valor)}</strong>
              <div style="display: flex; gap: 4px;">
                ${actionButtons}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    tbody.innerHTML = html;
  } catch (err) {
    tbody.innerHTML = buildEmptyState('Falha ao carregar movimentações', err.message);
    showToast(`Erro ao carregar movimentações: ${err.message}`, 'error');
  }
}

async function openMovimentacaoModal(id) {
  if (!canWriteMovimentacoes()) {
    showToast('Seu perfil permite apenas leitura de movimentacoes.', 'error');
    return;
  }

  const isEdit = Boolean(id);
  const today = new Date().toISOString().split('T')[0];

  // Busca produtos e clientes para os seletores
  let produtos = [];
  let clientes = [];
  try {
    produtos = await apiGet('/produtos');
    produtos = produtos.filter(p => p.ativo !== false); // Inclui null ou true
  } catch (err) {
    console.warn('Falha ao carregar produtos:', err);
  }
  try {
    clientes = await apiGet('/clientes');
  } catch (err) {
    console.warn('Falha ao carregar clientes:', err);
  }

  const body = `
    <input type="hidden" id="mov-id" value="${id || ''}">
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select id="mov-tipo" class="form-select">
          <option value="ENTRADA">Entrada (Venda/Receita)</option>
          <option value="SAIDA">Saída (Compra/Despesa)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Produto (Baixa no estoque)</label>
        <select id="mov-produto-id-unique" class="form-select" onchange="onMovimentacaoProdutoChange(this)">
          <option value="">-- Selecione um produto --</option>
          ${produtos.map(p => `<option value="${p.id}" data-preco="${p.preco}" data-nome="${p.nome}">${escapeHtml(p.nome)} (Est: ${p.estoque})</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Cliente (Opcional)</label>
        <select id="mov-cliente-id" class="form-select" onchange="onMovimentacaoClienteChange(this)">
          <option value="">-- Venda Avulsa / Ignorar --</option>
          ${clientes.map(c => `<option value="${c.id}" data-nome="${c.nome}">${escapeHtml(c.nome)} (${c.documento || 'Sem Documento'})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nome p/ Recibo / Avulso</label>
        <input type="text" id="mov-cliente" class="form-input" placeholder="Ex: Cliente XPTO" maxlength="120">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <input type="text" id="mov-descricao" class="form-input" placeholder="Ex: Venda do dia" maxlength="160">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Quantidade</label>
        <input type="number" id="mov-quantidade" class="form-input" min="1" value="1" oninput="onMovimentacaoQuantidadeChange()">
      </div>
      <div class="form-group">
        <label class="form-label">Valor Total (R$)</label>
        <input type="number" id="mov-valor" class="form-input" step="0.01" min="0" placeholder="0.00" oninput="updateMovimentacaoParcelaPreview()">
      </div>
    </div>
      <div class="form-group">
        <label class="form-label">Data</label>
        <input type="date" id="mov-data" class="form-input" value="${today}">
      </div>
    <div class="form-group">
      <label class="form-label">Categoria</label>
      <select id="mov-categoria" class="form-select">
        <optgroup label="Receitas">
          <option value="Venda de Produto">Venda de Produto</option>
          <option value="Prestação de Serviço">Prestação de Serviço</option>
          <option value="Investimento">Investimento</option>
          <option value="Outras Receitas">Outras Receitas</option>
        </optgroup>
        <optgroup label="Despesas">
          <option value="Compra de Estoque">Compra de Estoque</option>
          <option value="Aluguel">Aluguel</option>
          <option value="Salário">Salário</option>
          <option value="Marketing">Marketing</option>
          <option value="Impostos">Impostos</option>
          <option value="Outras Despesas">Outras Despesas</option>
        </optgroup>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo de pagamento</label>
        <select id="mov-tipo-pagamento" class="form-select" onchange="syncMovimentacaoPagamentoFields()">
          <option value="AVISTA">À vista</option>
          <option value="PARCELADO">Parcelado</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Parcelas</label>
        <input type="number" id="mov-quantidade-parcelas" class="form-input" min="1" max="360" value="1" oninput="updateMovimentacaoParcelaPreview()">
        <div class="form-hint" id="mov-parcelas-preview">Pagamento em parcela única.</div>
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

  openModal(isEdit ? 'Editar Movimentação' : 'Nova Movimentação', body, footer);
  syncMovimentacaoPagamentoFields();

  if (isEdit) {
    try {
      const movimentacao = await apiGet(`/movimentacoes/${id}`);
      document.getElementById('mov-tipo').value = movimentacao.tipo;
      document.getElementById('mov-cliente').value = movimentacao.cliente;
      document.getElementById('mov-descricao').value = movimentacao.descricao;
      document.getElementById('mov-valor').value = movimentacao.valor;
      document.getElementById('mov-data').value = movimentacao.data;
      document.getElementById('mov-categoria').value = movimentacao.categoria;
      document.getElementById('mov-tipo-pagamento').value = movimentacao.tipoPagamento;
      document.getElementById('mov-quantidade-parcelas').value = movimentacao.quantidadeParcelas;
      document.getElementById('mov-primeiro-vencimento').value = movimentacao.dataPrimeiroVencimento;
      document.getElementById('mov-quantidade').value = movimentacao.quantidade || 1;
      if (movimentacao.produtoId) {
        document.getElementById('mov-produto-id').value = movimentacao.produtoId;
      }
      if (movimentacao.clienteId) {
        document.getElementById('mov-cliente-id').value = movimentacao.clienteId;
      }
      syncMovimentacaoPagamentoFields();
    } catch (err) {
      showToast(`Erro ao carregar movimentação: ${err.message}`, 'error');
    }
  }
}

function onMovimentacaoProdutoChange(select) {
  const selectedOption = select.options[select.selectedIndex];
  if (!selectedOption || !selectedOption.value) return;

  const preco = selectedOption.dataset.preco;
  const nome = selectedOption.dataset.nome;

  const descEl = document.getElementById('mov-descricao');
  const valorEl = document.getElementById('mov-valor');
  const tipoEl = document.getElementById('mov-tipo');
  const catEl = document.getElementById('mov-categoria');
  const qtdEl = document.getElementById('mov-quantidade');

  descEl.value = `Venda: ${nome}`;
  if (qtdEl) qtdEl.value = 1;
  valorEl.value = preco;
  
  if (tipoEl) tipoEl.value = 'ENTRADA';
  if (catEl) catEl.value = 'Venda de Produto';
  
  updateMovimentacaoParcelaPreview();
}

function onMovimentacaoClienteChange(select) {
  const selectedOption = select.options[select.selectedIndex];
  const cliInput = document.getElementById('mov-cliente');
  if (selectedOption && selectedOption.value) {
    cliInput.value = selectedOption.dataset.nome;
    cliInput.disabled = true;
  } else {
    cliInput.value = '';
    cliInput.disabled = false;
  }
}

function onMovimentacaoQuantidadeChange() {
  const select = document.getElementById('mov-produto-id-unique');
  const selectedOption = select.options[select.selectedIndex];
  const qtdEl = document.getElementById('mov-quantidade');
  const valorEl = document.getElementById('mov-valor');

  if (selectedOption && selectedOption.value && qtdEl && valorEl) {
    const precoUnitario = parseFloat(selectedOption.dataset.preco) || 0;
    const quantidade = parseInt(qtdEl.value, 10) || 1;
    valorEl.value = (precoUnitario * quantidade).toFixed(2);
    updateMovimentacaoParcelaPreview();
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
    updateMovimentacaoParcelaPreview();
    return;
  }

  quantidadeParcelas.disabled = false;
  quantidadeParcelas.min = '2';
  if ((parseInt(quantidadeParcelas.value, 10) || 0) < 2) {
    quantidadeParcelas.value = '2';
  }

  updateMovimentacaoParcelaPreview();
}

async function saveMovimentacao() {
  if (!canWriteMovimentacoes()) {
    showToast('Seu perfil permite apenas leitura de movimentacoes.', 'error');
    return;
  }

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
    dataPrimeiroVencimento: document.getElementById('mov-primeiro-vencimento').value,
    produtoId: parseInt(document.getElementById('mov-produto-id-unique').value, 10) || null,
    quantidade: parseInt(document.getElementById('mov-quantidade').value, 10) || 1,
    clienteId: document.getElementById('mov-cliente-id').value || null
  };

  if (data.tipoPagamento === 'AVISTA') {
    data.quantidadeParcelas = 1;
  }

  if (!data.cliente || !data.descricao || !data.categoria || !data.data) {
    showToast('Preencha os campos obrigatorios: Cliente, Descricao, Categoria e Data', 'error');
    return;
  }

  if (data.tipoPagamento === 'PARCELADO' && data.quantidadeParcelas < 2) {
    showToast('Pagamento parcelado precisa de pelo menos 2 parcelas', 'error');
    return;
  }

  try {
    if (id) {
      await apiPut(`/movimentacoes/${id}`, data);
      showToast('Movimentação atualizada', 'success');
    } else {
      await apiPost('/movimentacoes', data);
      showToast('Movimentação criada', 'success');
    }

    closeModal();
    loadMovimentacoes();
    loadProdutos();
    loadDashboard();
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
  }
}

async function deleteMovimentacao(id) {
  if (!canWriteMovimentacoes()) {
    showToast('Seu perfil permite apenas leitura de movimentacoes.', 'error');
    return;
  }

  if (!confirm('Tem certeza que deseja excluir esta movimentação?')) return;

  try {
    await apiDelete(`/movimentacoes/${id}`);
    showToast('Movimentação excluída', 'success');
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
          ${buildEmptyState('Nenhum cliente com parcelas no período selecionado.', 'Cadastre movimentações com cliente e vencimento para acompanhar o fechamento mensal.')}
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
              <th>Devido no período</th>
              <th>Qtd. lançamentos</th>
              <th>Próximo vencimento</th>
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
                <span>Lançamentos no período</span>
                <strong>${cliente.quantidadeMovimentacoes}</strong>
              </div>
              <div class="report-client-metric">
                <span>Primeiro vencimento</span>
                <strong>${formatDate(cliente.proximoVencimento)}</strong>
              </div>
            </div>

            <div class="report-client-section">
              <h3>Quanto deve por mês</h3>
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Mês</th>
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
              <h3>Movimentações do cliente</h3>
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Valor</th>
                      <th>Data</th>
                      <th>Pagamento</th>
                      <th>Parcelas</th>
                      <th>1º vencimento</th>
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
                        <td>${escapeHtml(formatParcelas(item.quantidadeParcelas, item.valor))}</td>
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

let lastRelatorioFinanceiroData = null;
let lastRelatorioProdutosData = null;

async function loadRelatorioFinanceiro() {
  const inicio = document.getElementById('rel-data-inicio').value;
  const fim = document.getElementById('rel-data-fim').value;
  const container = document.getElementById('relatorio-financeiro-content');

  if (!inicio || !fim) {
    showToast('Selecione as datas de início e fim', 'error');
    return;
  }

  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Gerando relatório...</div>';

  try {
    const relatorio = await apiGet(`/relatorios/financeiro?dataInicio=${inicio}&dataFim=${fim}`);
    lastRelatorioFinanceiroData = { relatorio, inicio, fim };

    container.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px;gap:8px;">
        <button class="btn btn-success" onclick="exportRelatorioFinanceiroCSV()">Exportar CSV</button>
      </div>
      <div class="kpi-grid">
        <div class="kpi-card" data-color="emerald">
          <div class="kpi-label">Entradas no período</div>
          <div class="kpi-value text-success">${formatCurrency(relatorio.totalEntradas)}</div>
        </div>
        <div class="kpi-card" data-color="red">
          <div class="kpi-label">Saídas no período</div>
          <div class="kpi-value text-danger">${formatCurrency(relatorio.totalSaidas)}</div>
        </div>
        <div class="kpi-card" data-color="${relatorio.saldoPeriodo >= 0 ? 'emerald' : 'red'}">
          <div class="kpi-label">Saldo do período</div>
          <div class="kpi-value ${relatorio.saldoPeriodo >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(relatorio.saldoPeriodo)}</div>
        </div>
        <div class="kpi-card" data-color="amber">
          <div class="kpi-label">Número de movimentações</div>
          <div class="kpi-value">${relatorio.quantidadeMovimentacoes}</div>
        </div>
        <div class="kpi-card" data-color="cyan">
          <div class="kpi-label">Média diária de entradas</div>
          <div class="kpi-value">${formatCurrency(relatorio.mediaDiariaEntradas)}</div>
        </div>
        <div class="kpi-card" data-color="violet">
          <div class="kpi-label">Média diária de saídas</div>
          <div class="kpi-value">${formatCurrency(relatorio.mediaDiariaSaidas)}</div>
        </div>
        <div class="kpi-card" data-color="indigo">
          <div class="kpi-label">Clientes com débitos</div>
          <div class="kpi-value">${relatorio.totalClientesComDebitos || 0}</div>
        </div>
        <div class="kpi-card" data-color="emerald">
          <div class="kpi-label">Total devido por cliente</div>
          <div class="kpi-value text-success">${formatCurrency(relatorio.totalDevidoPorClientesNoPeriodo)}</div>
        </div>
      </div>

      ${renderCategoriaTable('Entradas por categoria', relatorio.entradasPorCategoria, 'success')}
      ${renderCategoriaTable('Saídas por categoria', relatorio.saidasPorCategoria, 'danger')}
      ${renderFechamentoPorCliente(relatorio.fechamentoPorCliente)}
    `;

    showToast('Relatório financeiro gerado', 'success');
  } catch (err) {
    container.innerHTML = buildEmptyState('Falha ao gerar relatório', err.message);
    showToast(`Erro: ${err.message}`, 'error');
  }
}

function exportRelatorioFinanceiroCSV() {
  if (!lastRelatorioFinanceiroData) {
    showToast('Gere o relatório antes de exportar', 'error');
    return;
  }

  const { relatorio, inicio, fim } = lastRelatorioFinanceiroData;
  let csv = '';

  csv += 'RELATÓRIO FINANCEIRO\n';
  csv += `Período;${inicio};${fim}\n`;
  csv += '\n';
  csv += 'RESUMO\n';
  csv += `Total Entradas;${relatorio.totalEntradas}\n`;
  csv += `Total Saídas;${relatorio.totalSaidas}\n`;
  csv += `Saldo Período;${relatorio.saldoPeriodo}\n`;
  csv += `Número de Movimentações;${relatorio.quantidadeMovimentacoes}\n`;
  csv += `Média Diária Entradas;${relatorio.mediaDiariaEntradas}\n`;
  csv += `Média Diária Saídas;${relatorio.mediaDiariaSaidas}\n`;
  csv += `Clientes com Débitos;${relatorio.totalClientesComDebitos || 0}\n`;
  csv += `Total Devido por Cliente;${relatorio.totalDevidoPorClientesNoPeriodo}\n`;
  csv += '\n';

  if (relatorio.entradasPorCategoria && relatorio.entradasPorCategoria.length > 0) {
    csv += 'ENTRADAS POR CATEGORIA\n';
    csv += 'Categoria;Quantidade;Valor Total\n';
    relatorio.entradasPorCategoria.forEach(item => {
      csv += `${item.categoria};${item.quantidade};${item.valorTotal}\n`;
    });
    csv += '\n';
  }

  if (relatorio.saidasPorCategoria && relatorio.saidasPorCategoria.length > 0) {
    csv += 'SAÍDAS POR CATEGORIA\n';
    csv += 'Categoria;Quantidade;Valor Total\n';
    relatorio.saidasPorCategoria.forEach(item => {
      csv += `${item.categoria};${item.quantidade};${item.valorTotal}\n`;
    });
    csv += '\n';
  }

  if (relatorio.fechamentoPorCliente && relatorio.fechamentoPorCliente.length > 0) {
    csv += 'FECHAMENTO POR CLIENTE\n';
    csv += 'Cliente;Total Movimentado;Devido no Período;Qtd Lançamentos;Próximo Vencimento\n';
    relatorio.fechamentoPorCliente.forEach(cliente => {
      csv += `${cliente.cliente};${cliente.valorTotalMovimentado};${cliente.valorDevidoNoPeriodo};${cliente.quantidadeMovimentacoes};${cliente.proximoVencimento}\n`;
    });
    csv += '\n';

    csv += 'MOVIMENTAÇÕES POR CLIENTE\n';
    csv += 'Cliente;Descrição;Categoria;Valor;Data;Tipo Pagamento;Quantidade Parcelas;Data Primeiro Vencimento\n';
    relatorio.fechamentoPorCliente.forEach(cliente => {
      cliente.movimentacoes.forEach(mov => {
        csv += `${cliente.cliente};${mov.descricao};${mov.categoria};${mov.valor};${mov.data};${mov.tipoPagamento};${mov.quantidadeParcelas};${mov.dataPrimeiroVencimento}\n`;
      });
    });
    csv += '\n';
  }

  csv += 'DÉBITOS MENSAIS POR CLIENTE\n';
  csv += 'Cliente;Competência;Valor Devido\n';
  relatorio.fechamentoPorCliente.forEach(cliente => {
    cliente.debitosMensais.forEach(debito => {
      csv += `${cliente.cliente};${debito.competencia};${debito.valorDevido}\n`;
    });
  });

  downloadCSV(csv, `relatório_financeiro_${inicio}_${fim}.csv`);
  showToast('CSV exportado com sucesso', 'success');
}

function downloadCSV(csv, filename) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function loadRelatorioProdutos() {
  const container = document.getElementById('relatorio-produtos-content');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Gerando relatório...</div>';

  try {
    const relatorio = await apiGet('/relatorios/produtos');
    lastRelatorioProdutosData = relatorio;

    container.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px;gap:8px;">
        <button class="btn btn-success" onclick="exportRelatorioProdutosCSV()">Exportar CSV</button>
      </div>
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

    showToast('Relatório de produtos gerado', 'success');
  } catch (err) {
    container.innerHTML = buildEmptyState('Falha ao gerar relatório', err.message);
    showToast(`Erro: ${err.message}`, 'error');
  }
}

function exportRelatorioProdutosCSV() {
  if (!lastRelatorioProdutosData) {
    showToast('Gere o relatório antes de exportar', 'error');
    return;
  }

  const r = lastRelatorioProdutosData;
  let csv = '';

  csv += 'RELATÓRIO DE PRODUTOS\n';
  csv += '\n';
  csv += 'RESUMO\n';
  csv += `Total Produtos;${r.totalProdutos}\n`;
  csv += `Total Produtos Ativos;${r.totalProdutosAtivos}\n`;
  csv += `Total Produtos Inativos;${r.totalProdutosInativos}\n`;
  csv += `Total Itens em Estoque;${r.totalItensEmEstoque}\n`;
  csv += `Valor Total Estoque Custo;${r.valorTotalEstoqueCusto}\n`;
  csv += `Valor Total Estoque Venda;${r.valorTotalEstoqueVenda}\n`;
  csv += `Margem Bruta Estoque;${r.margemBrutaEstoque}\n`;
  csv += '\n';

  if (r.porCategoria && r.porCategoria.length > 0) {
    csv += 'POR CATEGORIA\n';
    csv += 'Categoria;Quantidade Produtos;Itens Estoque;Valor Estoque Custo;Valor Estoque Venda\n';
    r.porCategoria.forEach(item => {
      csv += `${item.categoria};${item.quantidadeProdutos};${item.quantidadeItensEstoque};${item.valorEstoqueCusto};${item.valorEstoqueVenda}\n`;
    });
  }

  downloadCSV(csv, 'relatorio_produtos.csv');
  showToast('CSV exportado com sucesso', 'success');
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
    'Clique em "Atualizar" para recarregar as movimentações do banco.',
    'X'
  );

  showToast('Linha do tempo limpa da interface', 'info');
}

function renderLogs() {
  const consoleEl = document.getElementById('log-console');
  if (!consoleEl) return;

  if (window.appLogs.length === 0) {
    consoleEl.innerHTML = '<div class="log-entry info"><span class="log-time">--:--:--</span> Nenhum log registrado até o momento.</div>';
    return;
  }

  consoleEl.innerHTML = window.appLogs.map(log => `
    <div class="log-entry ${escapeHtml(log.type)}">
      <span class="log-time">[${escapeHtml(log.time)}]</span> ${escapeHtml(log.message)}
    </div>
  `).join('');
}

function loadUsuarios() {
  const container = document.getElementById('usuarios-list');
  if (!container) return;

  if (!isAdmin()) {
    container.innerHTML = buildEmptyState('Acesso restrito', 'Somente administradores podem visualizar esta área.');
    return;
  }

  const users = getUsers();

  container.innerHTML = users.map(u => {
    const roleLabel = u.role === 'ADMIN' ? 'ADMIN' : 'FUNCIONÁRIO';
    const safeName = escapeHtml(u.name || '');
    const safeUser = escapeHtml(u.username || '');
    return `
      <div class="user-row">
        <div class="user-main">
          <div class="user-username">${safeUser}</div>
          <div class="user-meta">
            <span class="badge ${u.role === 'ADMIN' ? 'badge-warning' : 'badge-info'}">${roleLabel}</span>
            ${safeName ? `<span class="muted">&bull; ${safeName}</span>` : ''}
          </div>
        </div>
        <div class="user-actions">
          ${u.username === (getCurrentUser().username || '') ? `<span class="muted">logado</span>` : ''}
          ${u.role === 'ADMIN' ? '' : `<button class="btn btn-ghost btn-sm" onclick="handleDeleteUser('${encodeURIComponent(u.username)}')">Remover</button>`}
        </div>
      </div>
    `;
  }).join('');

  addAppLog('info', 'Lista de usuários atualizada.');
}

function handleCreateUser() {
  if (!isAdmin()) {
    showToast('Apenas admin pode criar usuários.', 'error');
    return;
  }

  const usernameEl = document.getElementById('new-user-username');
  const passwordEl = document.getElementById('new-user-password');
  const nameEl = document.getElementById('new-user-name');

  const username = (usernameEl?.value || '').trim();
  const password = (passwordEl?.value || '');
  const name = (nameEl?.value || '').trim();

  if (!username || !password) {
    showToast('Usuário e senha são obrigatórios.', 'error');
    return;
  }

  const users = getUsers();
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    showToast('Já existe um usuário com esse nome.', 'error');
    return;
  }

  // Sempre cria como funcionário
  users.push({ username, password, role: 'USER', name });

  saveUsers(users);

  usernameEl.value = '';
  passwordEl.value = '';
  if (nameEl) nameEl.value = '';

  showToast('Usuário criado com sucesso.', 'success');
  addAppLog('info', `Admin criou usuário: ${username}`);

  loadUsuarios();
}

function handleDeleteUser(encodedUsername) {
  if (!isAdmin()) {
    showToast('Apenas admin pode remover usuários.', 'error');
    return;
  }

  const username = decodeURIComponent(encodedUsername || '');
  const users = getUsers();

  const target = users.find(u => u.username === username);
  if (!target) {
    showToast('Usuário não encontrado.', 'error');
    return;
  }

  if (target.role === 'ADMIN') {
    showToast('Não é permitido remover administradores por aqui.', 'error');
    return;
  }

  const next = users.filter(u => u.username !== username);
  saveUsers(next);

  showToast('Usuário removido.', 'success');
  addAppLog('warn', `Admin removeu usuário: ${username}`);
  loadUsuarios();
}

async function loadUsuarios() {
  const container = document.getElementById('usuarios-list');
  if (!container) return;

  if (!isSuperuser()) {
    container.innerHTML = buildEmptyState('Acesso restrito', 'Somente superusuarios podem visualizar esta area.');
    return;
  }

  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Carregando usuarios...</div>';

  try {
    const users = await apiGet('/usuarios');

    if (!users.length) {
      container.innerHTML = buildEmptyState('Nenhum usuario cadastrado.');
      return;
    }

    container.innerHTML = users.map(u => {
      const role = u.perfil || 'USER';
      const currentUser = getCurrentUser();
      const isLoggedUser = String(u.id) === String(currentUser.id) || u.username === currentUser.username;
      const safeName = escapeHtml(u.nome || '');
      const safeUser = escapeHtml(u.username || '');
      const roleLabel = role === 'SUPERUSER' ? 'SUPERUSER' : role === 'ADMIN' ? 'ADMIN' : 'FUNCIONARIO';

      return `
        <div class="user-row">
          <div class="user-main">
            <div class="user-username">${safeUser}</div>
            <div class="user-meta">
              <span class="badge ${role === 'SUPERUSER' ? 'badge-danger' : role === 'ADMIN' ? 'badge-warning' : 'badge-info'}">${roleLabel}</span>
              <span class="badge ${u.ativo ? 'badge-success' : 'badge-neutral'}">${u.ativo ? 'ATIVO' : 'INATIVO'}</span>
              ${safeName ? `<span class="muted">&bull; ${safeName}</span>` : ''}
              ${isLoggedUser ? '<span class="muted">&bull; logado</span>' : ''}
            </div>
            <div class="form-row" style="margin-top: 12px;">
              <div class="form-group">
                <label class="form-label">Perfil</label>
                <select class="form-select" id="user-profile-${u.id}">
                  <option value="USER" ${role === 'USER' ? 'selected' : ''}>Vendedor - proprias vendas</option>
                  <option value="ADMIN" ${role === 'ADMIN' ? 'selected' : ''}>Administrador - dados</option>
                  <option value="SUPERUSER" ${role === 'SUPERUSER' ? 'selected' : ''}>Superusuário - usuários</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-select" id="user-active-${u.id}" ${isLoggedUser ? 'disabled' : ''}>
                  <option value="true" ${u.ativo ? 'selected' : ''}>Ativo</option>
                  <option value="false" ${!u.ativo ? 'selected' : ''}>Inativo</option>
                </select>
              </div>
            </div>
            <div class="form-group" style="margin-top: 8px;">
              <label class="form-label">Nova senha (opcional)</label>
              <input class="form-input" id="user-password-${u.id}" type="password" placeholder="Deixe vazio para manter a senha atual">
            </div>
          </div>
          <div class="user-actions">
            <button class="btn btn-ghost btn-sm" onclick="handleUpdateUser(${u.id})">Salvar</button>
          </div>
        </div>
      `;
    }).join('');

    addAppLog('info', 'Lista de usuarios atualizada pelo backend.');
  } catch (err) {
    container.innerHTML = buildEmptyState('Falha ao carregar usuarios', err.message);
    showToast(`Erro ao carregar usuarios: ${err.message}`, 'error');
  }
}

async function handleCreateUser() {
  if (!isSuperuser()) {
    showToast('Apenas superusuario pode criar usuarios.', 'error');
    return;
  }

  const usernameEl = document.getElementById('new-user-username');
  const passwordEl = document.getElementById('new-user-password');
  const nameEl = document.getElementById('new-user-name');
  const profileEl = document.getElementById('new-user-profile');

  const payload = {
    username: (usernameEl?.value || '').trim(),
    password: passwordEl?.value || '',
    nome: (nameEl?.value || '').trim() || (usernameEl?.value || '').trim(),
    perfil: profileEl?.value || 'USER',
    ativo: true
  };

  if (!payload.username || !payload.password || !payload.nome) {
    showToast('Usuario, senha e nome sao obrigatorios.', 'error');
    return;
  }

  try {
    await apiPost('/usuarios', payload);

    usernameEl.value = '';
    passwordEl.value = '';
    if (nameEl) nameEl.value = '';
    if (profileEl) profileEl.value = 'USER';

    showToast('Usuario criado com sucesso.', 'success');
    addAppLog('info', `Superusuario criou usuario: ${payload.username}`);
    loadUsuarios();
  } catch (err) {
    showToast(`Erro ao criar usuario: ${err.message}`, 'error');
  }
}

async function handleUpdateUser(id) {
  if (!isSuperuser()) {
    showToast('Apenas superusuario pode alterar usuarios.', 'error');
    return;
  }

  try {
    const current = await apiGet(`/usuarios/${id}`);
    const password = document.getElementById(`user-password-${id}`)?.value || '';
    const activeEl = document.getElementById(`user-active-${id}`);

    const payload = {
      nome: current.nome,
      username: current.username,
      perfil: document.getElementById(`user-profile-${id}`)?.value || current.perfil,
      ativo: activeEl ? activeEl.value === 'true' : current.ativo,
      password: password.trim() ? password : null
    };

    await apiPut(`/usuarios/${id}`, payload);
    showToast('Usuario atualizado com sucesso.', 'success');
    addAppLog('info', `Superusuario atualizou usuario: ${current.username}`);

    const logged = getCurrentUser();
    if (current.username === logged.username) {
      const me = await apiGet('/auth/me');
      setCurrentUser(me);
      applyRoleAccessControl();
    }

    loadUsuarios();
  } catch (err) {
    showToast(`Erro ao atualizar usuario: ${err.message}`, 'error');
  }
}

async function loadHistorico() {
  const timeline = document.getElementById('historico-timeline');
  if (!timeline) return;

  timeline.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Carregando histórico...</div>';
  renderLogs();

  try {
    const movimentacoes = await apiGet('/movimentacoes');
    movimentacoes.sort((a, b) => b.id - a.id);

    if (movimentacoes.length === 0) {
      timeline.innerHTML = buildEmptyState('Nenhum evento registrado no histórico.', '', '[]');
      return;
    }

    timeline.innerHTML = movimentacoes.map(item => {
      const isEntrada = item.tipo === 'ENTRADA';

      return `
        <div class="timeline-item">
          <div class="timeline-icon ${isEntrada ? 'entrada' : 'saida'}">${isEntrada ? '+' : '-'}</div>
          <div class="timeline-content">
            <div class="timeline-date">${formatDate(item.data)} - Movimentação #${item.id}</div>
            <div class="timeline-title">${escapeHtml(item.descricao)}</div>
            <div class="timeline-details">
              Cliente: <strong>${escapeHtml(item.cliente || 'Sem cliente')}</strong>
              &bull;
              Categoria: <strong>${escapeHtml(item.categoria)}</strong>
              &bull;
              Pagamento: <strong>${escapeHtml(formatTipoPagamento(item.tipoPagamento))} ${escapeHtml(formatParcelas(item.quantidadeParcelas, item.valor))}</strong>
              &bull;
              Valor: <strong class="${isEntrada ? 'text-success' : 'text-danger'}">${formatCurrency(item.valor)}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');

    addAppLog('info', 'Histórico e timeline atualizados com sucesso.');
  } catch (err) {
    timeline.innerHTML = buildEmptyState('Falha ao carregar linha do tempo', err.message);
    showToast(`Erro ao carregar histórico: ${err.message}`, 'error');
  }
}

async function exportToCSV() {
  showToast('Preparando exportação...', 'info');
  try {
    const data = await apiGet('/movimentacoes');
    if (!data || data.length === 0) {
      showToast('Nenhum dado para exportar.', 'warn');
      return;
    }

    const headers = ['ID', 'Data', 'Tipo', 'Descricao', 'Categoria', 'Valor', 'Cliente', 'Vendedor', 'Pagamento', 'Parcelas'];
    const rows = data.map(item => [
      item.id,
      formatDate(item.data),
      item.tipo,
      item.descricao,
      item.categoria,
      item.valor,
      item.cliente || '',
      item.vendedorNome || item.vendedorUsername || '',
      formatTipoPagamento(item.tipoPagamento),
      item.quantidadeParcelas || 1
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `movimentacoes_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Download concluído!', 'success');
    addAppLog('info', 'Exportação para CSV realizada com sucesso.');
  } catch (err) {
    showToast('Falha na exportação: ' + err.message, 'error');
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
    return buildEmptyState('Nenhum alerta dinâmico retornado.');
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

function renderDatabaseTableMap(tables = []) {
  if (!tables.length) {
    return buildEmptyState('Nenhuma tabela retornada pelo banco.', 'Verifique a conexao e as permissoes do usuario do banco.');
  }

  const grouped = tables.reduce((acc, table) => {
    const group = table.businessArea || table.module || 'Outras tabelas';
    acc[group] = acc[group] || [];
    acc[group].push(table);
    return acc;
  }, {});

  return Object.entries(grouped).map(([group, groupTables]) => `
    <div class="server-warning-item" style="background: rgba(15, 18, 26, 0.55);">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div>
          <div class="server-endpoint-label">${escapeHtml(group)}</div>
          <p style="margin:6px 0 0; color: var(--text-muted); font-size: 12px;">
            ${groupTables.length} estrutura${groupTables.length === 1 ? '' : 's'} encontrada${groupTables.length === 1 ? '' : 's'} automaticamente no Supabase.
          </p>
        </div>
        <span class="badge badge-neutral">${escapeHtml(groupTables[0]?.audience || 'Sistema')}</span>
      </div>

      <div class="server-endpoint-list" style="margin-top:14px;">
        ${groupTables.map(table => `
          <div class="server-endpoint-row">
            <span class="badge ${table.schema === 'public' ? 'badge-success' : 'badge-info'}">${escapeHtml(table.schema)}</span>
            <div>
              <div class="server-endpoint-label">${escapeHtml(table.friendlyName || table.name)}</div>
              <div class="server-endpoint-path">
                <code>${escapeHtml(table.qualifiedName || table.name)} · ${escapeHtml(String(table.columns || 0))} campos</code>
              </div>
              <p style="margin: 8px 0 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5;">
                ${escapeHtml(table.plainPurpose || table.description || 'Tabela detectada automaticamente.')}
              </p>
              ${(table.dependsOn || []).length ? `
                <p style="margin: 6px 0 0; color: var(--text-muted); font-size: 11px;">
                  Relacionada com: ${escapeHtml(table.dependsOn.join(', '))}
                </p>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
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
      : `Docs indisponíveis (${openApiStatus.status}/${swaggerStatus.status})`;

    container.innerHTML = `
      <section class="card server-hero">
        <div class="server-hero-copy">
          <span class="badge badge-info">Infra live</span>
          <h2 class="server-hero-title">${escapeHtml(infra.application.displayName)}</h2>
          <p class="server-hero-text">
            Aplicação publicada como ${escapeHtml(infra.application.packaging)} em
            <code>${escapeHtml(infra.runtime.operatingSystem)}</code>, acessível em
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
            <div class="kpi-label">Movimentações</div>
            <div class="kpi-value">${(dashboard.totalMovimentacoes || 0).toLocaleString('pt-BR')}</div>
          </div>
        </div>
      ` : ''}

      <div class="server-grid">
        <section class="card server-panel server-panel-wide">
          <div class="card-header">
            <span class="card-title">Monitor SQL (Tempo Real)</span>
          </div>
          <div class="card-body">
            <div id="live-sql-logs" style="max-height: 400px; overflow-y: auto; background: var(--bg-tertiary); padding: 10px; border-radius: 6px; font-family: monospace; font-size: 12px; color: var(--text-secondary); white-space: pre-wrap;">
              Carregando logs do banco de dados...
            </div>
          </div>
        </section>

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
            <div class="server-info-pair"><span>Usuário</span><strong>${escapeHtml(infra.database.username || 'não informado')}</strong></div>
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

        <section class="card server-panel server-panel-wide card-collapsible collapsed" id="supabase-map-card">
          <div class="card-header" onclick="toggleCard('supabase-map-card')" style="cursor: pointer;">
            <span class="card-title">Mapa simples das tabelas do Supabase</span>
            <button class="collapse-btn">▼</button>
          </div>
          <div class="card-body">
            <p style="margin: 0 0 14px; color: var(--text-secondary); font-size: 13px;">
              Esta leitura vem direto do banco. Quando uma tabela nova for criada e a aplicacao tiver permissao para enxerga-la, ela aparece aqui automaticamente.
            </p>
            <div class="server-warning-list">
              ${renderDatabaseTableMap(infra.databaseTables || [])}
            </div>
          </div>
        </section>

        <section class="card server-panel server-panel-wide">
          <div class="card-header">
            <span class="card-title">Riscos e observações</span>
          </div>
          <div class="card-body">
            ${renderWarningList(infra.warnings || [])}
          </div>
        </section>
      </div>
    `;

    startSqlLogsPolling();
  } catch (err) {
    container.innerHTML = buildEmptyState('Falha ao carregar infraestrutura', err.message);
    showToast(`Erro ao carregar infraestrutura: ${err.message}`, 'error');
  }
}

function startSqlLogsPolling() {
  const fetchLogs = async () => {
    try {
      let logs = await apiGet('/infra/sql-logs');
      const container = document.getElementById('live-sql-logs');
      if (!container) return;

      if (!window.showSqlSelects) {
        logs = logs.filter(log => !log.sql.toLowerCase().startsWith('select'));
      }

      if (logs.length === 0) {
        container.innerHTML = '<div style="color: var(--text-tertiary)">Nenhuma query SQL registrada (ou os SELECTs estão ocultos).</div>';
        return;
      }

      container.innerHTML = logs.map(log => {
        let highlightedSql = escapeHtml(log.sql);
        
        // Remove os placeholders '?' e limpa as vírgulas/espaços que sobram
        highlightedSql = highlightedSql.replace(/\?/g, '');
        highlightedSql = highlightedSql.replace(/,\s*,/g, ',');
        highlightedSql = highlightedSql.replace(/\(\s*,/g, '(');
        highlightedSql = highlightedSql.replace(/,\s*\)/g, ')');
        highlightedSql = highlightedSql.replace(/\(\s+\)/g, '(...)');
        highlightedSql = highlightedSql.replace(/=\s*([^\w])/g, '$1');

        // Adiciona quebra de linha com recuo antes de palavras-chave principais
        highlightedSql = highlightedSql.replace(
          /\s(from|where|left outer join|inner join|right join|order by|group by|having|limit|offset|values|set)/gi,
          match => `<br>&nbsp;&nbsp;${match.trim()}`
        );

        // Destaca as palavras-chave
        highlightedSql = highlightedSql.replace(
          /\b(select|insert|update|delete|from|where|and|or|join|inner|left|right|outer|on|group by|order by|asc|desc|limit|offset|set|values|into|create|alter|drop|table|index)\b/gi,
          match => `<strong style="color: #10b981; text-transform: uppercase;">${match.toUpperCase()}</strong>`
        );

        return `<div style="margin-bottom: 2px; padding-bottom: 2px; border-bottom: 1px dotted var(--border-color); font-size: 11px; line-height: 1.1;">
          <span style="color: var(--text-accent); font-weight: bold; opacity: 0.8; margin-right: 6px;">[${escapeHtml(log.timestamp)}]</span>
          <span style="color: var(--text-primary);">${highlightedSql}</span>
        </div>`;
      }).join('');
    } catch (e) {
      console.error('Falha ao buscar logs SQL', e);
    }
  };

  fetchLogs(); // run immediately
  window.sqlLogsInterval = setInterval(fetchLogs, 2000); // refresh every 2s
}

function normalizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username || '',
    role: user.perfil || user.role || '',
    name: user.nome || user.name || user.username || '',
    ativo: user.ativo
  };
}

function getCurrentUser() {
  const username = sessionStorage.getItem('authUserA3') || '';
  const role = sessionStorage.getItem('authRoleA3') || '';
  const name = sessionStorage.getItem('authNameA3') || '';
  const id = sessionStorage.getItem('authUserIdA3') || '';
  return { id, username, role, name };
}

function setCurrentUser(user) {
  const normalized = normalizeUser(user);
  if (!normalized) return;

  sessionStorage.setItem('authA3', 'true');
  sessionStorage.setItem('authUserIdA3', normalized.id || '');
  sessionStorage.setItem('authUserA3', normalized.username);
  sessionStorage.setItem('authRoleA3', normalized.role);
  sessionStorage.setItem('authNameA3', normalized.name || normalized.username);
}

function clearCurrentUser() {
  sessionStorage.removeItem('authA3');
  sessionStorage.removeItem('authUserIdA3');
  sessionStorage.removeItem('authUserA3');
  sessionStorage.removeItem('authRoleA3');
  sessionStorage.removeItem('authNameA3');
}

function isAuthenticated() {
  return sessionStorage.getItem('authA3') === 'true';
}

function isAdmin() {
  const role = sessionStorage.getItem('authRoleA3') || '';
  return role === 'ADMIN' || role === 'SUPERUSER';
}

function isSuperuser() {
  return (sessionStorage.getItem('authRoleA3') || '') === 'SUPERUSER';
}

function canWriteProducts() {
  return isAuthenticated();
}

function canWriteMovimentacoes() {
  return isAuthenticated();
}

async function handleLogin() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;

  try {
    const authenticatedUser = await apiPost('/auth/login', { username: user, password: pass });
    setCurrentUser(authenticatedUser);
    document.getElementById('login-error').style.display = 'none';

    addAppLog('info', `Login realizado: ${authenticatedUser.username} (${authenticatedUser.perfil})`);

    const loginScreen = document.getElementById('login-screen');
    loginScreen.style.opacity = '0';
    loginScreen.style.transition = '0.5s ease';

    setTimeout(() => {
      window.location.reload();
    }, 500);
  } catch (err) {
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
      errorEl.textContent = err.message || 'Credenciais inválidas ou erro no servidor.';
      errorEl.style.display = 'block';
    }
    addAppLog('warn', `Falha de login para usuario: ${user || '(vazio)'} - Erro: ${err.message}`);
  }
}

async function handleLogout() {
  try {
    await apiPost('/auth/logout', {});
  } catch (err) {
    // Logout local continua mesmo se a sessao ja tiver expirado no backend.
  } finally {
    clearCurrentUser();
    window.location.reload();
  }
}

function applyRoleAccessControl() {
  if (!isAuthenticated()) return;

  const admin = isAdmin();
  const superuser = isSuperuser();

  ['infraestrutura'].forEach(page => {
    const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
    const section = document.getElementById(`page-${page}`);
    if (nav) nav.style.display = admin ? '' : 'none';
    if (section) section.style.display = admin ? '' : 'none';
  });

  ['historico'].forEach(page => {
    const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
    const section = document.getElementById(`page-${page}`);
    if (nav) nav.style.display = isAuthenticated() ? '' : 'none';
    if (section) section.style.display = isAuthenticated() ? '' : 'none';
  });

  ['usuarios'].forEach(page => {
    const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
    const section = document.getElementById(`page-${page}`);
    if (nav) nav.style.display = superuser ? '' : 'none';
    if (section) section.style.display = superuser ? '' : 'none';
  });

  const produtoCreateButton = document.querySelector('#page-produtos .page-header .btn-primary');
  const movimentacaoCreateButton = document.querySelector('#page-movimentacoes .page-header .btn-primary');
  if (produtoCreateButton) produtoCreateButton.style.display = canWriteProducts() ? '' : 'none';
  if (movimentacaoCreateButton) movimentacaoCreateButton.style.display = canWriteMovimentacoes() ? '' : 'none';

  const active = document.querySelector('.page.active');
  const activeId = active?.id || '';
  const blockedAdminPage = !admin && (activeId === 'page-infraestrutura' || activeId === 'page-historico');
  const blockedSuperuserPage = !superuser && activeId === 'page-usuarios';
  if (blockedAdminPage || blockedSuperuserPage) {
    navigateTo('dashboard');
  }
}

async function syncSessionFromBackend() {
  try {
    const user = await apiGet('/auth/me');
    setCurrentUser(user);

    const loginScreen = document.getElementById('login-screen');
    const secureApp = document.getElementById('secure-app');
    if (loginScreen) loginScreen.style.display = 'none';
    if (secureApp) secureApp.style.display = '';

    return true;
  } catch (err) {
    clearCurrentUser();
    return false;
  }
}

async function initializeAuthenticatedApp() {
  const authenticated = await syncSessionFromBackend();
  if (!authenticated) {
    const loginScreen = document.getElementById('login-screen');
    const secureApp = document.getElementById('secure-app');
    if (loginScreen) loginScreen.style.display = '';
    if (secureApp) secureApp.style.display = 'none';
    return;
  }

  applyRoleAccessControl();
  loadDashboard();
  checkSystemHealth();
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
    addAppLog('error', 'Sem conexão com o servidor backend.');
  }
}


// --- CLIENTES (CRM) ---
async function loadClientes() {
  const tbody = document.getElementById('clientes-table-body');
  const countEl = document.getElementById('clientes-count');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" class="text-center">Carregando clientes...</td></tr>';

  try {
    const clientes = await apiGet('/clientes');
    countEl.textContent = `${clientes.length} cadastros`;
    renderClientes(clientes);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro: ${err.message}</td></tr>`;
  }
}

function renderClientes(clientes) {
  const tbody = document.getElementById('clientes-table-body');
  if (!tbody) return;

  if (clientes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum cliente cadastrado.</td></tr>';
    return;
  }

  tbody.innerHTML = clientes.map(cli => `
    <tr>
      <td class="td-name">${escapeHtml(cli.nome)}</td>
      <td>${cli.documento || '<span class="muted">N/A</span>'}</td>
      <td>${cli.email || '<span class="muted">N/A</span>'}</td>
      <td>${cli.telefone || '<span class="muted">N/A</span>'}</td>
      <td>
        <div style="display:flex; gap:4px;">
          <button class="btn btn-ghost btn-sm" onclick="openClienteModal(${cli.id})">Editar</button>
          <button class="btn btn-ghost btn-sm text-danger" onclick="deleteCliente(${cli.id})">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function openClienteModal(id) {
  const isEdit = Boolean(id);
  const body = `
    <input type="hidden" id="cli-id" value="${id || ''}">
    <div class="form-group">
      <label class="form-label">Nome Completo *</label>
      <input type="text" id="cli-nome" class="form-input" placeholder="João da Silva" maxlength="120">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Documento (CPF/CNPJ)</label>
        <input type="text" id="cli-documento" class="form-input" placeholder="000.000.000-00 ou 00.000.000/0000-00" maxlength="18">
      </div>
      <div class="form-group">
        <label class="form-label">Telefone</label>
        <input type="text" id="cli-telefone" class="form-input" placeholder="(00) 00000-0000" maxlength="20">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">E-mail</label>
      <input type="email" id="cli-email" class="form-input" placeholder="cliente@email.com" maxlength="100">
    </div>
    <div class="form-group">
      <label class="form-label">Endereço</label>
      <input type="text" id="cli-endereco" class="form-input" placeholder="Rua, Número, Bairro, Cidade" maxlength="200">
    </div>
  `;

  const footer = `
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveCliente()">${isEdit ? 'Atualizar' : 'Salvar Cliente'}</button>
  `;

  openModal(isEdit ? 'Editar Cliente' : 'Cadastrar Novo Cliente', body, footer);
  
  // Adicionar máscaras
  const documentoInput = document.getElementById('cli-documento');
  const telInput = document.getElementById('cli-telefone');
  if (documentoInput) documentoInput.addEventListener('input', (e) => applyDocumentoMask(e.target));
  if (telInput) telInput.addEventListener('input', (e) => applyPhoneMask(e.target));

  if (isEdit) {
    try {
      const cli = await apiGet(`/clientes/${id}`);
      document.getElementById('cli-nome').value = cli.nome || '';
      document.getElementById('cli-documento').value = cli.documento || '';
      document.getElementById('cli-telefone').value = cli.telefone || '';
      document.getElementById('cli-email').value = cli.email || '';
      document.getElementById('cli-endereco').value = cli.endereco || '';
    } catch (err) {
      showToast('Erro ao carregar dados do cliente', 'error');
    }
  }
}

async function saveCliente() {
  const id = document.getElementById('cli-id').value;
  const data = {
    nome: document.getElementById('cli-nome').value.trim(),
    documento: document.getElementById('cli-documento').value.trim(),
    telefone: document.getElementById('cli-telefone').value.trim(),
    email: document.getElementById('cli-email').value.trim(),
    endereco: document.getElementById('cli-endereco').value.trim()
  };

  if (!data.nome) {
    showToast('Nome é obrigatório', 'error');
    return;
  }

  if (!data.documento) {
    showToast('Documento é obrigatório', 'error');
    return;
  }

  try {
    if (id) {
      await apiPut(`/clientes/${id}`, data);
      showToast('Cliente atualizado!', 'success');
    } else {
      await apiPost('/clientes', data);
      showToast('Cliente cadastrado!', 'success');
    }
    closeModal();
    loadClientes();
  } catch (err) {
    showToast(`Erro ao salvar: ${err.message}`, 'error');
  }
}

async function deleteCliente(id) {
  if (!confirm('Deseja realmente excluir este cliente?')) return;
  try {
    await apiDelete(`/clientes/${id}`);
    showToast('Cliente removido', 'success');
    loadClientes();
  } catch (err) {
    showToast(`Erro ao excluir: ${err.message}`, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setDefaultDates();
  updateMobilePageTitle('dashboard');
  syncResponsiveLayout();
  renderLogs();
  initializeAuthenticatedApp();
});

window.addEventListener('resize', syncResponsiveLayout);

setInterval(checkSystemHealth, 30000);


document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeModal();
    closeSidebar();
  }
});

// --- SEGURANÇA: TROCA DE SENHA SELF-SERVICE ---
function openChangePasswordModal() {
  const content = `
    <form id="change-password-form" onsubmit="handleChangePassword(event)">
      <div class="form-group">
        <label class="form-label">Senha Atual</label>
        <input type="password" id="senha-atual" class="form-input" required>
      </div>
      <div class="form-group">
        <label class="form-label">Nova Senha</label>
        <input type="password" id="nova-senha" class="form-input" minlength="8" required>
        <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">Mínimo de 8 caracteres.</small>
      </div>
      <div class="form-group">
        <label class="form-label">Confirmar Nova Senha</label>
        <input type="password" id="confirmar-nova-senha" class="form-input" minlength="8" required>
      </div>
    </form>
  `;
  const footer = `
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="document.getElementById('change-password-form').requestSubmit()">Salvar Senha</button>
  `;
  openModal('Trocar Minha Senha', content, footer);
}

async function handleChangePassword(event) {
  event.preventDefault();
  const senhaAtual = document.getElementById('senha-atual').value;
  const novaSenha = document.getElementById('nova-senha').value;
  const confirmarSenha = document.getElementById('confirmar-nova-senha').value;

  if (novaSenha !== confirmarSenha) {
    showToast('A nova senha e a confirmação não coincidem.', 'error');
    return;
  }

  const payload = {
    senhaAtual: senhaAtual,
    novaSenha: novaSenha
  };

  try {
    const btn = document.querySelector('#modal-footer .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
    
    // A API retorna NO_CONTENT (204) então o apiPut já lida com isso.
    await apiPut('/usuarios/me/senha', payload);
    
    showToast('Senha alterada com sucesso! Você será desconectado.', 'success');
    closeModal();
    
    // Força o logout para obrigar o uso da nova senha
    setTimeout(() => {
      handleLogout();
    }, 2000);
  } catch (err) {
    const btn = document.querySelector('#modal-footer .btn-primary');
    if (btn) { btn.disabled = false; btn.textContent = 'Salvar Senha'; }
    showToast(err.message || 'Erro ao alterar a senha.', 'error');
  }
}

// --- UTILITÁRIOS DE MÁSCARA ---
function applyDocumentoMask(input) {
  let value = input.value.replace(/\D/g, '');
  if (value.length > 14) value = value.slice(0, 14);
  
  if (value.length <= 11) {
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{0,3})/, '$1.$2');
    }
  } else {
    value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
    if (value.indexOf('-') === -1) {
      if (value.length > 12) {
        value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})/, '$1.$2.$3/$4-');
      } else if (value.length > 8) {
        value = value.replace(/^(\d{2})(\d{3})(\d{3})/, '$1.$2.$3/');
      } else if (value.length > 5) {
        value = value.replace(/^(\d{2})(\d{3})/, '$1.$2.');
      } else if (value.length > 2) {
        value = value.replace(/^(\d{2})/, '$1.');
      }
    }
  }
  input.value = value;
}

function applyPhoneMask(input) {
  let value = input.value.replace(/\D/g, '');
  if (value.length > 11) value = value.slice(0, 11);
  if (value.length > 10) {
    value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  } else if (value.length > 6) {
    value = value.replace(/^(\d{2})(\d{4,5})(\d{0,4}).*/, '($1) $2-$3');
  } else if (value.length > 2) {
    value = value.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
  } else if (value.length > 0) {
    value = value.replace(/^(\d*)/, '($1');
  }
  input.value = value;
}
