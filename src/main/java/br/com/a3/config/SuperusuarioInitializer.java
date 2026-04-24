package br.com.a3.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import br.com.a3.service.UsuarioSistemaService;

@Component
public class SuperusuarioInitializer implements ApplicationRunner {

    private final UsuarioSistemaService usuarioSistemaService;
    private final String superuserNome;
    private final String superuserUsername;
    private final String superuserPassword;

    public SuperusuarioInitializer(
            UsuarioSistemaService usuarioSistemaService,
            @Value("${app.superuser.nome:Superusuario A3}") String superuserNome,
            @Value("${app.superuser.username}") String superuserUsername,
            @Value("${app.superuser.password}") String superuserPassword) {
        this.usuarioSistemaService = usuarioSistemaService;
        this.superuserNome = superuserNome;
        this.superuserUsername = superuserUsername;
        this.superuserPassword = superuserPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        usuarioSistemaService.garantirSuperusuarioInicial(
                superuserNome,
                superuserUsername,
                superuserPassword);
    }
}
