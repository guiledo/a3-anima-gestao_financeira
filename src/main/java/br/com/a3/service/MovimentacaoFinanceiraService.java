package br.com.a3.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.a3.dto.movimentacao.MovimentacaoFinanceiraRequest;
import br.com.a3.dto.movimentacao.MovimentacaoFinanceiraResponse;
import br.com.a3.exception.RecursoNaoEncontradoException;
import br.com.a3.model.MovimentacaoFinanceira;
import br.com.a3.model.Produto;
import br.com.a3.model.TipoMovimentacao;
import br.com.a3.model.TipoPagamento;
import br.com.a3.repository.MovimentacaoFinanceiraRepository;

@Service
@Transactional
public class MovimentacaoFinanceiraService {

    private static final Logger log = LoggerFactory.getLogger(MovimentacaoFinanceiraService.class);

    private final MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository;
    private final UsuarioSistemaService usuarioSistemaService;
    private final ProdutoService produtoService;
    private final br.com.a3.repository.ProdutoRepository produtoRepository;
    private final br.com.a3.repository.ClienteRepository clienteRepository;

    public MovimentacaoFinanceiraService(MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository,
            UsuarioSistemaService usuarioSistemaService,
            ProdutoService produtoService,
            br.com.a3.repository.ProdutoRepository produtoRepository,
            br.com.a3.repository.ClienteRepository clienteRepository) {
        this.movimentacaoFinanceiraRepository = movimentacaoFinanceiraRepository;
        this.usuarioSistemaService = usuarioSistemaService;
        this.produtoService = produtoService;
        this.produtoRepository = produtoRepository;
        this.clienteRepository = clienteRepository;
    }

    public MovimentacaoFinanceiraResponse criar(MovimentacaoFinanceiraRequest request, Authentication authentication) {
        MovimentacaoFinanceira movimentacao = new MovimentacaoFinanceira();
        movimentacao.setUsuario(usuarioSistemaService.getUsuarioLogado());
        aplicarDados(movimentacao, request);
        aplicarVendedor(movimentacao);
        
        // ============================================================
        // BAIXA DE ESTOQUE: executada ANTES de salvar a movimentacao
        // Usa o ProdutoService que e @Transactional e usa save() padrao
        // ============================================================
        if (movimentacao.getProduto() != null) {
            Produto produto = movimentacao.getProduto();
            int qtd = movimentacao.getQuantidade() != null ? movimentacao.getQuantidade() : 1;
            int estoqueAtual = produto.getEstoque() != null ? produto.getEstoque() : 0;

            log.info("[ESTOQUE] Produto: '{}' (ID:{}) | Tipo: {} | Qtd: {} | Estoque atual: {}",
                    produto.getNome(), produto.getId(), movimentacao.getTipo(), qtd, estoqueAtual);

            if (TipoMovimentacao.ENTRADA.equals(movimentacao.getTipo())) {
                if (estoqueAtual < qtd) {
                    throw new IllegalArgumentException("Estoque insuficiente para o produto: " + produto.getNome() 
                        + ". Disponível: " + estoqueAtual + ", Solicitado: " + qtd);
                }
                int novoEstoque = estoqueAtual - qtd;
                produto.setEstoque(novoEstoque);
                produtoRepository.saveAndFlush(produto);
                log.info("[ESTOQUE] Deducao aplicada. Novo estoque: {}", novoEstoque);
            } else if (TipoMovimentacao.SAIDA.equals(movimentacao.getTipo())) {
                int novoEstoque = estoqueAtual + qtd;
                produto.setEstoque(novoEstoque);
                produtoRepository.saveAndFlush(produto);
                log.info("[ESTOQUE] Incremento aplicado. Novo estoque: {}", novoEstoque);
            } else {
                log.warn("[ESTOQUE] Tipo de movimentacao nao reconhecido: {}", movimentacao.getTipo());
            }
        } else {
            log.info("[ESTOQUE] Nenhum produto vinculado. Movimentacao sem impacto no estoque.");
        }

        // Salva a movimentacao apos garantir o estoque
        MovimentacaoFinanceira salva = movimentacaoFinanceiraRepository.saveAndFlush(movimentacao);
        
        return toResponse(salva);
    }

    @Transactional(readOnly = true)
    public List<MovimentacaoFinanceiraResponse> listar(Authentication authentication) {
        List<MovimentacaoFinanceira> movimentacoes;
        if (isGestor(authentication)) {
            movimentacoes = movimentacaoFinanceiraRepository.findAllByOrderByDataDescIdDesc();
        } else {
            Long usuarioId = usuarioSistemaService.getUsuarioLogado().getId();
            movimentacoes = movimentacaoFinanceiraRepository.findAllByUsuarioIdOrderByDataDescIdDesc(usuarioId);
        }

        return movimentacoes
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MovimentacaoFinanceiraResponse buscarPorId(Long id, Authentication authentication) {
        MovimentacaoFinanceira movimentacao = buscarEntidade(id);
        validarAcessoProprioOuGestor(movimentacao, authentication);
        return toResponse(movimentacao);
    }

    public MovimentacaoFinanceiraResponse atualizar(Long id, MovimentacaoFinanceiraRequest request,
            Authentication authentication) {
        MovimentacaoFinanceira movimentacao = buscarEntidade(id);
        validarAcessoProprioOuGestor(movimentacao, authentication);
        aplicarDados(movimentacao, request);
        return toResponse(movimentacaoFinanceiraRepository.save(movimentacao));
    }

    public void excluir(Long id, Authentication authentication) {
        MovimentacaoFinanceira movimentacao = buscarEntidade(id);
        validarAcessoProprioOuGestor(movimentacao, authentication);
        movimentacaoFinanceiraRepository.delete(movimentacao);
    }

    private MovimentacaoFinanceira buscarEntidade(Long id) {
        return movimentacaoFinanceiraRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException(
                        "Movimentacao financeira com id " + id + " nao encontrada"));
    }

    private void aplicarDados(MovimentacaoFinanceira movimentacao, MovimentacaoFinanceiraRequest request) {
        validarPagamento(request);
        movimentacao.setTipo(request.tipo());
        movimentacao.setValor(request.valor());
        movimentacao.setData(request.data());
        movimentacao.setDescricao(request.descricao());
        movimentacao.setCliente(request.cliente());
        movimentacao.setCategoria(request.categoria());
        movimentacao.setTipoPagamento(request.tipoPagamento());
        movimentacao.setQuantidadeParcelas(request.quantidadeParcelas());
        movimentacao.setDataPrimeiroVencimento(request.dataPrimeiroVencimento());
        movimentacao.setQuantidade(request.quantidade() != null ? request.quantidade() : 1);
        
        if (request.produtoId() != null) {
            Produto produto = produtoRepository.findById(request.produtoId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Produto com ID " + request.produtoId() + " não encontrado no banco."));
            movimentacao.setProduto(produto);
        } else {
            movimentacao.setProduto(null);
        }

        if (request.clienteId() != null) {
            movimentacao.setClienteEntidade(clienteRepository.findById(request.clienteId()).orElse(null));
            if (movimentacao.getClienteEntidade() != null) {
                movimentacao.setCliente(movimentacao.getClienteEntidade().getNome());
            }
        } else {
            movimentacao.setClienteEntidade(null);
        }
    }

    private void aplicarVendedor(MovimentacaoFinanceira movimentacao) {
        br.com.a3.model.UsuarioSistema usuario = usuarioSistemaService.getUsuarioLogado();
        movimentacao.setVendedorUsername(usuario.getUsername());
        movimentacao.setVendedorNome(usuario.getNome());
    }

    private void validarAcessoProprioOuGestor(MovimentacaoFinanceira movimentacao, Authentication authentication) {
        if (isGestor(authentication)) {
            return;
        }

        String username = authentication == null ? "" : authentication.getName();
        if (username != null && username.equalsIgnoreCase(movimentacao.getVendedorUsername())) {
            return;
        }

        throw new AccessDeniedException("Vendedores so podem alterar as proprias movimentacoes.");
    }

    private boolean isGestor(Authentication authentication) {
        if (authentication == null) {
            return false;
        }

        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> role.equals("ROLE_ADMIN") || role.equals("ROLE_SUPERUSER"));
    }

    private void validarPagamento(MovimentacaoFinanceiraRequest request) {
        if (request.tipoPagamento() == TipoPagamento.AVISTA && request.quantidadeParcelas() != 1) {
            throw new IllegalArgumentException("Pagamento a vista deve ter exatamente 1 parcela.");
        }

        if (request.tipoPagamento() == TipoPagamento.PARCELADO && request.quantidadeParcelas() < 2) {
            throw new IllegalArgumentException("Pagamento parcelado deve ter pelo menos 2 parcelas.");
        }
    }

    private MovimentacaoFinanceiraResponse toResponse(MovimentacaoFinanceira movimentacao) {
        return new MovimentacaoFinanceiraResponse(
                movimentacao.getId(),
                movimentacao.getTipo(),
                movimentacao.getValor(),
                movimentacao.getData(),
                movimentacao.getDescricao(),
                movimentacao.getCliente(),
                movimentacao.getCategoria(),
                movimentacao.getTipoPagamento(),
                movimentacao.getQuantidadeParcelas(),
                movimentacao.getDataPrimeiroVencimento(),
                movimentacao.getVendedorUsername(),
                movimentacao.getVendedorNome(),
                movimentacao.getProduto() != null ? movimentacao.getProduto().getId() : null,
                movimentacao.getProduto() != null ? movimentacao.getProduto().getNome() : null,
                movimentacao.getQuantidade(),
                movimentacao.getClienteEntidade() != null ? movimentacao.getClienteEntidade().getId() : null);
    }
}
