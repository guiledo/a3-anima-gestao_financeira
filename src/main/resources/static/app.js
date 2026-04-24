const API = '/api/v1';
const MOBILE_BREAKPOINT = 768;

window.appLogs = [];
window.currentDashboardData = null;
window.movTypeFilter = null;

const AUTH_STORAGE_KEY = 'a3_users_v1';

function seedUsersIfNeeded() {
  try {
    const existing = localStorage.getItem(AUTH_STORAGE_KEY);
    if (existing) return;

    const seeded = [
      { username: 'a3_admin_2026', password: 'gestaofinanceira2026', role: 'ADMIN', name: 'Admin A3' },
      { username: 'admin_gestao', password: 'a3_gestao_2026', role: 'ADMIN', name: 'Admin Gestão' },

      // Usuário de demonstração (funcionário) para você ver a interface logada
      { username: 'funcionario01', password: '123456', role: 'USER', name: 'Funcionário 01' },

      // Admin simples (opcional)
      { username: 'admin', password: 'admin123', role: 'ADMIN', name: 'Administrador' }
    ];

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(seeded));
  } catch (err) {
    // Se localStorage estiver bloqueado, apenas segue.
  }
}

function getUsers() {
  seedUsersIfNeeded();
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const users = raw ? JSON.parse(raw) : [];
    return Array.isArray(users) ? users : [];
  } catch (err) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  const username = sessionStorage.getItem('authUserA3') || '';
  const role = sessionStorage.getItem('authRoleA3') || '';
  const name = sessionStorage.getItem('authNameA3') || '';
  return { username, role, name };
}

function setCurrentUser(user) {
  sessionStorage.setItem('authA3', 'true');
  sessionStorage.setItem('authUserA3', user.username);
  sessionStorage.setItem('authRoleA3', user.role);
  sessionStorage.setItem('authNameA3', user.name || user.username);
}

function clearCurrentUser() {
  sessionStorage.removeItem('authA3');
  sessionStorage.removeItem('authUserA3');
  sessionStorage.removeItem('authRoleA3');
  sessionStorage.removeItem('authNameA3');
}

function isAdmin() {
  return (sessionStorage.getItem('authRoleA3') || '') === 'ADMIN';
}

function applyRoleAccessControl() {
  // Se não estiver autenticado, não precisa ajustar UI
  if (sessionStorage.getItem('authA3') !== 'true') return;

  // Restrições: usuários (funcionários) não podem ver/criar usuários, nem acessar Infraestrutura e Histórico
  const admin = isAdmin();

  const pagesToRestrict = ['infraestrutura', 'historico', 'usuarios'];

  pagesToRestrict.forEach(page => {
    const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
    const section = document.getElementById(`page-${page}`);

    if (!admin) {
      if (nav) nav.style.display = 'none';
      if (section) section.style.display = 'none';
    } else {
      if (nav) nav.style.display = '';
      if (section) section.style.display = '';
    }
  });

  // Se usuário não-admin estiver numa página restrita (ex: estado anterior), manda pro dashboard
  if (!admin) {
    const active = document.querySelector('.page.active');
    const activeId = active?.id || '';
    if (activeId === 'page-infraestrutura' || activeId === 'page-historico' || activeId === 'page-usuarios') {
      navigateTo('dashboard');
    }
  }
}

function handleLogin() {
  seedUsersIfNeeded();

  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;

  const users = getUsers();
  const found = users.find(u => u.username === user && u.password === pass);

  if (found) {
    setCurrentUser(found);
    document.getElementById('login-error').style.display = 'none';

    addAppLog('info', `Login realizado: ${found.username} (${found.role})`);

    // Animate exit
    const loginScreen = document.getElementById('login-screen');
    loginScreen.style.opacity = '0';
    loginScreen.style.transition = '0.5s ease';

    setTimeout(() => {
      window.location.reload();
    }, 500);

  } else {
    document.getElementById('login-error').style.display = 'block';
    addAppLog('warn', `Falha de login para usuário: ${user || '(vazio)'}`);
  }
}

function handleLogout() {
  clearCurrentUser();
  window.location.reload();
}

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
    infraestrutura: 'Ferramentas do Desenvolvedor',
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

function navigateTo(page) {
  if (window.sqlLogsInterval) {
    clearInterval(window.sqlLogsInterval);
    window.sqlLogsInterval = null;
  }

  try { 
    const cu = getCurrentUser(); 
    if (cu.username) addAppLog('info', `Navegação: ${page} por ${cu.username}`); 
  } catch(e) {}

  const restrictedForUsers = ['infraestrutura', 'historico', 'usuarios'];
  if (sessionStorage.getItem('authA3') === 'true' && !isAdmin() && restrictedForUsers.includes(page)) {
    showToast('Acesso restrito para funcionários.', 'error');
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

  if (page === 'dashboard') loadDashboard();
  if (page === 'produtos') loadProdutos();
  if (page === 'movimentacoes') loadMovimentacoes();
  if (page === 'historico') loadHistorico();
  if (page === 'infraestrutura') loadInfraestrutura();
  if (page === 'usuarios') loadUsuarios();
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

      return `
        <div class="timeline-item">
          <div class="timeline-icon ${iconClass}">${symbol}</div>
          <div class="timeline-content" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.2s;" onmouseenter="this.style.borderColor='var(--border-hover)'" onmouseleave="this.style.borderColor='var(--border)'">
            <div style="flex: 1;">
              <div class="timeline-date">${formatDate(movimentacao.data)} &bull; ${escapeHtml(movimentacao.categoria)}</div>
              <div class="timeline-title">${escapeHtml(movimentacao.descricao)}</div>
              <div class="timeline-details">
                Cliente: <b>${escapeHtml(movimentacao.cliente)}</b> &nbsp;|&nbsp; 
                ${escapeHtml(formatTipoPagamento(movimentacao.tipoPagamento))} 
                (${escapeHtml(formatParcelas(movimentacao.quantidadeParcelas, movimentacao.valor))})
              </div>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
              <strong class="${colorClass}" style="font-size: 16px;">${formatCurrency(movimentacao.valor)}</strong>
              <div style="display: flex; gap: 4px;">
                <button class="btn btn-ghost btn-sm" onclick="openMovimentacaoModal(${movimentacao.id})" style="padding: 4px 8px; font-size: 11px;">Editar</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteMovimentacao(${movimentacao.id})" style="padding: 4px 8px; font-size: 11px; color: var(--accent-danger);">Excluir</button>
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
          <option value="SAIDA">Saída</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Cliente</label>
        <input type="text" id="mov-cliente" class="form-input" placeholder="Ex: Cliente XPTO" maxlength="120">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <input type="text" id="mov-descricao" class="form-input" placeholder="Ex: Venda do dia" maxlength="160">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Valor (R$)</label>
        <input type="number" id="mov-valor" class="form-input" step="0.01" min="0" placeholder="0.00" oninput="updateMovimentacaoParcelaPreview()">
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
      .catch(err => showToast(`Erro ao carregar movimentação: ${err.message}`, 'error'));
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
    showToast('Preencha todos os campos obrigatórios', 'error');
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
    loadDashboard();
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
  }
}

async function deleteMovimentacao(id) {
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

document.addEventListener('DOMContentLoaded', () => {
  seedUsersIfNeeded();
  applyRoleAccessControl();
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
