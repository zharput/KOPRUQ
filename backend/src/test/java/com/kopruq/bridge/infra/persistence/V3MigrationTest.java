package com.kopruq.bridge.infra.persistence;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;
import java.sql.Timestamp;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * V3 on a database that already holds V2 data: migrates a private in-memory H2 to version 2, inserts a project the
 * way V2 stores it, then applies V3 and checks the back-fill (revision 0, updated_utc = created_utc). Always H2;
 * on a real PostgreSQL the same statements run through the Spring tests that open the context.
 */
class V3MigrationTest {

    private static Flyway flyway(DataSource dataSource, String target) {
        var config = Flyway.configure().dataSource(dataSource).locations("classpath:db/migration");
        if (target != null) {
            config.target(target);
        }
        return config.load();
    }

    @Test
    void existingV2Project_getsRevisionZeroAndUpdatedEqualToCreated() {
        DataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:v3migration;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1",
                "sa", "");
        flyway(dataSource, "2").migrate();
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        UUID id = UUID.randomUUID();
        Timestamp created = Timestamp.valueOf("2026-01-02 03:04:05.123456");
        jdbc.update("insert into project (id, project_name, created_utc, selected_alternative_id, row_version) "
                + "values (?, ?, ?, null, 0)", id, "legacy", created);

        flyway(dataSource, null).migrate();

        assertEquals(0L, jdbc.queryForObject("select revision from project where id = ?", Long.class, id));
        assertEquals(
                jdbc.queryForObject("select created_utc from project where id = ?", Timestamp.class, id),
                jdbc.queryForObject("select updated_utc from project where id = ?", Timestamp.class, id));
        assertNotNull(jdbc.queryForObject("select updated_utc from project where id = ?", Timestamp.class, id));
        assertEquals(0, jdbc.queryForObject("select count(*) from project_info", Integer.class));
        assertEquals(0, jdbc.queryForObject("select count(*) from project_bridge_row", Integer.class));
        // the new columns are NOT NULL
        assertThrows(Exception.class, () -> jdbc.update(
                "insert into project (id, project_name, created_utc, row_version) values (?, 'x', ?, 0)",
                UUID.randomUUID(), created));
    }
}
