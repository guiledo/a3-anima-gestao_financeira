package br.com.a3.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import br.com.a3.model.ConfiguracaoApp;

public interface ConfiguracaoAppRepository extends JpaRepository<ConfiguracaoApp, Long> {
}
