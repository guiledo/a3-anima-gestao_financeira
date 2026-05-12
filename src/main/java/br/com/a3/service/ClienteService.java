package br.com.a3.service;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.com.a3.dto.cliente.ClienteRequest;
import br.com.a3.dto.cliente.ClienteResponse;
import br.com.a3.exception.RecursoNaoEncontradoException;
import br.com.a3.model.Cliente;
import br.com.a3.repository.ClienteRepository;

@Service
@Transactional
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final UsuarioSistemaService usuarioSistemaService;
    private final br.com.a3.repository.MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository;

    public ClienteService(ClienteRepository clienteRepository, UsuarioSistemaService usuarioSistemaService,
                          br.com.a3.repository.MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository) {
        this.clienteRepository = clienteRepository;
        this.usuarioSistemaService = usuarioSistemaService;
        this.movimentacaoFinanceiraRepository = movimentacaoFinanceiraRepository;
    }

    public ClienteResponse criar(ClienteRequest request) {
        Cliente cliente = new Cliente();
        cliente.setUsuario(usuarioSistemaService.getUsuarioLogado());
        aplicarDados(cliente, request);
        return toResponse(clienteRepository.save(cliente));
    }

    @Transactional(readOnly = true)
    public List<ClienteResponse> listar() {
        return clienteRepository.findAllByOrderByNomeAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClienteResponse buscarPorId(Long id) {
        return toResponse(buscarEntidade(id));
    }

    public ClienteResponse atualizar(Long id, ClienteRequest request) {
        Cliente cliente = buscarEntidade(id);
        aplicarDados(cliente, request);
        return toResponse(clienteRepository.save(cliente));
    }

    public void excluir(Long id) {
        Cliente cliente = buscarEntidade(id);
        
        // Remove vínculo com movimentações financeiras para não violar Foreign Key
        var movimentacoes = movimentacaoFinanceiraRepository.findAllByClienteEntidadeId(id);
        for (var mov : movimentacoes) {
            mov.setClienteEntidade(null);
            movimentacaoFinanceiraRepository.save(mov);
        }
        
        clienteRepository.delete(cliente);
    }

    private Cliente buscarEntidade(Long id) {
        var usuario = usuarioSistemaService.getUsuarioLogado();
        if (usuario == null) throw new RuntimeException("Sessão do usuário não encontrada. Tente deslogar e logar novamente.");
        
        Long usuarioId = usuario.getId();
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cliente com id " + id + " nao encontrado"));

        return cliente;
    }

    private void aplicarDados(Cliente cliente, ClienteRequest request) {
        cliente.setNome(request.nome());
        cliente.setDocumento(request.documento());
        cliente.setEmail(request.email());
        cliente.setTelefone(request.telefone());
        cliente.setEndereco(request.endereco());
    }

    private ClienteResponse toResponse(Cliente cliente) {
        return new ClienteResponse(
                cliente.getId(),
                cliente.getNome(),
                cliente.getDocumento(),
                cliente.getEmail(),
                cliente.getTelefone(),
                cliente.getEndereco());
    }
}
