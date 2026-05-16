const API = '/api/v1';
const MOBILE_BREAKPOINT = 768;

window.appLogs = [];
window.currentDashboardData = null;
window.movTypeFilter = null;

// --- UI UTILS ---
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
    infraestrutura: 'Gestão de Infra (Supabase)',
    usuarios: 'Gestão de Acessos'
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

  // Restrição de Acesso no Front-end
  const restrictedForNonSuper = ['infraestrutura', 'usuarios'];
  if (isAuthenticated() && !isSuperuser() && restrictedForNonSuper.includes(page)) {
    showToast('Acesso exclusivo ao Superusuário.', 'error');
    return;
  }

  document.querySelectorAll('.page').forEach(node => node.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(node => node.classList.remove('active'));

  document.getElementById(`page-${page}`)?.classList.add('active');
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

  updateMobilePageTitle(page);
  if (isMobileView()) closeSidebar();

  if (page !== 'movimentacoes') {
    window.movTypeFilter = null;
  }

  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'produtos': loadProdutos(); break;
    case 'clientes': loadClientes(); break;
    case 'movimentacoes': loadMovimentacoes(); break;
    case 'relatorios': loadRelatoriosPage(); break;
    case 'historico': loadHistorico(); break;
    case 'infraestrutura': loadInfraestrutura(); break;
    case 'usuarios': loadUsuarios(); break;
  }
}

function navigateToMovimentacoesWithFilter(type) {
  window.movTypeFilter = type;
  navigateTo('movimentacoes');
}

// --- APP UTILS ---
function addAppLog(type, message) {
  const time = new Date().toLocaleTimeString('pt-BR');
  window.appLogs.unshift({ time, type, message });
  if (window.appLogs.length > 100) window.appLogs.pop();
  renderLogs();
}

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

async function apiGet(path) { return apiRequest(path); }
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
async function apiDelete(path) { return apiRequest(path, { method: 'DELETE' }); }

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}
function formatTipoPagamento(tipo) {
  if (tipo === 'PARCELADO') return 'Parcelado';
  if (tipo === 'AVISTA') return 'À vista';
  return '-';
}
function formatParcelas(qtd, total = 0) {
  const n = Math.max(Number(qtd) || 1, 1);
  const v = Number(total) || 0;
  if (n === 1) return v > 0 ? `1 parcela de ${formatCurrency(v)}` : '1 parcela única';
  return v > 0 ? `${n}x de ${formatCurrency(v / n)}` : `${n} parcelas`;
}

function updateMovimentacaoParcelaPreview() {
  const preview = document.getElementById('mov-parcelas-preview');
  const tipo = document.getElementById('mov-tipo-pagamento');
  const qtd = document.getElementById('mov-quantidade-parcelas');
  const valor = document.getElementById('mov-valor');
  if (!preview || !tipo || !qtd || !valor) return;

  const n = Math.max(parseInt(qtd.value, 10) || 1, 1);
  const total = parseFloat(valor.value) || 0;

  if (tipo.value === 'AVISTA' || n === 1) {
    preview.textContent = total > 0 ? `Parcela única de ${formatCurrency(total)}.` : 'Pagamento em parcela única.';
    return;
  }
  preview.textContent = total > 0 ? `${n} parcelas de ${formatCurrency(total / n)}.` : `${n} parcelas. Informe o valor para calcular.`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}
function buildAbsoluteUrl(path = '') {
  const origin = window.location.origin.replace(/\/$/, '');
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

// --- DASHBOARD ---
async function loadDashboard() {
  const grid = document.getElementById('kpi-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Carregando resumo...</div>';
  try {
    const data = await apiGet('/dashboard/resumo');
    const saldo = data.saldoAtual || 0;
    const saldoColor = saldo >= 0 ? 'emerald' : 'red';
    window.currentDashboardData = { ...data, saldoAtual: saldo };

    grid.innerHTML = `
      <div class="kpi-card" data-color="emerald" data-action="filter-mov" data-type="VENDA">
        <div class="kpi-label">📈 Total Vendas</div>
        <div class="kpi-value text-success">${formatCurrency(data.totalEntradas)}</div>
        <div class="kpi-hint">↗ Ver vendas</div>
      </div>
      <div class="kpi-card" data-color="red" data-action="filter-mov" data-type="COMPRA">
        <div class="kpi-label">📉 Total Compras</div>
        <div class="kpi-value text-danger">${formatCurrency(data.totalSaidas)}</div>
        <div class="kpi-hint">↗ Ver compras</div>
      </div>
      <div class="kpi-card" data-color="${saldoColor}" data-action="show-saldo">
        <div class="kpi-label">💰 Saldo Atual</div>
        <div class="kpi-value ${saldo >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(saldo)}</div>
        <div class="kpi-hint">↗ Ver balanço</div>
      </div>
      <div class="kpi-card" data-color="indigo" data-action="show-produtos">
        <div class="kpi-label">📦 Produtos Ativos</div>
        <div class="kpi-value">${data.totalProdutosAtivos ?? 0}</div>
        <div class="kpi-hint">↗ Ver produtos</div>
      </div>
      <div class="kpi-card" data-color="amber" data-action="show-produtos">
        <div class="kpi-label">📦 Total em Estoque</div>
        <div class="kpi-value">${data.totalItensEmEstoque ?? 0}</div>
        <div class="kpi-hint">↗ Soma de todos os itens</div>
      </div>
    `;

    grid.querySelectorAll('.kpi-card').forEach(card => {
      card.addEventListener('click', () => {
        const { action, type } = card.dataset;
        if (action === 'filter-mov') navigateToMovimentacoesWithFilter(type);
        else if (action === 'show-saldo') showSaldoDrilldown();
        else if (action === 'show-produtos') showProdutosDrilldown();
      });
    });

    renderDashboardCharts(data);
    checkEstoqueBaixo();
  } catch (err) {
    grid.innerHTML = buildEmptyState('Erro ao carregar dashboard', err.message);
  }
}

async function checkEstoqueBaixo() {
  if (typeof isAdmin !== 'function' || !isAdmin()) return;

  const bell = document.getElementById('notification-bell');
  if (bell) bell.style.display = 'block'; // Mostra o sininho para admins

  try {
    const produtos = await apiGet('/produtos');
    const esgotados = produtos.filter(p => p.estoque === 0 && p.ativo);

    const badge = document.getElementById('notification-badge');
    if (badge) {
      if (esgotados.length > 0) {
        badge.textContent = esgotados.length;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }

    window.esgotados = esgotados;

    if (esgotados.length > 0) {
      const msg = `⚠️ Aviso de Estoque: Você tem ${esgotados.length} produto(s) com estoque ZERADO! Lembre-se de solicitar reposição.`;
      showToast(msg, 'error');
    }
  } catch (err) {
    console.error('Erro ao verificar estoque baixo', err);
  }
}

window.showNotifications = function () {
  try {
    if (typeof isAdmin !== 'function' || !isAdmin()) {
      showToast('Acesso negado', 'error');
      return;
    }
    const esgotados = window.esgotados || [];
    let html = '';
    if (esgotados.length === 0) {
      html = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">Nenhum aviso no momento. Tudo certo com o estoque!</div>';
    } else {
      html = `
        <div style="padding: 10px;">
          <h4 style="color: var(--accent-danger); margin-bottom: 10px;">⚠️ Produtos Zerados (${esgotados.length})</h4>
          <ul style="list-style: none; padding: 0; margin: 0; max-height: 250px; overflow-y: auto;">
            ${esgotados.map(p => `
              <li style="padding: 10px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                <span><strong>${escapeHtml(p?.nome || 'Desconhecido')}</strong> <small>(${escapeHtml(p?.categoria || '')})</small></span>
                <span class="badge badge-danger">ESTOQUE 0</span>
              </li>
            `).join('')}
          </ul>
          <div style="margin-top: 15px; text-align: right;">
            <button class="btn btn-primary" onclick="navigateTo('produtos'); closeModal();">Ir para Produtos</button>
          </div>
        </div>
      `;
    }
    openModal('Central de Avisos', html, '<button class="btn btn-ghost" onclick="closeModal()">Fechar</button>');
  } catch (e) {
    console.error("Erro ao abrir notificações:", e);
    alert("Erro interno ao abrir o aviso: " + e.message);
  }
}

async function showSaldoDrilldown() {
  const d = window.currentDashboardData;
  if (!d) return;
  const html = `
    <div style="display: grid; gap: 16px;">
      <div class="card" style="padding: 16px; background: rgba(52, 211, 153, 0.05); border-color: var(--accent-success);">
        <div style="font-size: 12px; color: var(--text-muted);">TOTAL VENDAS</div>
        <div style="font-size: 20px; font-weight: 800; color: var(--accent-success);">${formatCurrency(d.totalEntradas)}</div>
      </div>
      <div class="card" style="padding: 16px; background: rgba(248, 113, 113, 0.05); border-color: var(--accent-danger);">
        <div style="font-size: 12px; color: var(--text-muted);">TOTAL COMPRAS</div>
        <div style="font-size: 20px; font-weight: 800; color: var(--accent-danger);">${formatCurrency(d.totalSaidas)}</div>
      </div>
      <div style="text-align: center; padding-top: 8px; border-top: 1px solid var(--border);">
        <div style="font-size: 14px; color: var(--text-secondary);">SALDO FINAL</div>
        <div style="font-size: 28px; font-weight: 800; color: ${d.saldoAtual >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}">${formatCurrency(d.saldoAtual)}</div>
      </div>
    </div>
  `;
  openModal('Balanço Geral', html, '<button class="btn btn-primary" onclick="closeModal()">Fechar</button>');
}

async function showProdutosDrilldown() {
  openModal('Resumo do Catálogo', '<div class="loading-overlay">Carregando...</div>', '');
  try {
    const produtos = await apiGet('/produtos');
    const html = `
      <div class="table-wrapper">
        <table style="width: 100%;">
          <thead><tr><th>Produto</th><th>Preço</th><th>Estoque</th></tr></thead>
          <tbody>
            ${produtos.slice(0, 30).map(p => `
              <tr>
                <td><b>${escapeHtml(p.nome)}</b><br><small>${escapeHtml(p.categoria)}</small></td>
                <td>${formatCurrency(p.preco)}</td>
                <td><span class="badge ${p.estoque < 5 ? 'badge-danger' : 'badge-neutral'}">${p.estoque}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-footer').innerHTML = '<button class="btn btn-primary" onclick="closeModal()">Fechar</button>';
  } catch (err) { document.getElementById('modal-body').innerHTML = 'Erro ao carregar.'; }
}

let chartInstances = {};
async function renderDashboardCharts(dashData) {
  if (typeof Chart === 'undefined') return;

  // Gráfico Doughnut (Balanço Atual)
  const ctxBalance = document.getElementById('balanceChart');
  if (ctxBalance) {
    if (chartInstances['balance']) chartInstances['balance'].destroy();
    chartInstances['balance'] = new Chart(ctxBalance, {
      type: 'doughnut',
      data: {
        labels: ['Vendas', 'Compras'],
        datasets: [{
          data: [dashData.totalEntradas || 0, dashData.totalSaidas || 0],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: { cutout: '70%', plugins: { legend: { position: 'bottom' } } }
    });
  }

  // Gráfico Line (Evolução Financeira)
  const ctxFinancial = document.getElementById('financialChart');
  if (ctxFinancial) {
    if (chartInstances['financial']) chartInstances['financial'].destroy();

    const filterVal = document.getElementById('chartMonthSelect')?.value || '7days';
    let labels = [];
    let dataEntradas = [];
    let dataSaidas = [];

    if (filterVal === '7days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
      }
      dataEntradas = [0, 0, 0, 0, 0, 0, dashData.totalEntradas || 0];
      dataSaidas = [0, 0, 0, 0, 0, 0, dashData.totalSaidas || 0];
    } else {
      try {
        const movs = await apiGet('/movimentacoes');
        const monthsAgo = parseInt(filterVal);
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() - monthsAgo);
        const targetMonth = targetDate.getMonth();
        const targetYear = targetDate.getFullYear();

        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
          labels.push(`${String(i).padStart(2, '0')}/${String(targetMonth + 1).padStart(2, '0')}`);
          dataEntradas.push(0);
          dataSaidas.push(0);
        }

        movs.forEach(m => {
          if (!m.data) return;
          const [year, month, day] = m.data.split('-');
          if (parseInt(year) === targetYear && parseInt(month) - 1 === targetMonth) {
            const dayIdx = parseInt(day) - 1;
            if (m.tipo === 'VENDA') dataEntradas[dayIdx] += m.valor;
            if (m.tipo === 'COMPRA') dataSaidas[dayIdx] += m.valor;
          }
        });
      } catch (err) {
        console.error('Erro ao buscar movs para grafico', err);
      }
    }

    chartInstances['financial'] = new Chart(ctxFinancial, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Receitas',
            data: dataEntradas,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Despesas',
            data: dataSaidas,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            display: true,
            ticks: {
              callback: function (value) {
                return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value);
              }
            }
          },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

// --- PRODUTOS ---
async function loadProdutos() {
  const tbody = document.getElementById('produtos-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8">Carregando...</td></tr>';
  try {
    let produtos = await apiGet('/produtos');
    // Todos os produtos (ativos e inativos) serão exibidos para permitir reativação

    document.getElementById('produtos-count').textContent = `${produtos.length} itens`;
    const btnNovo = document.getElementById('btn-novo-produto');
    if (btnNovo) btnNovo.style.display = isAdmin() ? 'inline-block' : 'none';

    tbody.innerHTML = produtos.map(p => `
      <tr>
        <td>#${p.id}</td>
        <td><b>${escapeHtml(p.nome)}</b></td>
        <td>${escapeHtml(p.categoria)}</td>
        <td>${formatCurrency(p.custo)}</td>
        <td>${formatCurrency(p.preco)}</td>
        <td>${p.estoque}</td>
        <td><span class="badge ${p.ativo ? 'badge-success' : 'badge-danger'}">${p.ativo ? 'ATIVO' : 'INATIVO'}</span></td>
        <td style="text-align:right">
          ${isAdmin() ? `
          <div style="display:flex; gap:4px; justify-content:flex-end;">
            <button class="btn btn-ghost btn-sm" onclick="openProdutoModal(${p.id})">Editar</button>
            <button class="btn btn-ghost btn-sm text-danger" onclick="deleteProduto(${p.id})">Excluir</button>
          </div>
          ` : `
          <div style="display:flex; gap:4px; justify-content:flex-end;">
             <span class="badge badge-neutral" style="opacity:0.7">Apenas Visualização</span>
          </div>
          `}
        </td>
      </tr>
    `).join('');
  } catch (err) { tbody.innerHTML = 'Erro ao carregar.'; }
}

function openProdutoModal(id) {
  const isEdit = !!id;
  const body = `
    <input type="hidden" id="prod-id" value="${id || ''}">
    <div class="form-group"><label class="form-label">Nome</label><input type="text" id="prod-nome" class="form-input"></div>
    <div class="form-group"><label class="form-label">Categoria</label><input type="text" id="prod-categoria" class="form-input"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Custo</label><input type="number" id="prod-custo" class="form-input" step="0.01"></div>
      <div class="form-group"><label class="form-label">Preço</label><input type="number" id="prod-preco" class="form-input" step="0.01"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Estoque</label><input type="number" id="prod-estoque" class="form-input"></div>
      <div class="form-group"><label class="form-label">Ativo</label><select id="prod-ativo" class="form-select"><option value="true">Sim</option><option value="false">Não</option></select></div>
    </div>
  `;
  openModal(isEdit ? 'Editar Produto' : 'Novo Produto', body, `<button class="btn btn-primary" onclick="saveProduto()">Salvar</button>`);
  if (isEdit) {
    apiGet(`/produtos/${id}`).then(p => {
      document.getElementById('prod-nome').value = p.nome;
      document.getElementById('prod-categoria').value = p.categoria;
      document.getElementById('prod-custo').value = p.custo;
      document.getElementById('prod-preco').value = p.preco;
      document.getElementById('prod-estoque').value = p.estoque;
      document.getElementById('prod-ativo').value = String(p.ativo);
    });
  }
}

async function saveProduto() {
  const id = document.getElementById('prod-id').value;
  const data = {
    nome: document.getElementById('prod-nome').value,
    categoria: document.getElementById('prod-categoria').value,
    custo: parseFloat(document.getElementById('prod-custo').value) || 0,
    preco: parseFloat(document.getElementById('prod-preco').value) || 0,
    estoque: parseInt(document.getElementById('prod-estoque').value) || 0,
    ativo: document.getElementById('prod-ativo').value === 'true'
  };
  try {
    if (id) await apiPut(`/produtos/${id}`, data);
    else await apiPost('/produtos', data);
    closeModal(); loadProdutos(); loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteProduto(id) {
  if (!confirm('Tem certeza que deseja excluir este produto?')) return;
  try {
    await apiDelete(`/produtos/${id}`);
    showToast('Produto desativado com sucesso.', 'success');
    loadProdutos();
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- MOVIMENTACOES ---
async function loadMovimentacoes() {
  const tbody = document.getElementById('movimentacoes-tbody');
  if (!tbody) return;
  tbody.innerHTML = 'Carregando...';
  try {
    let movs = await apiGet('/movimentacoes');
    if (window.movTypeFilter) movs = movs.filter(m => m.tipo === window.movTypeFilter);
    movs.sort((a, b) => b.id - a.id);
    tbody.innerHTML = movs.map(m => `
      <div class="timeline-item">
        <div class="timeline-icon ${m.tipo.toLowerCase()}">${m.tipo === 'VENDA' ? '+' : '-'}</div>
        <div class="timeline-content" style="border: 1px solid var(--border); padding: 12px; border-radius: 8px;">
          <div style="display:flex; justify-content:space-between;">
            <div>
              <div class="timeline-date">${formatDate(m.data)} &bull; ${escapeHtml(m.categoria)}</div>
              <div class="timeline-title">${escapeHtml(m.descricao)}</div>
              <small>Cliente: ${escapeHtml(m.cliente)} | Vendedor: ${escapeHtml(m.vendedorNome || 'Sistema')}</small>
            </div>
            <div style="text-align:right">
              <strong class="${m.tipo === 'VENDA' ? 'text-success' : 'text-danger'}">${formatCurrency(m.valor)}</strong>
              <br>
              ${isAdmin() ? `<button class="btn btn-ghost btn-sm" onclick="deleteMovimentacao(${m.id})">Excluir</button>` : ''}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) { tbody.innerHTML = 'Erro ao carregar.'; }
}

async function openMovimentacaoModal() {
  // Carrega produtos ativos do catálogo
  let produtos = [];
  try { produtos = (await apiGet('/produtos')).filter(p => p.ativo !== false); } catch (e) { }
  window.produtosAtivosCache = produtos;

  // Carrega clientes cadastrados
  let clientes = [];
  try { clientes = await apiGet('/clientes'); } catch (e) { }

  window.updateProdutoOptions = function() {
    const tipo = document.getElementById('mov-tipo')?.value || 'VENDA';
    const select = document.getElementById('mov-produto');
    if (!select) return;
    
    let html = '<option value="">-- Nenhum (sem vínculo de produto) --</option>';
    
    if (Array.isArray(window.produtosAtivosCache)) {
      window.produtosAtivosCache.forEach(p => {
        const estoqueVal = parseInt(p.estoque) || 0;
        if (tipo === 'COMPRA' || estoqueVal > 0) {
          const precoStr = parseFloat(p.preco || 0).toFixed(2);
          const nomeStr = escapeHtml(p.nome || 'Produto');
          const catStr = escapeHtml(p.categoria || '');
          html += '<option value="' + p.id + '" data-preco="' + (p.preco || 0) + '" data-categoria="' + catStr + '" data-nome="' + nomeStr + '" data-estoque="' + estoqueVal + '">' + nomeStr + ' (Estoque: ' + estoqueVal + ' | R$ ' + precoStr + ')</option>';
        }
      });
    }
    select.innerHTML = html;
  };

  // Opções de clientes: somente os cadastrados no sistema
  const clienteOptions = `<option value="">-- Selecione o cliente/fornecedor --</option>` +
    clientes.map(c => `<option value="${c.id}" data-nome="${escapeHtml(c.nome)}">${escapeHtml(c.nome)}${c.documento ? ' (' + escapeHtml(c.documento) + ')' : ''}</option>`).join('');

  const semClientes = clientes.length === 0
    ? `<small style="color:var(--accent-danger);display:block;margin-top:6px;">⚠️ Nenhum cliente cadastrado. Vá em <b>Clientes</b> e cadastre primeiro.</small>`
    : '';

  const isUserVendedor = !isAdmin();
  const tipoOptions = isUserVendedor 
    ? `<option value="VENDA">Venda</option>` 
    : `<option value="VENDA">Venda</option><option value="COMPRA">Compra</option>`;

  const body = `
    <div class="form-group">
      <label class="form-label">Tipo</label>
      <select id="mov-tipo" class="form-select" onchange="window.updateProdutoOptions()">
        ${tipoOptions}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Produto <small style="color:var(--text-muted)">(opcional - selecione para preencher automaticamente)</small></label>
      <select id="mov-produto" class="form-select" onchange="onProdutoMovChange()"></select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Quantidade</label>
        <input type="number" id="mov-quantidade" class="form-input" value="1" min="1" oninput="onQtdMovChange()">
      </div>
      <div class="form-group">
        <label class="form-label">Valor Total (R$)</label>
        <input type="number" id="mov-valor" class="form-input" step="0.01" placeholder="0.00">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Cliente / Fornecedor</label>
      <select id="mov-cliente-select" class="form-select">${clienteOptions}</select>
      ${semClientes}
    </div>
    <div class="form-group"><label class="form-label">Descrição</label><input type="text" id="mov-descricao" class="form-input" placeholder="Descrição breve da movimentação"></div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Data</label>
        <input type="date" id="mov-data" class="form-input" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <input type="text" id="mov-categoria" class="form-input" placeholder="Ex: Vendas, Despesas...">
      </div>
    </div>
  `;
  openModal('Nova Movimentação', body, `<button class="btn btn-primary" onclick="saveMovimentacao()">Salvar</button>`);
  window.updateProdutoOptions();
}

function onProdutoMovChange() {
  const sel = document.getElementById('mov-produto');
  const opt = sel.options[sel.selectedIndex];
  const preco = parseFloat(opt.dataset.preco || 0);
  const categoria = opt.dataset.categoria || '';
  const nome = opt.dataset.nome || '';
  const qtd = parseInt(document.getElementById('mov-quantidade').value) || 1;

  if (preco > 0) {
    document.getElementById('mov-valor').value = (preco * qtd).toFixed(2);
  }
  if (categoria) document.getElementById('mov-categoria').value = categoria;
  if (nome) document.getElementById('mov-descricao').value = `Venda de ${nome}`;
}

function onQtdMovChange() {
  const sel = document.getElementById('mov-produto');
  const opt = sel.options[sel.selectedIndex];
  const preco = parseFloat(opt.dataset.preco || 0);
  const qtd = parseInt(document.getElementById('mov-quantidade').value) || 1;
  if (preco > 0) {
    document.getElementById('mov-valor').value = (preco * qtd).toFixed(2);
  }
}



async function saveMovimentacao() {
  const dataVal = document.getElementById('mov-data').value;
  const produtoId = document.getElementById('mov-produto')?.value || null;
  const quantidade = parseInt(document.getElementById('mov-quantidade')?.value) || 1;
  const descricao = document.getElementById('mov-descricao').value.trim();
  const categoria = document.getElementById('mov-categoria').value.trim();
  const valor = parseFloat(document.getElementById('mov-valor').value) || 0;

  // Resolve cliente direto do select
  const clienteSelectEl = document.getElementById('mov-cliente-select');
  const clienteSelectVal = clienteSelectEl?.value || '';
  let clienteNome = '';
  let clienteId = null;

  if (clienteSelectVal && clienteSelectVal !== '') {
    const opt = clienteSelectEl.options[clienteSelectEl.selectedIndex];
    clienteNome = opt.dataset.nome || opt.text.replace(/\s*\(.*\)$/, '').trim();
    clienteId = parseInt(clienteSelectVal);
  }

  if (!clienteNome) { showToast('Selecione o cliente ou fornecedor.', 'error'); return; }
  if (!descricao) { showToast('Informe a descrição.', 'error'); return; }
  if (!categoria) { showToast('Informe a categoria.', 'error'); return; }
  if (valor <= 0) { showToast('Informe um valor válido maior que zero.', 'error'); return; }
  if (!dataVal) { showToast('Informe a data.', 'error'); return; }

  const data = {
    tipo: document.getElementById('mov-tipo').value,
    cliente: clienteNome,
    descricao: descricao,
    valor: valor,
    data: dataVal,
    categoria: categoria,
    tipoPagamento: 'AVISTA',
    quantidadeParcelas: 1,
    dataPrimeiroVencimento: dataVal,
    produtoId: produtoId ? parseInt(produtoId) : null,
    quantidade: quantidade,
    clienteId: clienteId
  };
  try {
    await apiPost('/movimentacoes', data);
    closeModal();
    loadMovimentacoes();
    loadDashboard();
    checkEstoqueBaixo();
    showToast('Movimentação registrada com sucesso!', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteMovimentacao(id) {
  if (!confirm('Deseja excluir?')) return;
  try { await apiDelete(`/movimentacoes/${id}`); loadMovimentacoes(); loadDashboard(); } catch (err) { showToast(err.message, 'error'); }
}

// --- CLIENTES ---
async function loadClientes() {
  const tbody = document.getElementById('clientes-table-body');
  if (!tbody) return;
  try {
    const clientes = await apiGet('/clientes');
    tbody.innerHTML = clientes.map(c => `
      <tr>
        <td>${escapeHtml(c.nome)}</td>
        <td>${c.documento || '-'}</td>
        <td>${c.email || '-'}</td>
        <td>${c.telefone || '-'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="deleteCliente(${c.id})">Excluir</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { tbody.innerHTML = 'Erro ao carregar.'; }
}

function openClienteModal() {
  const body = `
    <div class="form-group"><label class="form-label">Nome</label><input type="text" id="cli-nome" class="form-input"></div>
    <div class="form-group"><label class="form-label">Documento</label><input type="text" id="cli-documento" class="form-input"></div>
    <div class="form-group"><label class="form-label">E-mail</label><input type="email" id="cli-email" class="form-input"></div>
  `;
  openModal('Novo Cliente', body, `<button class="btn btn-primary" onclick="saveCliente()">Salvar</button>`);
}

async function saveCliente() {
  const data = {
    nome: document.getElementById('cli-nome').value,
    documento: document.getElementById('cli-documento').value,
    email: document.getElementById('cli-email').value
  };
  try { await apiPost('/clientes', data); closeModal(); loadClientes(); } catch (err) { showToast(err.message, 'error'); }
}

async function deleteCliente(id) {
  if (!confirm('Deseja excluir?')) return;
  try { await apiDelete(`/clientes/${id}`); loadClientes(); } catch (err) { showToast(err.message, 'error'); }
}

// --- RELATORIOS ---
async function loadRelatoriosPage() {
  // Pré-preencher datas (mês atual)
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
  const inicio = document.getElementById('rel-data-inicio');
  const fim = document.getElementById('rel-data-fim');
  if (inicio && !inicio.value) inicio.value = primeiroDia;
  if (fim && !fim.value) fim.value = ultimoDia;

  const container = document.getElementById('relatorio-financeiro-content');
  if (container) container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📊</div>
      <div class="empty-state-text">Selecione o período e clique em Gerar Relatório</div>
    </div>`;

  await loadRelatorioProdutos();

  // Carregar relatório por vendedor se for gestor
  if (isAdmin()) await loadRelatorioVendedores();
}

async function loadRelatorioFinanceiro() {
  const inicio = document.getElementById('rel-data-inicio').value;
  const fim = document.getElementById('rel-data-fim').value;
  if (!inicio || !fim) { showToast('Selecione o período completo.', 'error'); return; }
  const container = document.getElementById('relatorio-financeiro-content');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Gerando relatório...</div>';
  try {
    const r = await apiGet(`/relatorios/financeiro?dataInicio=${inicio}&dataFim=${fim}`);
    const saldo = r.saldoPeriodo || 0;
    const saldoClass = saldo >= 0 ? 'text-success' : 'text-danger';

    const catEntradasHTML = (r.entradasPorCategoria || []).map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:13px;color:var(--text-secondary);">${escapeHtml(c.categoria)}</span>
        <div style="text-align:right;">
          <span class="text-success" style="font-weight:700;">${formatCurrency(c.valorTotal)}</span>
          <span style="font-size:11px;color:var(--text-muted);margin-left:8px;">${c.quantidade} mov.</span>
        </div>
      </div>`).join('') || '<p style="color:var(--text-muted);font-size:13px;">Nenhuma venda no período.</p>';

    const catSaidasHTML = (r.saidasPorCategoria || []).map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:13px;color:var(--text-secondary);">${escapeHtml(c.categoria)}</span>
        <div style="text-align:right;">
          <span class="text-danger" style="font-weight:700;">${formatCurrency(c.valorTotal)}</span>
          <span style="font-size:11px;color:var(--text-muted);margin-left:8px;">${c.quantidade} mov.</span>
        </div>
      </div>`).join('') || '<p style="color:var(--text-muted);font-size:13px;">Nenhuma compra no período.</p>';

    const clientesHTML = (r.fechamentoPorCliente || []).slice(0, 10).map(fc => `
      <div style="padding:10px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;background:rgba(255,255,255,0.02);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;font-size:13px;color:var(--text-primary);">${escapeHtml(fc.cliente)}</span>
          <span class="text-success" style="font-weight:700;">${formatCurrency(fc.valorDevidoNoPeriodo)}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${fc.quantidadeMovimentacoes} movimentações · Total movimentado: ${formatCurrency(fc.valorTotalMovimentado)}</div>
      </div>`).join('') || '<p style="color:var(--text-muted);font-size:13px;">Nenhum cliente com débito no período.</p>';

    container.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:20px;">
        <div class="kpi-card" data-color="emerald">
          <div class="kpi-label">📈 Total Vendas</div>
          <div class="kpi-value text-success">${formatCurrency(r.totalEntradas)}</div>
          <div class="kpi-hint">Média diária: ${formatCurrency(r.mediaDiariaEntradas)}</div>
        </div>
        <div class="kpi-card" data-color="red">
          <div class="kpi-label">📉 Total Compras</div>
          <div class="kpi-value text-danger">${formatCurrency(r.totalSaidas)}</div>
          <div class="kpi-hint">Média diária: ${formatCurrency(r.mediaDiariaSaidas)}</div>
        </div>
        <div class="kpi-card" data-color="${saldo >= 0 ? 'emerald' : 'red'}">
          <div class="kpi-label">💰 Saldo do Período</div>
          <div class="kpi-value ${saldoClass}">${formatCurrency(saldo)}</div>
          <div class="kpi-hint">${r.quantidadeMovimentacoes || 0} movimentações</div>
        </div>
        <div class="kpi-card" data-color="indigo">
          <div class="kpi-label">👥 Clientes c/ Débito</div>
          <div class="kpi-value">${r.totalClientesComDebito || 0}</div>
          <div class="kpi-hint">Total: ${formatCurrency(r.totalDevidoPorClientesNoPeriodo)}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div class="card" style="padding:18px;">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">📥 Vendas por Categoria</div>
          ${catEntradasHTML}
        </div>
        <div class="card" style="padding:18px;">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">📤 Compras por Categoria</div>
          ${catSaidasHTML}
        </div>
      </div>

      <div class="card" style="padding:18px;">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">👤 Fechamento por Cliente (Top 10)</div>
        ${clientesHTML}
      </div>
    `;

    // Atualiza relatório por vendedor com o mesmo período
    if (isAdmin()) await loadRelatorioVendedores(inicio, fim);

  } catch (err) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Erro ao gerar relatório: ${escapeHtml(err.message)}</div></div>`; }
}

async function loadRelatorioProdutos() {
  const container = document.getElementById('relatorio-produtos-content');
  if (!container) return;
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Carregando...</div>';
  try {
    const r = await apiGet('/relatorios/produtos');
    const catHTML = (r.porCategoria || []).map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
        <div>
          <span style="font-size:13px;color:var(--text-primary);font-weight:600;">${escapeHtml(c.categoria)}</span>
          <span style="font-size:11px;color:var(--text-muted);margin-left:8px;">${c.quantidadeProdutos} skus · ${c.quantidadeItensEstoque} itens</span>
        </div>
        <div style="text-align:right;">
          <span style="font-size:12px;color:var(--text-secondary);">${formatCurrency(c.valorEstoqueVenda)}</span>
        </div>
      </div>`).join('') || '<p style="color:var(--text-muted);">Sem produtos cadastrados.</p>';

    container.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:16px;">
        <div class="kpi-card" data-color="indigo"><div class="kpi-label">📦 Produtos Ativos</div><div class="kpi-value">${r.totalProdutosAtivos}</div></div>
        <div class="kpi-card" data-color="amber"><div class="kpi-label">🗄️ Itens em Estoque</div><div class="kpi-value">${r.totalItensEmEstoque}</div></div>
        <div class="kpi-card" data-color="emerald"><div class="kpi-label">💵 Valor Venda</div><div class="kpi-value text-success">${formatCurrency(r.valorTotalEstoqueVenda)}</div></div>
        <div class="kpi-card" data-color="red"><div class="kpi-label">💸 Valor Custo</div><div class="kpi-value text-danger">${formatCurrency(r.valorTotalEstoqueCusto)}</div></div>
        <div class="kpi-card" data-color="emerald"><div class="kpi-label">📈 Margem Bruta</div><div class="kpi-value text-success">${formatCurrency(r.margemBrutaEstoque)}</div></div>
      </div>
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Por Categoria</div>
      ${catHTML}`;
  } catch (err) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">${escapeHtml(err.message)}</div></div>`; }
}

async function loadRelatorioVendedores(inicio, fim) {
  const container = document.getElementById('relatorio-usuarios-content');
  if (!container || !isAdmin()) return;
  const dataInicio = inicio || document.getElementById('rel-data-inicio')?.value || new Date().toISOString().split('T')[0].slice(0, 7) + '-01';
  const dataFim = fim || document.getElementById('rel-data-fim')?.value || new Date().toISOString().split('T')[0];
  try {
    const vendedores = await apiGet(`/relatorios/financeiro/usuarios?dataInicio=${dataInicio}&dataFim=${dataFim}`);
    if (!vendedores.length) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <div class="card" style="padding:20px;margin-top:16px;">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px;">🏆 Desempenho por Vendedor</div>
        <div style="display:grid;gap:10px;">
          ${vendedores.map((v, i) => `
            <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:10px;background:rgba(255,255,255,0.02);">
              <div style="font-size:18px;font-weight:800;color:var(--text-muted);min-width:28px;">#${i + 1}</div>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:14px;color:var(--text-primary);">${escapeHtml(v.nome || v.username)}</div>
                <div style="font-size:11px;color:var(--text-muted);">@${escapeHtml(v.username)} · ${v.quantidadeMovimentacoes} mov.</div>
              </div>
              <div style="text-align:right;">
                <div class="text-success" style="font-weight:700;">${formatCurrency(v.totalEntradas)}</div>
                <div class="text-danger" style="font-size:12px;">${formatCurrency(v.totalSaidas)}</div>
                <div style="font-size:11px;color:var(--text-muted);">saldo: <span class="${v.saldo >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(v.saldo)}</span></div>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  } catch (e) { container.innerHTML = ''; }
}

// --- HISTORICO & LOGS ---
function switchHistoricoTab(tab) {
  document.getElementById('view-timeline').style.display = tab === 'timeline' ? 'block' : 'none';
  document.getElementById('view-logs').style.display = tab === 'logs' ? 'block' : 'none';
  document.getElementById('btn-tab-timeline').className = tab === 'timeline' ? 'btn btn-primary' : 'btn btn-ghost';
  document.getElementById('btn-tab-logs').className = tab === 'logs' ? 'btn btn-primary' : 'btn btn-ghost';
}
function renderLogs() {
  const consoleEl = document.getElementById('log-console');
  if (!consoleEl) return;
  consoleEl.innerHTML = window.appLogs.map(l => `<div class="log-entry ${l.type}">[${l.time}] ${escapeHtml(l.message)}</div>`).join('');
}
async function loadHistorico() {
  const timeline = document.getElementById('historico-timeline');
  if (!timeline) return;
  timeline.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Carregando histórico...</div>';
  try {
    let movs = await apiGet('/movimentacoes');
    movs.sort((a, b) => b.id - a.id);
    if (!movs.length) {
      timeline.innerHTML = buildEmptyState('Nenhuma movimentação encontrada.', isAdmin() ? 'Aguardando registros de qualquer vendedor.' : 'Você ainda não registrou movimentações.');
      return;
    }
    timeline.innerHTML = movs.map(m => `
      <div class="timeline-item">
        <div class="timeline-icon ${m.tipo.toLowerCase()}">${m.tipo === 'VENDA' ? '+' : '-'}</div>
        <div class="timeline-content" style="border:1px solid var(--border);padding:14px;border-radius:10px;flex:1;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <div class="timeline-date">${formatDate(m.data)} &bull; <span class="badge ${m.tipo === 'VENDA' ? 'badge-success' : 'badge-danger'}">${m.tipo}</span></div>
              <div class="timeline-title" style="margin-top:4px;">${escapeHtml(m.descricao)}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
                👤 <b>${escapeHtml(m.vendedorNome || m.vendedorUsername || 'Sistema')}</b>
                ${m.cliente ? ` &bull; 🧑‍💼 ${escapeHtml(m.cliente)}` : ''}
                ${m.categoria ? ` &bull; 🏷️ ${escapeHtml(m.categoria)}` : ''}
                ${m.produtoNome ? ` &bull; 📦 ${escapeHtml(m.produtoNome)} (×${m.quantidade || 1})` : ''}
              </div>
            </div>
            <div style="text-align:right;">
              <strong class="${m.tipo === 'VENDA' ? 'text-success' : 'text-danger'}" style="font-size:16px;">${formatCurrency(m.valor)}</strong>
              <br>
              ${isAdmin() ? `<button class="btn btn-ghost btn-sm" style="margin-top:4px;" onclick="deleteMovimentacao(${m.id})">Excluir</button>` : ''}
            </div>
          </div>
        </div>
      </div>`).join('');
  } catch (err) {
    timeline.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Erro: ${escapeHtml(err.message)}</div></div>`;
  }
}

// --- USUARIOS ---
async function loadUsuarios() {
  const container = document.getElementById('usuarios-list');
  if (!container) return;

  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Carregando usuários...</div>';

  try {
    const users = await apiGet('/usuarios');

    if (!users.length) {
      container.innerHTML = buildEmptyState('Nenhum usuário cadastrado.');
      return;
    }

    container.innerHTML = users.map(u => {
      const role = u.perfil || 'USER';
      const currentUser = getCurrentUser();
      const isLoggedUser = String(u.id) === String(currentUser.id) || u.username === currentUser.username;
      const safeName = escapeHtml(u.nome || '');
      const safeUser = escapeHtml(u.username || '');
      const roleLabel = role === 'SUPERUSER' ? 'SUPERUSER' : role === 'ADMIN' ? 'ADMIN' : 'VENDEDOR';

      return `
        <div class="user-row" style="border: 1px solid var(--border); padding: 16px; border-radius: 8px; margin-bottom: 12px; background: var(--bg-secondary);">
          <div class="user-main">
            <div style="font-weight: 800; font-size: 16px;">${safeUser}</div>
            <div style="margin-top: 4px;">
              <span class="badge ${role === 'SUPERUSER' ? 'badge-danger' : role === 'ADMIN' ? 'badge-warning' : 'badge-info'}">${roleLabel}</span>
              <span class="badge ${u.ativo ? 'badge-success' : 'badge-neutral'}">${u.ativo ? 'ATIVO' : 'INATIVO'}</span>
              ${safeName ? `<span class="muted" style="margin-left: 8px;">&bull; ${safeName}</span>` : ''}
              ${isLoggedUser ? '<span class="muted" style="margin-left: 8px;">&bull; logado</span>' : ''}
            </div>
          </div>
          <div class="user-actions" style="margin-top: 12px; display: flex; gap: 8px;">
            <button class="btn btn-ghost btn-sm" onclick="openUserModal(${u.id})">Editar</button>
            <button class="btn btn-ghost btn-sm text-danger" onclick="handleDeleteUser(${u.id})">Excluir</button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = buildEmptyState('Falha ao carregar acessos', err.message);
    showToast(`Erro ao carregar acessos: ${err.message}`, 'error');
  }
}

async function handleCreateUser() {
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

  if (!payload.username || !payload.password) {
    showToast('Usuário e senha são obrigatórios.', 'error');
    return;
  }

  try {
    await apiPost('/usuarios', payload);
    usernameEl.value = '';
    passwordEl.value = '';
    if (nameEl) nameEl.value = '';
    showToast('Usuário criado com sucesso.', 'success');
    loadUsuarios();
  } catch (err) {
    showToast(`Erro ao criar usuário: ${err.message}`, 'error');
  }
}

async function handleDeleteUser(id) {
  if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
  try {
    await apiDelete(`/usuarios/${id}`);
    showToast('Usuário removido ou desativado.', 'success');
    loadUsuarios();
  } catch (err) {
    showToast(`Erro ao excluir: ${err.message}`, 'error');
  }
}

async function openUserModal(id) {
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalFooter = document.getElementById('modal-footer');

  modalTitle.innerText = 'Editar Usuário / Redefinir Senha';
  modalBody.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Carregando dados...</div>';
  modalFooter.innerHTML = '';
  openModal();

  try {
    const u = await apiGet(`/usuarios/${id}`);
    modalBody.innerHTML = `
      <form id="form-user" onsubmit="event.preventDefault(); saveUser(${id})">
        <div class="form-group">
          <label class="form-label">Nome Completo</label>
          <input class="form-input" id="edit-user-nome" type="text" value="${escapeHtml(u.nome || '')}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Usuário (Login)</label>
          <input class="form-input" id="edit-user-username" type="text" value="${escapeHtml(u.username)}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Nova Senha (deixe em branco para manter a atual)</label>
          <input class="form-input" id="edit-user-password" type="password" placeholder="Digite a nova senha se desejar alterar">
        </div>
        <div class="form-group">
          <label class="form-label">Perfil</label>
          <select class="form-select" id="edit-user-profile">
            <option value="USER" ${u.perfil === 'USER' ? 'selected' : ''}>Vendedor</option>
            <option value="ADMIN" ${u.perfil === 'ADMIN' ? 'selected' : ''}>Administrador</option>
            <option value="SUPERUSER" ${u.perfil === 'SUPERUSER' ? 'selected' : ''}>Superusuário</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="edit-user-ativo">
            <option value="true" ${u.ativo ? 'selected' : ''}>Ativo</option>
            <option value="false" ${!u.ativo ? 'selected' : ''}>Inativo</option>
          </select>
        </div>
      </form>
    `;
    modalFooter.innerHTML = `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveUser(${id})">Salvar Alterações</button>
    `;
  } catch (err) {
    modalBody.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

async function saveUser(id) {
  const data = {
    nome: document.getElementById('edit-user-nome').value,
    username: document.getElementById('edit-user-username').value,
    password: document.getElementById('edit-user-password').value || null,
    perfil: document.getElementById('edit-user-profile').value,
    ativo: document.getElementById('edit-user-ativo').value === 'true'
  };

  try {
    await apiPut(`/usuarios/${id}`, data);
    showToast('Usuário atualizado com sucesso.', 'success');
    closeModal();
    loadUsuarios();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- INFRAESTRUTURA ---
async function loadInfraestrutura() {
  const container = document.getElementById('infraestrutura-content');
  if (!container) return;
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Conectando ao Supabase...</div>';
  try {
    const infra = await apiGet('/infra/stack');
    const db = infra.database || {};
    const rt = infra.runtime || {};
    const app = infra.application || {};
    const access = infra.access || {};
    const tables = infra.databaseTables || [];

    // Agrupar tabelas por schema
    const bySchema = {};
    tables.forEach(t => {
      const s = t.schema || 'public';
      if (!bySchema[s]) bySchema[s] = [];
      bySchema[s].push(t);
    });

    // Badge de status da conexão
    const connStatus = `<span style="display:inline-flex;align-items:center;gap:6px;background:rgba(52,211,153,0.12);color:#34d399;padding:4px 12px;border-radius:100px;font-size:12px;font-weight:700;">
      <span style="width:8px;height:8px;background:#34d399;border-radius:50%;box-shadow:0 0 8px #34d399;display:inline-block;"></span> Conectado
    </span>`;

    const schemaLabels = {
      public: '📦 Schema Principal (App)',
      auth: '🔐 Auth (Supabase)',
      storage: '🗂️ Storage (Supabase)',
      realtime: '⚡ Realtime (Supabase)',
      extensions: '🧩 Extensions (PostgreSQL)',
      vault: '🔒 Vault (Supabase)',
    };

    const schemaOrder = ['public', 'auth', 'storage', 'realtime', 'vault', 'extensions'];
    const orderedSchemas = [
      ...schemaOrder.filter(s => bySchema[s]),
      ...Object.keys(bySchema).filter(s => !schemaOrder.includes(s))
    ];

    const tablesHTML = orderedSchemas.map(schema => {
      const schemaTables = bySchema[schema];
      const isPrimary = schema === 'public';
      // Tabelas que o sistema precisa para funcionar
      const REQUIRED_TABLES = new Set(['produtos', 'movimentacoes_financeiras', 'usuarios_sistema', 'clientes']);
      return `
        <div style="margin-bottom:20px;">
          <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:10px;display:flex;align-items:center;gap:8px;">
            ${schemaLabels[schema] || ('🗄️ ' + schema)}
            <span class="badge badge-neutral">${schemaTables.length} tabela${schemaTables.length > 1 ? 's' : ''}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;">
            ${schemaTables.map(t => {
        const isRequired = isPrimary && REQUIRED_TABLES.has(t.name);
        const cardBorder = isRequired ? '1px solid rgba(52,211,153,0.4)' : '1px solid var(--border)';
        const cardBg = isRequired ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.02)';
        const hoverBorder = isRequired ? 'rgba(52,211,153,0.7)' : 'var(--border-hover)';
        return `
              <div style="padding:12px 14px;border:${cardBorder};border-radius:12px;background:${cardBg};transition:border-color 0.2s;position:relative;"
                   onmouseover="this.style.borderColor='${hoverBorder}'" onmouseout="this.style.borderColor='${isRequired ? 'rgba(52,211,153,0.4)' : 'var(--border)'}'">
                ${isRequired ? `
                  <div style="position:absolute;top:10px;right:10px;display:flex;align-items:center;gap:4px;background:rgba(52,211,153,0.12);color:#34d399;padding:2px 8px;border-radius:100px;font-size:10px;font-weight:700;">
                    <span style="width:6px;height:6px;background:#34d399;border-radius:50%;box-shadow:0 0 6px #34d399;display:inline-block;"></span>
                    Necessária
                  </div>` : ''}
                <div style="font-weight:700;font-size:13px;color:${isRequired ? '#34d399' : 'var(--text-primary)'};margin-bottom:4px;padding-right:${isRequired ? '80px' : '0'};">
                  ${isPrimary ? (t.friendlyName || t.name) : t.name}
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;font-family:monospace;">${t.name}</div>
                <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center;">
                  <span>${t.columns} colunas</span>
                  ${t.businessArea ? `<span class="badge badge-neutral" style="font-size:10px;">${t.businessArea}</span>` : ''}
                </div>
                ${t.plainPurpose && isPrimary ? `<div style="font-size:11px;color:var(--text-muted);margin-top:6px;font-style:italic;">${t.plainPurpose}</div>` : ''}
                ${t.dependsOn && t.dependsOn.length > 0 ? `
                  <div style="margin-top:8px;font-size:10px;color:var(--text-muted);">
                    🔗 Depende de: ${t.dependsOn.map(d => `<code style="font-size:10px;">${d.replace('public.', '')}</code>`).join(', ')}
                  </div>` : ''}
              </div>
            `}).join('')}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <!-- Linha 1: Conexão + Runtime -->
      <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:16px;margin-bottom:16px;">

        <!-- Conexão Supabase -->
        <div class="card" style="padding:20px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
            <div>
              <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;font-weight:700;margin-bottom:6px;">🌐 Banco de Dados</div>
              <div style="font-size:18px;font-weight:800;color:var(--text-primary);">${db.engine || 'PostgreSQL'} <span style="font-size:13px;color:var(--text-muted);font-weight:500;">(${db.mode || 'Supabase Cloud'})</span></div>
            </div>
            ${connStatus}
          </div>
          <div style="display:grid;gap:8px;">
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid var(--border);">
              <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;min-width:64px;padding-top:2px;">URL</span>
              <code style="font-size:11px;color:var(--accent-info);word-break:break-all;line-height:1.5;">${db.url || '-'}</code>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div style="padding:10px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid var(--border);">
                <div style="font-size:11px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;">Usuário DB</div>
                <div style="font-size:13px;color:var(--text-primary);font-weight:600;">${db.username || '-'}</div>
              </div>
              <div style="padding:10px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid var(--border);">
                <div style="font-size:11px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px;">Porta HTTP</div>
                <div style="font-size:13px;color:var(--text-primary);font-weight:600;">:${access.httpPort || '8085'}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Runtime -->
        <div class="card" style="padding:20px;">
          <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;font-weight:700;margin-bottom:16px;">⚙️ Runtime</div>
          <div style="display:grid;gap:8px;">
            ${[
        ['Aplicação', app.displayName || app.name],
        ['Java', rt.javaVersion],
        ['Spring Boot', rt.springBootVersion],
        ['Tomcat', rt.tomcatVersion],
        ['SO', rt.operatingSystem],
        ['Arch', rt.architecture],
      ].map(([label, value]) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-radius:8px;border:1px solid var(--border);">
                <span style="font-size:11px;color:var(--text-muted);font-weight:700;text-transform:uppercase;">${label}</span>
                <span style="font-size:12px;color:var(--text-secondary);font-weight:600;">${value || '-'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Linha 2: Mapa de Tabelas -->
      <div class="card" style="padding:20px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div>
            <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;font-weight:700;margin-bottom:4px;">🗄️ Mapa de Tabelas</div>
            <div style="font-size:13px;color:var(--text-secondary);">${tables.length} tabelas encontradas no banco Supabase</div>
          </div>
          <span class="badge badge-success">${tables.length} tabelas</span>
        </div>
        ${tablesHTML || '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">Nenhuma tabela encontrada</div></div>'}
      </div>

      <!-- Linha 3: Logs SQL -->
      <div class="card" style="padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">📡 Logs SQL em Tempo Real</div>
          <span class="badge badge-neutral" style="animation:pulse 2s infinite;">AO VIVO</span>
        </div>
        <div id="live-sql-logs" style="font-family:monospace;font-size:11px;background:rgba(0,0,0,0.4);color:#34d399;padding:14px;min-height:160px;max-height:260px;overflow:auto;border-radius:10px;border:1px solid var(--border);line-height:1.8;">
          <span style="color:var(--text-muted);">Aguardando queries...</span>
        </div>
      </div>
    `;
    startSqlLogsPolling();
  } catch (err) {
    container.innerHTML = `
      <div class="card" style="padding:32px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">⚠️</div>
        <div style="font-size:16px;font-weight:700;color:var(--accent-danger);margin-bottom:8px;">Erro ao conectar à API de Infraestrutura</div>
        <div style="font-size:13px;color:var(--text-muted);">${escapeHtml(err.message)}</div>
        <button class="btn btn-ghost" style="margin-top:20px;" onclick="loadInfraestrutura()">Tentar novamente</button>
      </div>
    `;
  }
}

function startSqlLogsPolling() {
  if (window.sqlLogsInterval) clearInterval(window.sqlLogsInterval);
  window.sqlLogsInterval = setInterval(async () => {
    try {
      const logs = await apiGet('/infra/sql-logs');
      const el = document.getElementById('live-sql-logs');
      if (el) el.innerHTML = logs.map(l => `<div>[${l.timestamp}] ${escapeHtml(l.sql)}</div>`).join('');
    } catch (e) { }
  }, 2000);
}

// --- SECURITY & SESSION ---
function isAuthenticated() { return sessionStorage.getItem('authA3') === 'true'; }
function isAdmin() { return ['ADMIN', 'SUPERUSER'].includes(sessionStorage.getItem('authRoleA3')); }
function isSuperuser() { return sessionStorage.getItem('authRoleA3') === 'SUPERUSER'; }

function getCurrentUser() {
  return {
    id: sessionStorage.getItem('authUserIdA3'),
    username: sessionStorage.getItem('authUserA3'),
    perfil: sessionStorage.getItem('authRoleA3'),
    nome: sessionStorage.getItem('authNameA3')
  };
}

function setCurrentUser(u) {
  sessionStorage.setItem('authA3', 'true');
  sessionStorage.setItem('authUserIdA3', u.id);
  sessionStorage.setItem('authUserA3', u.username);
  sessionStorage.setItem('authRoleA3', u.perfil);
  sessionStorage.setItem('authNameA3', u.nome || u.username);
}
function clearCurrentUser() {
  sessionStorage.clear();
}

async function handleLogin() {
  const username = document.getElementById('login-user').value;
  const password = document.getElementById('login-pass').value;
  try {
    const user = await apiPost('/auth/login', { username, password });
    setCurrentUser(user);
    window.location.reload();
  } catch (err) {
    const errEl = document.getElementById('login-error');
    if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
  }
}

async function handleLogout() {
  try { await apiPost('/auth/logout', {}); } finally { clearCurrentUser(); window.location.reload(); }
}

function applyRoleAccessControl() {
  const superuser = isSuperuser();
  const admin = isAdmin();

  const menuUsuarios = document.getElementById('menu-usuarios');
  const menuInfra = document.getElementById('menu-infra');

  if (menuUsuarios) menuUsuarios.style.display = superuser ? '' : 'none';
  if (menuInfra) menuInfra.style.display = superuser ? '' : 'none';
}

async function initializeAuthenticatedApp() {
  try {
    const me = await apiGet('/auth/me');
    setCurrentUser(me);
    applyRoleAccessControl();
    loadDashboard();
  } catch (e) {
    clearCurrentUser();
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('secure-app').style.display = 'none';
  }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  if (isAuthenticated()) {
    initializeAuthenticatedApp();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('secure-app').style.display = 'none';
  }
});

function checkSystemHealth() {
  apiGet('/health').then(h => {
    const dot = document.getElementById('status-dot');
    if (dot) dot.style.background = (h.api === 'ONLINE' && h.database === 'ONLINE') ? '#10b981' : '#f59e0b';
  }).catch(() => {
    const dot = document.getElementById('status-dot');
    if (dot) dot.style.background = '#ef4444';
  });
}
setInterval(checkSystemHealth, 30000);
