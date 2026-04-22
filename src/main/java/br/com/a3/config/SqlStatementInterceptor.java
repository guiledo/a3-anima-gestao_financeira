package br.com.a3.config;

import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

@Component
public class SqlStatementInterceptor implements StatementInspector {

    private static final int MAX_LOGS = 50;
    public static final Queue<LogEntry> SQL_LOGS = new ConcurrentLinkedQueue<>();
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    public record LogEntry(String timestamp, String sql) {}

    @Override
    public String inspect(String sql) {
        String timestamp = LocalDateTime.now().format(FORMATTER);
        
        // Remove multiple spaces/newlines for cleaner frontend display
        String cleanSql = sql.replaceAll("\\s+", " ").trim();
        
        SQL_LOGS.offer(new LogEntry(timestamp, cleanSql));
        
        // Keep only the last MAX_LOGS
        while (SQL_LOGS.size() > MAX_LOGS) {
            SQL_LOGS.poll();
        }
        
        return sql;
    }
}
