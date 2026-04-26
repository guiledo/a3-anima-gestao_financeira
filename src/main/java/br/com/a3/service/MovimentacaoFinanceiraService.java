package br.com.a3.service;

import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.a3.dto.movimentacao.MovimentacaoFinanceiraRequest;
import br.com.a3.dto.movimentacao.MovimentacaoFinanceiraResponse;
import br.com.a3.dto.usuario.UsuarioResponse;
import br.com.a3.exception.RecursoNaoEncontradoException;
import br.com.a3.model.MovimentacaoFinanceira;
import br.com.a3.model.TipoPagamento;
import br.com.a3.repository.MovimentacaoFinanceiraRepository;

@Service
@Transactional
public class MovimentacaoFinanceiraService {

    private final MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository;
    private final UsuarioSistemaService usuarioSistemaService;

    public MovimentacaoFinanceiraService(MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository,
            UsuarioSistemaService usuarioSistemaService) {
        this.movimentacaoFinanceiraRepository = movimentacaoFinanceiraRepository;
        this.usuarioSistemaService = usuarioSistemaService;
    }

    public MovimentacaoFinanceiraResponse criar(MovimentacaoFinanceiraRequest request, Authentication authentication) {
        MovimentacaoFinanceira movimentacao = new MovimentacaoFinanceira();
        aplicarDados(movimentacao, request);
        aplicarVendedor(movimentacao, authentication);
        return toResponse(movimentacaoFinanceiraRepository.save(movimentacao));
    }

    @Transactional(readOnly = true)
    public List<MovimentacaoFinanceiraResponse> listar(Authentication authentication) {
        List<MovimentacaoFinanceira> movimentacoes = isGestor(authentication)
                ? movimentacaoFinanceiraRepository.findAllByOrderByDataDescIdDesc()
                : movimentacaoFinanceiraRepository.findByVendedorUsernameIgnoreCaseOrderByDataDescIdDesc(
                        authentication.getName());

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
    }

    private void aplicarVendedor(MovimentacaoFinanceira movimentacao, Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return;
        }

        UsuarioResponse usuario = usuarioSistemaService.buscarPorUsername(authentication.getName());
        movimentacao.setVendedorUsername(usuario.username());
        movimentacao.setVendedorNome(usuario.nome());
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
                movimentacao.getVendedorNome());
    }
}
