package br.com.a3.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping
    public Map<String, Object> checkHealth() {
        Map<String, Object> status = new HashMap<>();
        status.put("api", "ONLINE");
        status.put("timestamp", System.currentTimeMillis());
        
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            status.put("database", "ONLINE");
        } catch (Exception e) {
            status.put("database", "OFFLINE");
            status.put("database_error", e.getMessage());
        }
        
        return status;
    }
}
