// ═══════════════════════════════════════════════════════════
//  Gestão Financeira A3 — Frontend JavaScript
// ═══════════════════════════════════════════════════════════

const API = 'http://localhost:8080/api/v1';

// ─── Navigation ───
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');

  if (page === 'dashboard') loadDashboard();
  if (page === 'produtos') loadProdutos();
  if (page === 'movimentacoes') loadMovimentacoes();
  if (page === 'historico') loadHistorico();
}

// ─── Global Error & Event Logger ───
window.appLogs = [];
function addAppLog(type, message) {
  const time = new Date().toLocaleTimeString('pt-BR');
  window.appLogs.unshift({ time, type, message });
  if (window.appLogs.length > 100) window.appLogs.pop();
  renderLogs();
}

window.onerror = function(msg, url, line, col, error) {
  addAppLog('error', `JS Error: ${msg} na linha ${line}`);
  return false;
};
window.addEventListener('unhandledrejection', function(event) {
  addAppLog('error', `Promessa Rejeitada: ${event.reason}`);
});

// ─── Toast Notifications ───
function showToast(message, type = 'info') {
  if (type === 'error') addAppLog('error', message);
  if (type === 'success') addAppLog('info', message);

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── Modal ───
function openModal(title, bodyHTML, footerHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-footer').innerHTML = footerHTML;
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('modal-overlay').classList.remove('active');
}

// ─── API Helpers ───
async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

async function apiPost(path, data) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erro ${res.status}`);
  }
  return res.json();
}

async function apiPut(path, data) {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erro ${res.status}`);
  }
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(`${API}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Erro ${res.status}`);
}

// ─── Format Helpers ───
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// ═════════════════════════════════════════════════════════
//  DASHBOARD
// ═════════════════════════════════════════════════════════
async function loadDashboard() {
  const grid = document.getElementById('kpi-grid');
  grid.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Carregando resumo...</div>';

  try {
    const data = await apiGet('/dashboard/resumo');
    const saldo = data.saldoAtual;
    const saldoColor = saldo >= 0 ? 'emerald' : 'red';

    grid.innerHTML = `
      <div class="kpi-card" data-color="emerald">
        <div class="kpi-icon">📈</div>
        <div class="kpi-label">Total Entradas</div>
        <div class="kpi-value text-success">${formatCurrency(data.totalEntradas)}</div>
      </div>
      <div class="kpi-card" data-color="red">
        <div class="kpi-icon">📉</div>
        <div class="kpi-label">Total Saídas</div>
        <div class="kpi-value text-danger">${formatCurrency(data.totalSaidas)}</div>
      </div>
      <div class="kpi-card" data-color="${saldoColor}">
        <div class="kpi-icon">💰</div>
        <div class="kpi-label">Saldo</div>
        <div class="kpi-value ${saldo >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(saldo)}</div>
      </div>
      <div class="kpi-card" data-color="indigo">
        <div class="kpi-icon">📦</div>
        <div class="kpi-label">Produtos Ativos</div>
        <div class="kpi-value">${data.totalProdutosAtivos ?? 0}</div>
      </div>
      <div class="kpi-card" data-color="cyan">
        <div class="kpi-icon">🏷️</div>
        <div class="kpi-label">Itens em Estoque</div>
        <div class="kpi-value">${(data.totalItensEmEstoque ?? 0).toLocaleString('pt-BR')}</div>
      </div>
      <div class="kpi-card" data-color="violet">
        <div class="kpi-icon">💎</div>
        <div class="kpi-label">Valor do Estoque</div>
        <div class="kpi-value">${formatCurrency(data.valorTotalEstoque)}</div>
      </div>
      <div class="kpi-card" data-color="amber">
        <div class="kpi-icon">🔄</div>
        <div class="kpi-label">Total Movimentações</div>
        <div class="kpi-value">${(data.totalMovimentacoes ?? 0).toLocaleString('pt-BR')}</div>
      </div>
    `;
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-text">Erro ao carregar dashboard</div>
        <div class="empty-state-sub">${err.message}</div>
      </div>`;
    showToast('Erro ao carregar dashboard: ' + err.message, 'error');
  }
}

// ═════════════════════════════════════════════════════════
//  PRODUTOS
// ═════════════════════════════════════════════════════════
async function loadProdutos() {
  const tbody = document.getElementById('produtos-tbody');
  tbody.innerHTML = '<tr><td colspan="8"><div class="loading-overlay"><div class="spinner"></div> Carregando...</div></td></tr>';

  try {
    const produtos = await apiGet('/produtos');
    document.getElementById('produtos-count').textContent = `${produtos.length} itens`;

    if (produtos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8">
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <div class="empty-state-text">Nenhum produto cadastrado</div>
          <div class="empty-state-sub">Clique em "Novo Produto" para começar</div>
        </div></td></tr>`;
      return;
    }

    tbody.innerHTML = produtos.map(p => `
      <tr>
        <td><span class="badge badge-neutral">#${p.id}</span></td>
        <td class="td-name">${escapeHtml(p.nome)}</td>
        <td>${escapeHtml(p.categoria)}</td>
        <td>${formatCurrency(p.custo)}</td>
        <td><strong>${formatCurrency(p.preco)}</strong></td>
        <td>${p.estoque}</td>
        <td>${p.ativo
          ? '<span class="badge badge-success">● Ativo</span>'
          : '<span class="badge badge-danger">● Inativo</span>'}</td>
        <td class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="openProdutoModal(${p.id})" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteProduto(${p.id})" title="Excluir">🗑️</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">${err.message}</div></div></td></tr>`;
    showToast('Erro ao carregar produtos: ' + err.message, 'error');
  }
}

function openProdutoModal(id) {
  const isEdit = !!id;
  const title = isEdit ? 'Editar Produto' : 'Novo Produto';

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
          <option value="true">Sim — Ativo</option>
          <option value="false">Não — Inativo</option>
        </select>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-success" onclick="saveProduto()">💾 ${isEdit ? 'Atualizar' : 'Criar'}</button>
  `;

  openModal(title, body, footer);

  if (isEdit) {
    apiGet(`/produtos/${id}`).then(p => {
      document.getElementById('prod-nome').value = p.nome;
      document.getElementById('prod-categoria').value = p.categoria;
      document.getElementById('prod-custo').value = p.custo;
      document.getElementById('prod-preco').value = p.preco;
      document.getElementById('prod-estoque').value = p.estoque;
      document.getElementById('prod-ativo').value = String(p.ativo);
    }).catch(err => showToast('Erro ao carregar produto: ' + err.message, 'error'));
  }
}

async function saveProduto() {
  const id = document.getElementById('prod-id').value;
  const data = {
    nome: document.getElementById('prod-nome').value.trim(),
    categoria: document.getElementById('prod-categoria').value.trim(),
    custo: parseFloat(document.getElementById('prod-custo').value) || 0,
    preco: parseFloat(document.getElementById('prod-preco').value) || 0,
    estoque: parseInt(document.getElementById('prod-estoque').value) || 0,
    ativo: document.getElementById('prod-ativo').value === 'true'
  };

  if (!data.nome || !data.categoria) {
    showToast('Preencha nome e categoria', 'error');
    return;
  }

  try {
    if (id) {
      await apiPut(`/produtos/${id}`, data);
      showToast('Produto atualizado com sucesso!', 'success');
    } else {
      await apiPost('/produtos', data);
      showToast('Produto criado com sucesso!', 'success');
    }
    closeModal();
    loadProdutos();
    loadDashboard();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}

async function deleteProduto(id) {
  if (!confirm('Tem certeza que deseja excluir este produto?')) return;
  try {
    await apiDelete(`/produtos/${id}`);
    showToast('Produto excluído!', 'success');
    loadProdutos();
    loadDashboard();
  } catch (err) {
    showToast('Erro ao excluir: ' + err.message, 'error');
  }
}

// ═════════════════════════════════════════════════════════
//  MOVIMENTAÇÕES
// ═════════════════════════════════════════════════════════
async function loadMovimentacoes() {
  const tbody = document.getElementById('movimentacoes-tbody');
  tbody.innerHTML = '<tr><td colspan="7"><div class="loading-overlay"><div class="spinner"></div> Carregando...</div></td></tr>';

  try {
    const movs = await apiGet('/movimentacoes');
    document.getElementById('movimentacoes-count').textContent = `${movs.length} itens`;

    if (movs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-state-icon">💸</div>
          <div class="empty-state-text">Nenhuma movimentação registrada</div>
          <div class="empty-state-sub">Clique em "Nova Movimentação" para começar</div>
        </div></td></tr>`;
      return;
    }

    tbody.innerHTML = movs.map(m => `
      <tr>
        <td><span class="badge badge-neutral">#${m.id}</span></td>
        <td>${m.tipo === 'ENTRADA'
          ? '<span class="badge badge-success">↑ ENTRADA</span>'
          : '<span class="badge badge-danger">↓ SAÍDA</span>'}</td>
        <td class="td-name">${escapeHtml(m.descricao)}</td>
        <td>${escapeHtml(m.categoria)}</td>
        <td><strong class="${m.tipo === 'ENTRADA' ? 'text-success' : 'text-danger'}">${formatCurrency(m.valor)}</strong></td>
        <td>${formatDate(m.data)}</td>
        <td class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="openMovimentacaoModal(${m.id})" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteMovimentacao(${m.id})" title="Excluir">🗑️</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">${err.message}</div></div></td></tr>`;
    showToast('Erro ao carregar movimentações: ' + err.message, 'error');
  }
}

function openMovimentacaoModal(id) {
  const isEdit = !!id;
  const today = new Date().toISOString().split('T')[0];

  const body = `
    <input type="hidden" id="mov-id" value="${id || ''}">
    <div class="form-group">
      <label class="form-label">Tipo</label>
      <select id="mov-tipo" class="form-select">
        <option value="ENTRADA">📈 Entrada</option>
        <option value="SAIDA">📉 Saída</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <input type="text" id="mov-descricao" class="form-input" placeholder="Ex: Venda de produtos" maxlength="160">
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
      <input type="text" id="mov-categoria" class="form-input" placeholder="Ex: Vendas, Despesas, Salários" maxlength="80">
    </div>
  `;

  const footer = `
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-success" onclick="saveMovimentacao()">💾 ${isEdit ? 'Atualizar' : 'Criar'}</button>
  `;

  openModal(isEdit ? 'Editar Movimentação' : 'Nova Movimentação', body, footer);

  if (isEdit) {
    apiGet(`/movimentacoes/${id}`).then(m => {
      document.getElementById('mov-tipo').value = m.tipo;
      document.getElementById('mov-descricao').value = m.descricao;
      document.getElementById('mov-valor').value = m.valor;
      document.getElementById('mov-data').value = m.data;
      document.getElementById('mov-categoria').value = m.categoria;
    }).catch(err => showToast('Erro: ' + err.message, 'error'));
  }
}

async function saveMovimentacao() {
  const id = document.getElementById('mov-id').value;
  const data = {
    tipo: document.getElementById('mov-tipo').value,
    descricao: document.getElementById('mov-descricao').value.trim(),
    valor: parseFloat(document.getElementById('mov-valor').value) || 0,
    data: document.getElementById('mov-data').value,
    categoria: document.getElementById('mov-categoria').value.trim()
  };

  if (!data.descricao || !data.categoria || !data.data) {
    showToast('Preencha todos os campos obrigatórios', 'error');
    return;
  }

  try {
    if (id) {
      await apiPut(`/movimentacoes/${id}`, data);
      showToast('Movimentação atualizada!', 'success');
    } else {
      await apiPost('/movimentacoes', data);
      showToast('Movimentação criada!', 'success');
    }
    closeModal();
    loadMovimentacoes();
    loadDashboard();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}

async function deleteMovimentacao(id) {
  if (!confirm('Tem certeza que deseja excluir esta movimentação?')) return;
  try {
    await apiDelete(`/movimentacoes/${id}`);
    showToast('Movimentação excluída!', 'success');
    loadMovimentacoes();
    loadDashboard();
  } catch (err) {
    showToast('Erro ao excluir: ' + err.message, 'error');
  }
}

// ═════════════════════════════════════════════════════════
//  RELATÓRIOS
// ═════════════════════════════════════════════════════════
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
    const r = await apiGet(`/relatorios/financeiro?dataInicio=${inicio}&dataFim=${fim}`);
    container.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card" data-color="emerald">
          <div class="kpi-icon">📈</div>
          <div class="kpi-label">Entradas no Período</div>
          <div class="kpi-value text-success">${formatCurrency(r.totalEntradas)}</div>
        </div>
        <div class="kpi-card" data-color="red">
          <div class="kpi-icon">📉</div>
          <div class="kpi-label">Saídas no Período</div>
          <div class="kpi-value text-danger">${formatCurrency(r.totalSaidas)}</div>
        </div>
        <div class="kpi-card" data-color="${r.saldoPeriodo >= 0 ? 'emerald' : 'red'}">
          <div class="kpi-icon">💰</div>
          <div class="kpi-label">Saldo do Período</div>
          <div class="kpi-value ${r.saldoPeriodo >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(r.saldoPeriodo)}</div>
        </div>
        <div class="kpi-card" data-color="amber">
          <div class="kpi-icon">🔄</div>
          <div class="kpi-label">Nº Movimentações</div>
          <div class="kpi-value">${r.quantidadeMovimentacoes}</div>
        </div>
        <div class="kpi-card" data-color="cyan">
          <div class="kpi-icon">📊</div>
          <div class="kpi-label">Média Diária Entradas</div>
          <div class="kpi-value">${formatCurrency(r.mediaDiariaEntradas)}</div>
        </div>
        <div class="kpi-card" data-color="violet">
          <div class="kpi-icon">📊</div>
          <div class="kpi-label">Média Diária Saídas</div>
          <div class="kpi-value">${formatCurrency(r.mediaDiariaSaidas)}</div>
        </div>
      </div>

      ${renderCategoriaTable('Entradas por Categoria', r.entradasPorCategoria, 'success')}
      ${renderCategoriaTable('Saídas por Categoria', r.saidasPorCategoria, 'danger')}
    `;
    showToast('Relatório financeiro gerado!', 'success');
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">${err.message}</div></div>`;
    showToast('Erro: ' + err.message, 'error');
  }
}

function renderCategoriaTable(title, categorias, colorClass) {
  if (!categorias || categorias.length === 0) return '';
  return `
    <div class="card mt-4">
      <div class="card-header">
        <span class="card-title">${title}</span>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Categoria</th><th>Quantidade</th><th>Valor Total</th></tr></thead>
          <tbody>
            ${categorias.map(c => `
              <tr>
                <td class="td-name">${escapeHtml(c.categoria)}</td>
                <td>${c.quantidade}</td>
                <td><strong class="text-${colorClass}">${formatCurrency(c.valorTotal)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function loadRelatorioProdutos() {
  const container = document.getElementById('relatorio-produtos-content');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Gerando relatório...</div>';

  try {
    const r = await apiGet('/relatorios/produtos');
    container.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card" data-color="indigo">
          <div class="kpi-icon">📦</div>
          <div class="kpi-label">Total Produtos</div>
          <div class="kpi-value">${r.totalProdutos}</div>
        </div>
        <div class="kpi-card" data-color="emerald">
          <div class="kpi-icon">✅</div>
          <div class="kpi-label">Ativos</div>
          <div class="kpi-value text-success">${r.totalProdutosAtivos}</div>
        </div>
        <div class="kpi-card" data-color="red">
          <div class="kpi-icon">🚫</div>
          <div class="kpi-label">Inativos</div>
          <div class="kpi-value text-danger">${r.totalProdutosInativos}</div>
        </div>
        <div class="kpi-card" data-color="cyan">
          <div class="kpi-icon">🏷️</div>
          <div class="kpi-label">Itens em Estoque</div>
          <div class="kpi-value">${(r.totalItensEmEstoque || 0).toLocaleString('pt-BR')}</div>
        </div>
        <div class="kpi-card" data-color="amber">
          <div class="kpi-icon">💵</div>
          <div class="kpi-label">Valor Estoque (Custo)</div>
          <div class="kpi-value">${formatCurrency(r.valorTotalEstoqueCusto)}</div>
        </div>
        <div class="kpi-card" data-color="violet">
          <div class="kpi-icon">💎</div>
          <div class="kpi-label">Valor Estoque (Venda)</div>
          <div class="kpi-value">${formatCurrency(r.valorTotalEstoqueVenda)}</div>
        </div>
        <div class="kpi-card" data-color="emerald">
          <div class="kpi-icon">📈</div>
          <div class="kpi-label">Margem Bruta</div>
          <div class="kpi-value text-success">${formatCurrency(r.margemBrutaEstoque)}</div>
        </div>
      </div>

      ${r.porCategoria && r.porCategoria.length > 0 ? `
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--text-secondary)">Por Categoria</h3>
        <div class="table-wrapper">
          <table>
            <thead><tr>
              <th>Categoria</th>
              <th>Produtos</th>
              <th>Itens</th>
              <th>Valor Custo</th>
              <th>Valor Venda</th>
            </tr></thead>
            <tbody>
              ${r.porCategoria.map(c => `
                <tr>
                  <td class="td-name">${escapeHtml(c.categoria)}</td>
                  <td>${c.quantidadeProdutos}</td>
                  <td>${(c.quantidadeItensEstoque || 0).toLocaleString('pt-BR')}</td>
                  <td>${formatCurrency(c.valorEstoqueCusto)}</td>
                  <td><strong>${formatCurrency(c.valorEstoqueVenda)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    `;
    showToast('Relatório de produtos gerado!', 'success');
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">${err.message}</div></div>`;
    showToast('Erro: ' + err.message, 'error');
  }
}

// ═════════════════════════════════════════════════════════
//  HISTÓRICO & LOGS
// ═════════════════════════════════════════════════════════
function switchHistoricoTab(tabId) {
  document.getElementById('view-timeline').style.display = tabId === 'timeline' ? 'block' : 'none';
  document.getElementById('view-logs').style.display = tabId === 'logs' ? 'block' : 'none';
  document.getElementById('btn-tab-timeline').className = tabId === 'timeline' ? 'btn btn-primary' : 'btn btn-ghost';
  document.getElementById('btn-tab-logs').className = tabId === 'logs' ? 'btn btn-primary' : 'btn btn-ghost';
}

function clearLogs() {
  window.appLogs = [];
  renderLogs();
  showToast('Logs limpos com sucesso!', 'success');
}

function clearTimeline() {
  const timelineEl = document.getElementById('historico-timeline');
  if (timelineEl) {
    timelineEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🗑️</div>
        <div class="empty-state-text">A linha do tempo foi limpa da interface.</div>
        <div class="empty-state-sub">Clique em "Atualizar" para recarregar as movimentações do banco.</div>
      </div>`;
  }
  showToast('Linha do tempo limpa (apenas visualmente).', 'info');
}

function renderLogs() {
  const consoleEl = document.getElementById('log-console');
  if (!consoleEl) return;
  if (window.appLogs.length === 0) {
    consoleEl.innerHTML = '<div class="log-entry info"><span class="log-time">--:--:--</span> Nenhum log registrado até o momento.</div>';
    return;
  }
  
  consoleEl.innerHTML = window.appLogs.map(log => {
    let cssClass = log.type; // error, info, warn
    return `<div class="log-entry ${cssClass}">
      <span class="log-time">[${log.time}]</span> ${escapeHtml(log.message)}
    </div>`;
  }).join('');
}

async function loadHistorico() {
  const timelineEl = document.getElementById('historico-timeline');
  timelineEl.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Carregando histórico...</div>';
  renderLogs();

  try {
    const movs = await apiGet('/movimentacoes');
    
    // Sort array by ID descending (pretending it is recent first) if date is the same
    movs.sort((a, b) => b.id - a.id);

    if (movs.length === 0) {
      timelineEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">Nenhum evento registrado no histórico.</div>
        </div>`;
      return;
    }

    timelineEl.innerHTML = movs.map(m => {
      const isEntrada = m.tipo === 'ENTRADA';
      const icon = isEntrada ? '📈' : '📉';
      const iconClass = isEntrada ? 'entrada' : 'saida';
      const colorText = isEntrada ? 'text-success' : 'text-danger';

      return `
        <div class="timeline-item">
          <div class="timeline-icon ${iconClass}">${icon}</div>
          <div class="timeline-content">
            <div class="timeline-date">${formatDate(m.data)} — Movimentação #${m.id}</div>
            <div class="timeline-title">${escapeHtml(m.descricao)}</div>
            <div class="timeline-details">
              Categoria: <strong>${escapeHtml(m.categoria)}</strong> &bull; Valor: <strong class="${colorText}">${formatCurrency(m.valor)}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    addAppLog('info', 'Histórico e Timeline atualizados com sucesso.');
  } catch (err) {
    timelineEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Falha ao carregar linha do tempo</div><div class="empty-state-sub">${err.message}</div></div>`;
  }
}

// ─── Utility ───
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// ─── Set default date range for reports ───
function setDefaultDates() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  document.getElementById('rel-data-inicio').value = firstDay.toISOString().split('T')[0];
  document.getElementById('rel-data-fim').value = today.toISOString().split('T')[0];
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  setDefaultDates();
  loadDashboard();
  checkSystemHealth();
});

// ─── Health Check ───
async function checkSystemHealth() {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const div = document.getElementById('status-indicator');
  
  if (!dot) return;

  dot.textContent = '🟡';
  text.textContent = 'Verificando...';
  text.style.color = 'var(--text-primary)';
  div.style.background = 'rgba(255,255,255,0.05)';
  
  try {
    const res = await apiGet('/health');
    if (res.api === 'ONLINE' && res.database === 'ONLINE') {
      dot.textContent = '🟢';
      text.textContent = 'Sistemas Online';
      text.style.color = 'var(--accent-success)';
      div.style.background = 'rgba(16, 185, 129, 0.1)';
    } else {
      dot.textContent = '🔴';
      text.textContent = 'Banco Offline';
      text.style.color = 'var(--accent-warning)';
      div.style.background = 'rgba(245, 158, 11, 0.1)';
      addAppLog('warn', `Problema no Banco de Dados: ${res.database_error || 'Desconhecido'}`);
    }
  } catch (err) {
    dot.textContent = '🔴';
    text.textContent = 'API Offline';
    text.style.color = 'var(--accent-danger)';
    div.style.background = 'rgba(239, 68, 68, 0.1)';
    addAppLog('error', `Sem conexão com servidor backend (API).`);
  }
}
setInterval(checkSystemHealth, 30000);

// ─── Keyboard shortcut: Escape to close modal ───
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
