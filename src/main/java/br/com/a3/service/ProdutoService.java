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
    private final UsuarioSistemaService usuarioSistemaService;

    public ProdutoService(ProdutoRepository produtoRepository,
            UsuarioSistemaService usuarioSistemaService) {
        this.produtoRepository = produtoRepository;
        this.usuarioSistemaService = usuarioSistemaService;
    }

    public ProdutoResponse criar(ProdutoRequest request) {
        Produto produto = new Produto();
        produto.setUsuario(usuarioSistemaService.getUsuarioLogado());
        aplicarDados(produto, request);
        return toResponse(produtoRepository.save(produto));
    }

    @Transactional(readOnly = true)
    public List<ProdutoResponse> listar() {
        Long usuarioId = usuarioSistemaService.getUsuarioLogado().getId();
        return produtoRepository.findAllByUsuarioIdOrderByNomeAsc(usuarioId)
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
        produto.setAtivo(false);
        produtoRepository.save(produto);
    }

    @Transactional(readOnly = true)
    public List<Produto> listarProdutosAtivos() {
        Long usuarioId = usuarioSistemaService.getUsuarioLogado().getId();
        return produtoRepository.findByUsuarioIdAndAtivoTrueOrderByNomeAsc(usuarioId);
    }

    @Transactional(readOnly = true)
    public List<Produto> listarTodos() {
        Long usuarioId = usuarioSistemaService.getUsuarioLogado().getId();
        return produtoRepository.findByUsuarioId(usuarioId);
    }


    private Produto buscarEntidade(Long id) {
        Long usuarioId = usuarioSistemaService.getUsuarioLogado().getId();
        Produto produto = produtoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Produto com id " + id + " nao encontrado"));

        if (!produto.getUsuario().getId().equals(usuarioId)) {
            throw new org.springframework.security.access.AccessDeniedException("Voce nao tem permissao para acessar este produto.");
        }
        return produto;
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

    public void deduzirEstoque(Long produtoId, int quantidade) {
        Produto produto = buscarEntidade(produtoId);
        if (produto.getEstoque() < quantidade) {
             // Opcional: lancar excecao se estoque for insuficiente?
             // Por enquanto vamos permitir estoque negativo se necessario, 
             // ou apenas subtrair.
        }
        produto.setEstoque(produto.getEstoque() - quantidade);
        produtoRepository.save(produto);
    }
}
