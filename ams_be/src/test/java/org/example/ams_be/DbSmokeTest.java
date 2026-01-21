package org.example.ams_be;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DbSmokeTest implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DbSmokeTest(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        Integer ok = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        System.out.println("DB OK = " + ok);

        // test đọc số bảng trong schema hiện tại
        Integer cnt = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()",
                Integer.class
        );
        System.out.println("Tables in schema = " + cnt);
    }
}
