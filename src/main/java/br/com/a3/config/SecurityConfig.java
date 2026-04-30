package br.com.a3.config;

import java.io.IOException;
import java.net.URI;

import org.springframework.context.annotation.Lazy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.SecurityFilterChain;

import jakarta.servlet.http.HttpServletResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final ObjectMapper objectMapper;
    private final UsuarioSessaoRefreshFilter usuarioSessaoRefreshFilter;

    public SecurityConfig(ObjectMapper objectMapper,
            @Lazy UsuarioSessaoRefreshFilter usuarioSessaoRefreshFilter) {
        this.objectMapper = objectMapper;
        this.usuarioSessaoRefreshFilter = usuarioSessaoRefreshFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/",
                                "/index.html",
                                "/style.css",
                                "/app.js",
                                "/logo.png",
                                "/error",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/health").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/usuarios/me/senha").authenticated()
                        .requestMatchers("/api/v1/usuarios/**").hasRole("SUPERUSER")
                        .requestMatchers("/api/v1/infra/**").hasAnyRole("ADMIN", "SUPERUSER")
                        .requestMatchers(HttpMethod.GET, "/api/v1/dashboard/**", "/api/v1/relatorios/**",
                                "/api/v1/produtos/**", "/api/v1/movimentacoes/**", "/api/v1/clientes/**")
                        .hasAnyRole("USER", "ADMIN", "SUPERUSER")
                        .requestMatchers(HttpMethod.POST, "/api/v1/produtos/**", "/api/v1/movimentacoes/**", "/api/v1/clientes/**")
                        .hasAnyRole("USER", "ADMIN", "SUPERUSER")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/produtos/**", "/api/v1/movimentacoes/**", "/api/v1/clientes/**")
                        .hasAnyRole("USER", "ADMIN", "SUPERUSER")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/produtos/**", "/api/v1/movimentacoes/**", "/api/v1/clientes/**")
                        .hasAnyRole("USER", "ADMIN", "SUPERUSER")
                        .anyRequest()
                        .authenticated())
                .csrf(csrf -> csrf.disable())
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
                .addFilterBefore(usuarioSessaoRefreshFilter, AuthorizationFilter.class)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> writeProblem(
                                response,
                                HttpServletResponse.SC_UNAUTHORIZED,
                                "Nao autenticado",
                                "Faca login para acessar este recurso.",
                                "https://a3.local/problems/nao-autenticado",
                                request.getRequestURI()))
                        .accessDeniedHandler((request, response, accessDeniedException) -> writeProblem(
                                response,
                                HttpServletResponse.SC_FORBIDDEN,
                                "Acesso negado",
                                "Seu usuario nao possui permissao para executar esta operacao.",
                                "https://a3.local/problems/acesso-negado",
                                request.getRequestURI())))
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable());

        return http.build();
    }

    private void writeProblem(HttpServletResponse response, int status, String title, String detail, String type,
            String instance) throws IOException {
        ProblemDetail problemDetail = ProblemDetail.forStatus(status);
        problemDetail.setTitle(title);
        problemDetail.setDetail(detail);
        problemDetail.setType(URI.create(type));
        problemDetail.setInstance(URI.create(instance));

        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), problemDetail);
    }
}
