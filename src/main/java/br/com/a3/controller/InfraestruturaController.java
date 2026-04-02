package br.com.a3.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import org.apache.catalina.util.ServerInfo;
import org.hibernate.Version;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringBootVersion;
import org.springframework.core.SpringVersion;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.zaxxer.hikari.HikariConfig;

@RestController
@RequestMapping("/api/v1/infra")
public class InfraestruturaController {

    private final Environment environment;
    private final String applicationName;
    private final String datasourceUrl;
    private final String datasourceUsername;
    private final boolean h2ConsoleEnabled;
    private final String h2ConsolePath;
    private final DataSource dataSource;

    public InfraestruturaController(
            Environment environment,
            DataSource dataSource,
            @Value("${spring.application.name:a3}") String applicationName,
            @Value("${spring.datasource.url:}") String datasourceUrl,
            @Value("${spring.datasource.username:}") String datasourceUsername,
            @Value("${spring.h2.console.enabled:false}") boolean h2ConsoleEnabled,
            @Value("${spring.h2.console.path:/h2-console}") String h2ConsolePath) {
        this.environment = environment;
        this.dataSource = dataSource;
        this.applicationName = applicationName;
        this.datasourceUrl = datasourceUrl;
        this.datasourceUsername = datasourceUsername;
        this.h2ConsoleEnabled = h2ConsoleEnabled;
        this.h2ConsolePath = h2ConsolePath;
    }

    @GetMapping("/stack")
    public Map<String, Object> consultarStack() {
        LinkedHashMap<String, Object> payload = new LinkedHashMap<>();
        payload.put("application", buildApplication());
        payload.put("access", buildAccess());
        payload.put("runtime", buildRuntime());
        payload.put("database", buildDatabase());
        payload.put("stack", buildStack());
        payload.put("endpoints", buildEndpoints());
        payload.put("warnings", buildWarnings());
        return payload;
    }

    private Map<String, Object> buildApplication() {
        LinkedHashMap<String, Object> application = new LinkedHashMap<>();
        application.put("name", applicationName);
        application.put("displayName", "Gestao Financeira A3");
        application.put("packaging", "Executable JAR");
        application.put("profile", environment.getProperty("spring.profiles.active", "default"));
        return application;
    }

    private Map<String, Object> buildAccess() {
        LinkedHashMap<String, Object> access = new LinkedHashMap<>();
        access.put("httpPort", environment.getProperty("local.server.port",
                environment.getProperty("server.port", "8080")));
        access.put("httpsEnabled", environment.getProperty("server.ssl.enabled", Boolean.class, false));
        access.put("sshPort", 22);
        access.put("apiBasePath", "/api/v1");
        access.put("h2ConsolePath", h2ConsoleEnabled ? h2ConsolePath : "");
        return access;
    }

    private Map<String, Object> buildRuntime() {
        LinkedHashMap<String, Object> runtime = new LinkedHashMap<>();
        runtime.put("operatingSystem", readOperatingSystem());
        runtime.put("architecture", System.getProperty("os.arch", "desconhecida"));
        runtime.put("javaVersion", System.getProperty("java.version", "desconhecida"));
        runtime.put("javaRuntime", System.getProperty("java.runtime.name", "desconhecido"));
        runtime.put("javaVm", System.getProperty("java.vm.name", "desconhecida"));
        runtime.put("springBootVersion", safeVersion(SpringBootVersion.getVersion()));
        runtime.put("springFrameworkVersion", safeVersion(SpringVersion.getVersion()));
        runtime.put("tomcatVersion", safeVersion(ServerInfo.getServerInfo()));
        return runtime;
    }

    private Map<String, Object> buildDatabase() {
        LinkedHashMap<String, Object> database = new LinkedHashMap<>();
        database.put("engine", detectDatabaseEngine(datasourceUrl));
        database.put("mode", detectDatabaseMode(datasourceUrl));
        database.put("url", datasourceUrl);
        database.put("username", datasourceUsername);
        database.put("consoleEnabled", h2ConsoleEnabled);
        database.put("consolePath", h2ConsoleEnabled ? h2ConsolePath : "");
        return database;
    }

    private List<Map<String, String>> buildStack() {
        List<Map<String, String>> stack = new ArrayList<>();
        stack.add(tech("Sistema operacional", readOperatingSystem(), "infra"));
        stack.add(tech("Java", System.getProperty("java.version", "desconhecida"), "runtime"));
        stack.add(tech("Spring Boot", safeVersion(SpringBootVersion.getVersion()), "backend"));
        stack.add(tech("Spring Framework", safeVersion(SpringVersion.getVersion()), "backend"));
        stack.add(tech("Tomcat", safeVersion(ServerInfo.getServerInfo()), "web"));
        stack.add(tech("Spring Data JPA", safeVersion(packageVersion("org.springframework.data.jpa.repository.JpaRepository")), "persistencia"));
        stack.add(tech("Hibernate ORM", safeVersion(Version.getVersionString()), "persistencia"));
        stack.add(tech("HikariCP", safeVersion(HikariConfig.class.getPackage().getImplementationVersion()), "persistencia"));
        stack.add(tech(detectDatabaseEngine(datasourceUrl) + " Database", safeVersion(readDatabaseVersion()), "banco"));
        stack.add(tech("Frontend", "HTML + CSS + JavaScript estatico", "ui"));
        return stack;
    }

    private List<Map<String, Object>> buildEndpoints() {
        List<Map<String, Object>> endpoints = new ArrayList<>();
        endpoints.add(endpoint("Health", "GET", "/api/v1/health"));
        endpoints.add(endpoint("Resumo do dashboard", "GET", "/api/v1/dashboard/resumo"));
        endpoints.add(endpoint("Produtos", "GET", "/api/v1/produtos"));
        endpoints.add(endpoint("Produto por id", "GET", "/api/v1/produtos/{id}"));
        endpoints.add(endpoint("Criar produto", "POST", "/api/v1/produtos"));
        endpoints.add(endpoint("Atualizar produto", "PUT", "/api/v1/produtos/{id}"));
        endpoints.add(endpoint("Remover produto", "DELETE", "/api/v1/produtos/{id}"));
        endpoints.add(endpoint("Movimentacoes", "GET", "/api/v1/movimentacoes"));
        endpoints.add(endpoint("Movimentacao por id", "GET", "/api/v1/movimentacoes/{id}"));
        endpoints.add(endpoint("Criar movimentacao", "POST", "/api/v1/movimentacoes"));
        endpoints.add(endpoint("Atualizar movimentacao", "PUT", "/api/v1/movimentacoes/{id}"));
        endpoints.add(endpoint("Remover movimentacao", "DELETE", "/api/v1/movimentacoes/{id}"));
        endpoints.add(endpoint("Relatorio financeiro", "GET", "/api/v1/relatorios/financeiro?dataInicio=AAAA-MM-DD&dataFim=AAAA-MM-DD"));
        endpoints.add(endpoint("Relatorio de produtos", "GET", "/api/v1/relatorios/produtos"));
        if (h2ConsoleEnabled) {
            endpoints.add(endpoint("H2 Console", "GET", h2ConsolePath));
        }
        return endpoints;
    }

    private List<String> buildWarnings() {
        List<String> warnings = new ArrayList<>();
        if (datasourceUrl.contains(":mem:")) {
            warnings.add("Banco em memoria: reiniciar a aplicacao descarta os dados carregados.");
        }
        if (h2ConsoleEnabled) {
            warnings.add("Console H2 habilitado em " + h2ConsolePath + ".");
        }
        if (!environment.getProperty("server.ssl.enabled", Boolean.class, false)) {
            warnings.add("Aplicacao servida por HTTP sem TLS nesta implantacao.");
        }
        return warnings;
    }

    private Map<String, String> tech(String name, String version, String category) {
        LinkedHashMap<String, String> tech = new LinkedHashMap<>();
        tech.put("name", name);
        tech.put("version", version);
        tech.put("category", category);
        return tech;
    }

    private Map<String, Object> endpoint(String label, String method, String path) {
        LinkedHashMap<String, Object> endpoint = new LinkedHashMap<>();
        endpoint.put("label", label);
        endpoint.put("method", method);
        endpoint.put("path", path);
        return endpoint;
    }

    private String detectDatabaseEngine(String jdbcUrl) {
        if (jdbcUrl == null || jdbcUrl.isBlank()) {
            return "Desconhecido";
        }
        if (jdbcUrl.startsWith("jdbc:h2:")) {
            return "H2";
        }
        if (jdbcUrl.startsWith("jdbc:postgresql:")) {
            return "PostgreSQL";
        }
        if (jdbcUrl.startsWith("jdbc:mysql:")) {
            return "MySQL";
        }
        return "JDBC";
    }

    private String detectDatabaseMode(String jdbcUrl) {
        if (jdbcUrl == null || jdbcUrl.isBlank()) {
            return "desconhecido";
        }
        if (jdbcUrl.contains(":mem:")) {
            return "in-memory";
        }
        if (jdbcUrl.contains(":file:")) {
            return "file";
        }
        return "network";
    }

    private String readOperatingSystem() {
        Path osRelease = Path.of("/etc/os-release");
        if (Files.exists(osRelease)) {
            try {
                return Files.readAllLines(osRelease).stream()
                        .filter(line -> line.startsWith("PRETTY_NAME="))
                        .findFirst()
                        .map(line -> line.substring("PRETTY_NAME=".length()).replace("\"", ""))
                        .orElse(System.getProperty("os.name", "desconhecido"));
            } catch (IOException ignored) {
                // Fallback below keeps the endpoint stable even outside Linux.
            }
        }
        return System.getProperty("os.name", "desconhecido") + " "
                + System.getProperty("os.version", "");
    }

    private String packageVersion(String className) {
        try {
            Class<?> type = Class.forName(className);
            return type.getPackage().getImplementationVersion();
        } catch (ClassNotFoundException e) {
            return null;
        }
    }

    private String safeVersion(String version) {
        return version == null || version.isBlank() ? "desconhecida" : version;
    }

    private String readDatabaseVersion() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.getMetaData().getDatabaseProductVersion();
        } catch (SQLException e) {
            return "desconhecida";
        }
    }
}
