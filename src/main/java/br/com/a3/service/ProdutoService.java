package br.com.a3.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.a3.dto.produto.ProdutoRequest;
import br.com.a3.dto.produto.ProdutoResponse;
import br.com.a3.exception.RecursoNaoEncontradoException;
import br.com.a3.model.Produto;
import br.com.a3.repository.ProdutoRepository;

@Service
@Transactional
public class ProdutoService {

    private final ProdutoRepository produtoRepository;

    public ProdutoService(ProdutoRepository produtoRepository) {
        this.produtoRepository = produtoRepository;
    }

    public ProdutoResponse criar(ProdutoRequest request) {
        Produto produto = new Produto();
        aplicarDados(produto, request);
        return toResponse(produtoRepository.save(produto));
    }

    @Transactional(readOnly = true)
    public List<ProdutoResponse> listar() {
        return produtoRepository.findAllByOrderByNomeAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProdutoResponse buscarPorId(Long id) {
        return toResponse(buscarEntidade(id));
    }

    public ProdutoResponse atualizar(Long id, ProdutoRequest request) {
        Produto produto = buscarEntidade(id);
        aplicarDados(produto, request);
        return toResponse(produtoRepository.save(produto));
    }

    public void excluir(Long id) {
        Produto produto = buscarEntidade(id);
        produtoRepository.delete(produto);
    }

    @Transactional(readOnly = true)
    public List<Produto> listarProdutosAtivos() {
        return produtoRepository.findByAtivoTrue();
    }

    private Produto buscarEntidade(Long id) {
        return produtoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Produto com id " + id + " nao encontrado"));
    }

    private void aplicarDados(Produto produto, ProdutoRequest request) {
        produto.setNome(request.nome());
        produto.setCategoria(request.categoria());
        produto.setCusto(request.custo());
        produto.setPreco(request.preco());
        produto.setEstoque(request.estoque());
        produto.setAtivo(request.ativo());
    }

    private ProdutoResponse toResponse(Produto produto) {
        return new ProdutoResponse(
                produto.getId(),
                produto.getNome(),
                produto.getCategoria(),
                produto.getCusto(),
                produto.getPreco(),
                produto.getEstoque(),
                produto.getAtivo());
    }
}
