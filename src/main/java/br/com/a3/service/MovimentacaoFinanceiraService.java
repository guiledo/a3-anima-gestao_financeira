package br.com.a3.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.a3.dto.movimentacao.MovimentacaoFinanceiraRequest;
import br.com.a3.dto.movimentacao.MovimentacaoFinanceiraResponse;
import br.com.a3.exception.RecursoNaoEncontradoException;
import br.com.a3.model.MovimentacaoFinanceira;
import br.com.a3.model.TipoPagamento;
import br.com.a3.repository.MovimentacaoFinanceiraRepository;

@Service
@Transactional
public class MovimentacaoFinanceiraService {

    private final MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository;

    public MovimentacaoFinanceiraService(MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository) {
        this.movimentacaoFinanceiraRepository = movimentacaoFinanceiraRepository;
    }

    public MovimentacaoFinanceiraResponse criar(MovimentacaoFinanceiraRequest request) {
        MovimentacaoFinanceira movimentacao = new MovimentacaoFinanceira();
        aplicarDados(movimentacao, request);
        return toResponse(movimentacaoFinanceiraRepository.save(movimentacao));
    }

    @Transactional(readOnly = true)
    public List<MovimentacaoFinanceiraResponse> listar() {
        return movimentacaoFinanceiraRepository.findAllByOrderByDataDescIdDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MovimentacaoFinanceiraResponse buscarPorId(Long id) {
        return toResponse(buscarEntidade(id));
    }

    public MovimentacaoFinanceiraResponse atualizar(Long id, MovimentacaoFinanceiraRequest request) {
        MovimentacaoFinanceira movimentacao = buscarEntidade(id);
        aplicarDados(movimentacao, request);
        return toResponse(movimentacaoFinanceiraRepository.save(movimentacao));
    }

    public void excluir(Long id) {
        MovimentacaoFinanceira movimentacao = buscarEntidade(id);
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
                movimentacao.getDataPrimeiroVencimento());
    }
}
