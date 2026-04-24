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
import org.springframework.jdbc.core.JdbcTemplate;
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
    private final JdbcTemplate jdbcTemplate;

    public InfraestruturaController(
            Environment environment,
            DataSource dataSource,
            JdbcTemplate jdbcTemplate,
            @Value("${spring.application.name:a3}") String applicationName,
            @Value("${spring.datasource.url:}") String datasourceUrl,
            @Value("${spring.datasource.username:}") String datasourceUsername,
            @Value("${spring.h2.console.enabled:false}") boolean h2ConsoleEnabled,
            @Value("${spring.h2.console.path:/h2-console}") String h2ConsolePath) {
        this.environment = environment;
        this.dataSource = dataSource;
        this.jdbcTemplate = jdbcTemplate;
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
        payload.put("databaseTables", buildDatabaseTables());
        payload.put("stack", buildStack());
        payload.put("endpoints", buildEndpoints());
        payload.put("warnings", buildWarnings());
        return payload;
    }

    @GetMapping("/sql-logs")
    public List<br.com.a3.config.SqlStatementInterceptor.LogEntry> consultarLogsSql() {
        // Retorna a fila em formato de lista, reverso para o mais novo aparecer primeiro
        List<br.com.a3.config.SqlStatementInterceptor.LogEntry> logs = new ArrayList<>(br.com.a3.config.SqlStatementInterceptor.SQL_LOGS);
        java.util.Collections.reverse(logs);
        return logs;
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

    private List<Map<String, Object>> buildDatabaseTables() {
        try {
            Map<String, List<String>> dependencies = buildTableDependencies();

            return jdbcTemplate.query("""
                    select
                        t.table_schema,
                        t.table_name,
                        t.table_type,
                        count(c.column_name) as total_columns
                    from information_schema.tables t
                    left join information_schema.columns c
                        on c.table_schema = t.table_schema
                        and c.table_name = t.table_name
                    where t.table_schema not in ('information_schema', 'pg_catalog')
                    group by t.table_schema, t.table_name, t.table_type
                    order by t.table_schema, t.table_name
                    """, (rs, rowNum) -> {
                String schema = rs.getString("table_schema");
                String tableName = rs.getString("table_name");
                String qualifiedName = schema + "." + tableName;

                LinkedHashMap<String, Object> table = new LinkedHashMap<>(describeTableCatalog(schema, tableName));
                table.put("schema", schema);
                table.put("name", tableName);
                table.put("type", rs.getString("table_type"));
                table.put("columns", rs.getInt("total_columns"));
                table.put("qualifiedName", qualifiedName);
                table.put("hierarchy", List.of(
                        table.get("module"),
                        "schema " + schema,
                        qualifiedName));
                table.put("dependsOn", dependencies.getOrDefault(qualifiedName, List.of()));
                return table;
            });
        } catch (Exception ex) {
            return List.of();
        }
    }

    private Map<String, List<String>> buildTableDependencies() {
        LinkedHashMap<String, List<String>> dependencies = new LinkedHashMap<>();

        try {
            jdbcTemplate.query("""
                    select distinct
                        tc.table_schema,
                        tc.table_name,
                        ccu.table_schema as ref_schema,
                        ccu.table_name as ref_table
                    from information_schema.table_constraints tc
                    join information_schema.key_column_usage kcu
                        on kcu.constraint_name = tc.constraint_name
                        and kcu.constraint_schema = tc.constraint_schema
                    join information_schema.constraint_column_usage ccu
                        on ccu.constraint_name = tc.constraint_name
                        and ccu.constraint_schema = tc.constraint_schema
                    where tc.constraint_type = 'FOREIGN KEY'
                        and tc.table_schema not in ('information_schema', 'pg_catalog')
                        and ccu.table_schema not in ('information_schema', 'pg_catalog')
                    order by tc.table_schema, tc.table_name, ccu.table_schema, ccu.table_name
                    """, rs -> {
                String source = rs.getString("table_schema") + "." + rs.getString("table_name");
                String target = rs.getString("ref_schema") + "." + rs.getString("ref_table");
                dependencies.computeIfAbsent(source, ignored -> new ArrayList<>());
                if (!dependencies.get(source).contains(target)) {
                    dependencies.get(source).add(target);
                }
            });
        } catch (Exception ignored) {
            return Map.of();
        }

        return dependencies;
    }

    private Map<String, Object> describeTableCatalog(String schema, String tableName) {
        LinkedHashMap<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("module", moduleForSchema(schema));
        metadata.put("moduleDescription", moduleDescriptionForSchema(schema));
        metadata.put("schemaDescription", schemaDescription(schema));
        metadata.put("managedBy", managedBySchema(schema));
        metadata.put("description", tableDescription(schema, tableName));
        return metadata;
    }

    private String moduleForSchema(String schema) {
        return switch (schema) {
            case "auth" -> "Supabase Auth";
            case "storage" -> "Supabase Storage";
            case "realtime" -> "Supabase Realtime";
            case "vault" -> "Supabase Vault";
            case "extensions" -> "PostgreSQL Extensions";
            case "public" -> "Aplicacao A3";
            default -> "Schema " + schema;
        };
    }

    private String moduleDescriptionForSchema(String schema) {
        return switch (schema) {
            case "auth" -> "Camada de autenticacao, sessoes, MFA, OAuth, SSO e identidades do Supabase.";
            case "storage" -> "Camada de buckets, objetos, uploads e metadados do Supabase Storage.";
            case "realtime" -> "Camada de canais e inscricoes em tempo real do Supabase.";
            case "vault" -> "Camada de segredos criptografados do Supabase Vault.";
            case "extensions" -> "Views e objetos tecnicos vindos de extensoes instaladas no Postgres.";
            case "public" -> "Dados funcionais e tabelas customizadas da aplicacao A3.";
            default -> "Objetos visiveis pela conexao atual no schema " + schema + ".";
        };
    }

    private String schemaDescription(String schema) {
        return switch (schema) {
            case "auth" -> "Schema interno usado pelo Supabase Auth para contas, sessoes e provedores.";
            case "storage" -> "Schema interno do Supabase Storage.";
            case "realtime" -> "Schema interno do Supabase Realtime.";
            case "vault" -> "Schema interno do Supabase Vault.";
            case "extensions" -> "Schema de views expostas por extensoes do Postgres.";
            case "public" -> "Schema padrao do banco; concentra tabelas de negocio e customizacoes.";
            default -> "Schema adicional retornado pela conexao atual.";
        };
    }

    private String managedBySchema(String schema) {
        return switch (schema) {
            case "auth" -> "Gerenciado pelo Supabase Auth";
            case "storage" -> "Gerenciado pelo Supabase Storage";
            case "realtime" -> "Gerenciado pelo Supabase Realtime";
            case "vault" -> "Gerenciado pelo Supabase Vault";
            case "extensions" -> "Gerenciado pela extensao instalada no Postgres";
            case "public" -> "Gerenciado pela aplicacao A3 e por objetos customizados do projeto";
            default -> "Gerenciado pela configuracao atual do banco";
        };
    }

    private String tableDescription(String schema, String tableName) {
        return switch (schema + "." + tableName) {
            case "auth.audit_log_entries" ->
                "Registra eventos de auditoria de autenticacao, como logins, logouts e operacoes sensiveis.";
            case "auth.custom_oauth_providers" ->
                "Guarda provedores OAuth externos customizados configurados no projeto.";
            case "auth.flow_state" ->
                "Armazena estado temporario de fluxos de autenticacao em andamento.";
            case "auth.identities" ->
                "Liga um usuario do Auth a identidades externas, como email, Google ou GitHub.";
            case "auth.instances" ->
                "Mantem configuracoes da instancia do Supabase Auth.";
            case "auth.mfa_amr_claims" ->
                "Armazena comprovacoes de autenticacao multifator usadas nas sessoes.";
            case "auth.mfa_challenges" ->
                "Guarda desafios MFA ativos aguardando confirmacao.";
            case "auth.mfa_factors" ->
                "Lista os fatores MFA cadastrados pelos usuarios.";
            case "auth.oauth_authorizations" ->
                "Registra autorizacoes emitidas para clientes OAuth.";
            case "auth.oauth_client_states" ->
                "Mantem estados temporarios dos handshakes OAuth.";
            case "auth.oauth_clients" ->
                "Lista clientes OAuth conhecidos pelo modulo Auth.";
            case "auth.oauth_consents" ->
                "Guarda consentimentos concedidos por usuarios a clientes OAuth.";
            case "auth.one_time_tokens" ->
                "Tokens de uso unico para confirmacao, recuperacao ou verificacao.";
            case "auth.refresh_tokens" ->
                "Tokens usados para renovar sessoes autenticadas.";
            case "auth.saml_providers" ->
                "Provedores SAML configurados para Single Sign-On.";
            case "auth.saml_relay_states" ->
                "Estados temporarios usados durante fluxos SAML.";
            case "auth.schema_migrations" ->
                "Historico de migracoes internas do schema auth.";
            case "auth.sessions" ->
                "Sessoes ativas e historicas dos usuarios autenticados.";
            case "auth.sso_domains" ->
                "Dominios vinculados a provedores corporativos de SSO.";
            case "auth.sso_providers" ->
                "Provedores de Single Sign-On corporativo.";
            case "auth.users" ->
                "Usuarios mestre do Supabase Auth; e a base central de autenticacao da plataforma.";
            case "auth.webauthn_challenges" ->
                "Desafios temporarios para autenticacao com passkeys/WebAuthn.";
            case "auth.webauthn_credentials" ->
                "Credenciais WebAuthn/passkeys registradas pelos usuarios.";
            case "extensions.pg_stat_statements" ->
                "View de estatisticas agregadas das consultas SQL executadas no banco.";
            case "extensions.pg_stat_statements_info" ->
                "Resumo tecnico da extensao pg_stat_statements.";
            case "public.movimentacoes_financeiras" ->
                "Lancamentos de entrada e saida da aplicacao A3.";
            case "public.produtos" ->
                "Catalogo de produtos da aplicacao A3.";
            case "public.usuarios" ->
                "Tabela legada visivel no schema public; nao e a base principal da autenticacao atual.";
            case "public.usuarios_sistema" ->
                "Usuarios administrativos da aplicacao A3 com perfis SUPERUSER, ADMIN e USER.";
            case "realtime.messages" ->
                "Mensagens internas usadas pelo modulo Realtime do Supabase.";
            case "realtime.schema_migrations" ->
                "Historico de migracoes do schema realtime.";
            case "realtime.subscription" ->
                "Inscricoes ativas de canais e listeners do Realtime.";
            case "storage.buckets" ->
                "Buckets logicos do Supabase Storage.";
            case "storage.buckets_analytics" ->
                "Metricas agregadas por bucket usadas pelo Storage.";
            case "storage.buckets_vectors" ->
                "Metadados internos de vetorizacao associados a buckets.";
            case "storage.migrations" ->
                "Historico de migracoes do schema storage.";
            case "storage.objects" ->
                "Arquivos e objetos armazenados dentro dos buckets.";
            case "storage.s3_multipart_uploads" ->
                "Uploads multipart ainda em andamento.";
            case "storage.s3_multipart_uploads_parts" ->
                "Partes individuais dos uploads multipart.";
            case "storage.vector_indexes" ->
                "Indices vetoriais internos usados por recursos do Storage.";
            case "vault.decrypted_secrets" ->
                "View que expoe segredos descriptografados conforme permissao do Vault.";
            case "vault.secrets" ->
                "Segredos cifrados armazenados no Supabase Vault.";
            default -> "Tabela ou view visivel pela conexao atual; sem descricao especifica cadastrada.";
        };
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
        endpoints.add(endpoint("Login de sessao", "POST", "/api/v1/auth/login"));
        endpoints.add(endpoint("Sessao atual", "GET", "/api/v1/auth/me"));
        endpoints.add(endpoint("Encerrar sessao", "POST", "/api/v1/auth/logout"));
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
        endpoints.add(endpoint("Usuarios do sistema", "GET", "/api/v1/usuarios"));
        endpoints.add(endpoint("Criar usuario", "POST", "/api/v1/usuarios"));
        endpoints.add(endpoint("Atualizar usuario", "PUT", "/api/v1/usuarios/{id}"));
        if (h2ConsoleEnabled) {
            endpoints.add(endpoint("H2 Console", "GET", h2ConsolePath));
        }
        return endpoints;
    }

    private List<String> buildWarnings() {
        List<String> warnings = new ArrayList<>();
        if (datasourceUrl.contains(":mem:")) {
            warnings.add("Banco em memoria: reiniciar a aplicacao descarta os dados carregados.");
        } else if (datasourceUrl.contains(":file:")) {
            warnings.add("Banco local em arquivo: os dados persistem entre reinicios.");
        }
        if (h2ConsoleEnabled) {
            warnings.add("Console H2 habilitado em " + h2ConsolePath + ".");
        }
        if (!environment.getProperty("server.ssl.enabled", Boolean.class, false)) {
            warnings.add("Aplicacao servida por HTTP sem TLS nesta implantacao.");
        }
        warnings.add("Autenticacao e perfis sao persistidos no banco principal configurado para a aplicacao.");
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
