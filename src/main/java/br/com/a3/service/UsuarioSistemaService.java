package br.com.a3.service;

import java.util.List;
import java.util.Locale;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.a3.dto.usuario.UsuarioAtualizacaoRequest;
import br.com.a3.dto.usuario.UsuarioRequest;
import br.com.a3.dto.usuario.UsuarioResponse;
import br.com.a3.exception.RecursoNaoEncontradoException;
import br.com.a3.model.PerfilUsuario;
import br.com.a3.model.UsuarioSistema;
import br.com.a3.repository.UsuarioSistemaRepository;

@Service
@Transactional
public class UsuarioSistemaService implements UserDetailsService {

    private final UsuarioSistemaRepository usuarioSistemaRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioSistemaService(UsuarioSistemaRepository usuarioSistemaRepository,
            PasswordEncoder passwordEncoder) {
        this.usuarioSistemaRepository = usuarioSistemaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponse> listar() {
        return usuarioSistemaRepository.findAllByOrderByNomeAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UsuarioResponse buscarPorId(Long id) {
        return toResponse(buscarEntidade(id));
    }

    @Transactional(readOnly = true)
    public UsuarioResponse buscarPorUsername(String username) {
        return toResponse(buscarPorUsernameEntidade(username));
    }

    public UsuarioResponse criar(UsuarioRequest request) {
        validarUsernameDisponivel(null, request.username());

        UsuarioSistema usuario = new UsuarioSistema();
        usuario.setNome(request.nome().trim());
        usuario.setUsername(normalizarUsername(request.username()));
        usuario.setSenhaHash(passwordEncoder.encode(request.password()));
        usuario.setPerfil(request.perfil());
        usuario.setAtivo(request.ativo());

        return toResponse(usuarioSistemaRepository.save(usuario));
    }

    public UsuarioResponse atualizar(Long id, UsuarioAtualizacaoRequest request) {
        UsuarioSistema usuario = buscarEntidade(id);
        boolean eraSuperuserAtivo = usuario.getPerfil() == PerfilUsuario.SUPERUSER && Boolean.TRUE.equals(usuario.getAtivo());

        validarUsernameDisponivel(id, request.username());

        usuario.setNome(request.nome().trim());
        usuario.setUsername(normalizarUsername(request.username()));
        usuario.setPerfil(request.perfil());
        usuario.setAtivo(request.ativo());

        String password = request.password() == null ? "" : request.password().trim();
        if (!password.isBlank()) {
            usuario.setSenhaHash(passwordEncoder.encode(password));
        }

        validarUltimoSuperuserAtivo(eraSuperuserAtivo, usuario);

        return toResponse(usuarioSistemaRepository.save(usuario));
    }

    public void garantirSuperusuarioInicial(String nome, String username, String password) {
        if (usuarioSistemaRepository.countByPerfilAndAtivoTrue(PerfilUsuario.SUPERUSER) > 0) {
            return;
        }

        String usernameNormalizado = normalizarUsername(username);
        UsuarioSistema usuario = usuarioSistemaRepository.findByUsernameIgnoreCase(usernameNormalizado)
                .orElseGet(UsuarioSistema::new);

        if (usuario.getId() == null) {
            usuario.setNome(nome == null || nome.isBlank() ? "Superusuario A3" : nome.trim());
            usuario.setUsername(usernameNormalizado);
            usuario.setSenhaHash(passwordEncoder.encode(password));
        } else if (usuario.getSenhaHash() == null || usuario.getSenhaHash().isBlank()) {
            usuario.setSenhaHash(passwordEncoder.encode(password));
        }

        usuario.setPerfil(PerfilUsuario.SUPERUSER);
        usuario.setAtivo(true);
        usuarioSistemaRepository.save(usuario);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UsuarioSistema usuario = usuarioSistemaRepository.findByUsernameIgnoreCase(normalizarUsername(username))
                .orElseThrow(() -> new UsernameNotFoundException("Usuario nao encontrado"));

        return User.withUsername(usuario.getUsername())
                .password(usuario.getSenhaHash())
                .roles(usuario.getPerfil().name())
                .disabled(!Boolean.TRUE.equals(usuario.getAtivo()))
                .build();
    }

    private UsuarioSistema buscarEntidade(Long id) {
        return usuarioSistemaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuario com id " + id + " nao encontrado"));
    }

    private UsuarioSistema buscarPorUsernameEntidade(String username) {
        return usuarioSistemaRepository.findByUsernameIgnoreCase(normalizarUsername(username))
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuario " + username + " nao encontrado"));
    }

    private void validarUsernameDisponivel(Long idAtual, String username) {
        String usernameNormalizado = normalizarUsername(username);
        usuarioSistemaRepository.findByUsernameIgnoreCase(usernameNormalizado)
                .filter(usuario -> !usuario.getId().equals(idAtual))
                .ifPresent(usuario -> {
                    throw new IllegalArgumentException("Ja existe um usuario com este username.");
                });
    }

    private void validarUltimoSuperuserAtivo(boolean eraSuperuserAtivo, UsuarioSistema usuarioAtualizado) {
        boolean continuaComoSuperuserAtivo = usuarioAtualizado.getPerfil() == PerfilUsuario.SUPERUSER
                && Boolean.TRUE.equals(usuarioAtualizado.getAtivo());

        if (!eraSuperuserAtivo || continuaComoSuperuserAtivo) {
            return;
        }

        long superusersAtivos = usuarioSistemaRepository.countByPerfilAndAtivoTrue(PerfilUsuario.SUPERUSER);
        if (superusersAtivos <= 1) {
            throw new IllegalArgumentException("O ultimo superusuario ativo nao pode ser desativado ou rebaixado.");
        }
    }

    private String normalizarUsername(String username) {
        if (username == null) {
            throw new IllegalArgumentException("username e obrigatorio");
        }
        String usernameNormalizado = username.trim().toLowerCase(Locale.ROOT);
        if (usernameNormalizado.isBlank()) {
            throw new IllegalArgumentException("username e obrigatorio");
        }
        return usernameNormalizado;
    }

    private UsuarioResponse toResponse(UsuarioSistema usuario) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNome(),
                usuario.getUsername(),
                usuario.getPerfil(),
                usuario.getAtivo(),
                usuario.getCriadoEm(),
                usuario.getAtualizadoEm());
    }
}
