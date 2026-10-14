package com.kopruq.bridge.infra.persistence;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * V6 on a database that already holds a V5 wind snapshot: migrates a private in-memory H2 to version 5, inserts a
 * project and a snapshot row the way V5 stores it (inputs only), then applies V6 and checks the back-fill
 * (result_present = false, every result column null). Always H2; on a real PostgreSQL the same statements run
 * through the Spring tests that open the context.
 */
class V6MigrationTest {

    private static final List<String> RESULT_COLUMNS = List.of("result_status", "result_z0_m", "result_zmin_m",
            "result_kr", "result_cr", "result_vm_m_s", "result_turbulence_intensity", "result_qp_kn_m2",
            "result_b_over_d", "result_cfx", "result_transverse_kn_m", "result_missing");

    private static Flyway flyway(DataSource dataSource, String target) {
        var config = Flyway.configure().dataSource(dataSource).locations("classpath:db/migration");
        if (target != null) {
            config.target(target);
        }
        return config.load();
    }

    @Test
    void existingV5WindSnapshot_getsNoResult_andResultPresentIsNotNull() {
        DataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:v6migration;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1",
                "sa", "");
        flyway(dataSource, "5").migrate();
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        UUID id = UUID.randomUUID();
        Timestamp now = Timestamp.valueOf("2026-01-02 03:04:05.123456");
        jdbc.update("insert into project (id, project_name, created_utc, selected_alternative_id, row_version, "
                + "revision, updated_utc) values (?, ?, ?, null, 0, 0, ?)", id, "legacy", now, now);
        jdbc.update("insert into load_wind_snapshot (project_id, schema_version, snapshot_status, "
                + "basic_wind_velocity, terrain_category, reference_height, deck_width_m, dref_m) "
                + "values (?, 1, 'VALID', '27', 'II', '10', 13.8, 3.0)", id);

        flyway(dataSource, null).migrate();

        Map<String, Object> row = jdbc.queryForMap("select * from load_wind_snapshot where project_id = ?", id);
        assertEquals(Boolean.FALSE, row.get("result_present"));
        for (String column : RESULT_COLUMNS) {
            assertNull(row.get(column), column);
        }
        assertEquals("27", row.get("basic_wind_velocity"));
        assertEquals("VALID", row.get("snapshot_status"));
        // result_present is NOT NULL: an insert that leaves it out fails
        UUID other = UUID.randomUUID();
        jdbc.update("insert into project (id, project_name, created_utc, selected_alternative_id, row_version, "
                + "revision, updated_utc) values (?, ?, ?, null, 0, 0, ?)", other, "new", now, now);
        assertThrows(Exception.class, () -> jdbc.update("insert into load_wind_snapshot (project_id, schema_version, "
                + "basic_wind_velocity, terrain_category, reference_height, deck_width_m, dref_m) "
                + "values (?, 1, '27', 'II', '10', 13.8, 3.0)", other));
    }
}
