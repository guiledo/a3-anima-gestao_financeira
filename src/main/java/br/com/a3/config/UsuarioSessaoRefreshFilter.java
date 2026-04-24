package br.com.a3.config;

import java.io.IOException;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import br.com.a3.service.UsuarioSistemaService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@Component
public class UsuarioSessaoRefreshFilter extends OncePerRequestFilter {

    private final UsuarioSistemaService usuarioSistemaService;

    public UsuarioSessaoRefreshFilter(UsuarioSistemaService usuarioSistemaService) {
        this.usuarioSistemaService = usuarioSistemaService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            try {
                UserDetails userDetails = usuarioSistemaService.loadUserByUsername(authentication.getName());

                if (!userDetails.isEnabled()) {
                    limparSessao(request);
                } else {
                    UsernamePasswordAuthenticationToken refreshedAuthentication =
                            UsernamePasswordAuthenticationToken.authenticated(
                                    userDetails,
                                    authentication.getCredentials(),
                                    userDetails.getAuthorities());
                    refreshedAuthentication.setDetails(authentication.getDetails());

                    SecurityContext refreshedContext = SecurityContextHolder.createEmptyContext();
                    refreshedContext.setAuthentication(refreshedAuthentication);
                    SecurityContextHolder.setContext(refreshedContext);

                    HttpSession session = request.getSession(false);
                    if (session != null) {
                        session.setAttribute(
                                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                                refreshedContext);
                    }
                }
            } catch (UsernameNotFoundException ex) {
                limparSessao(request);
            }
        }

        filterChain.doFilter(request, response);
    }

    private void limparSessao(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }
}
