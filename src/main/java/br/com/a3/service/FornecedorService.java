package br.com.a3.service;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.com.a3.dto.fornecedor.FornecedorRequest;
import br.com.a3.dto.fornecedor.FornecedorResponse;
import br.com.a3.exception.RecursoNaoEncontradoException;
import br.com.a3.model.Fornecedor;
import br.com.a3.repository.FornecedorRepository;

@Service
@Transactional
public class FornecedorService {

    private final FornecedorRepository fornecedorRepository;
    private final UsuarioSistemaService usuarioSistemaService;

    public FornecedorService(FornecedorRepository fornecedorRepository, UsuarioSistemaService usuarioSistemaService) {
        this.fornecedorRepository = fornecedorRepository;
        this.usuarioSistemaService = usuarioSistemaService;
    }

    public FornecedorResponse criar(FornecedorRequest request) {
        Fornecedor fornecedor = new Fornecedor();
        fornecedor.setUsuario(usuarioSistemaService.getUsuarioLogado());
        aplicarDados(fornecedor, request);
        return toResponse(fornecedorRepository.save(fornecedor));
    }

    @Transactional(readOnly = true)
    public List<FornecedorResponse> listar() {
        return fornecedorRepository.findAllByOrderByNomeAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public FornecedorResponse buscarPorId(Long id) {
        return toResponse(buscarEntidade(id));
    }

    public FornecedorResponse atualizar(Long id, FornecedorRequest request) {
        Fornecedor fornecedor = buscarEntidade(id);
        aplicarDados(fornecedor, request);
        return toResponse(fornecedorRepository.save(fornecedor));
    }

    public void excluir(Long id) {
        Fornecedor fornecedor = buscarEntidade(id);
        fornecedorRepository.delete(fornecedor);
    }

    private Fornecedor buscarEntidade(Long id) {
        var usuario = usuarioSistemaService.getUsuarioLogado();
        if (usuario == null) throw new RuntimeException("Sessão do usuário não encontrada. Tente deslogar e logar novamente.");
        
        return fornecedorRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Fornecedor com id " + id + " nao encontrado"));
    }

    private void aplicarDados(Fornecedor fornecedor, FornecedorRequest request) {
        fornecedor.setNome(request.nome());
        fornecedor.setDocumento(request.documento());
        fornecedor.setEmail(request.email());
        fornecedor.setTelefone(request.telefone());
    }

    private FornecedorResponse toResponse(Fornecedor fornecedor) {
        return new FornecedorResponse(
                fornecedor.getId(),
                fornecedor.getNome(),
                fornecedor.getDocumento(),
                fornecedor.getEmail(),
                fornecedor.getTelefone());
    }
}
