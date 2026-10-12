package com.kopruq.shared.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DatabaseConfigurationGuardTest {

    private static DatabaseConfigurationGuard guardFor(MockEnvironment environment) {
        DatabaseConfigurationGuard guard = new DatabaseConfigurationGuard();
        guard.setEnvironment(environment);
        return guard;
    }

    @Test
    void unresolvedPasswordPlaceholder_stopsStartupAndNamesTheVariable() {
        // exactly what application.properties declares when DB_PASSWORD is not set
        MockEnvironment env = new MockEnvironment().withProperty("spring.datasource.password", "${DB_PASSWORD}");

        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> guardFor(env).postProcessBeanFactory(null));

        assertTrue(e.getMessage().contains("DB_PASSWORD"), e.getMessage());
    }

    @Test
    void configuredPassword_isAccepted_evenWhenEmpty() {
        assertDoesNotThrow(() -> guardFor(new MockEnvironment().withProperty("spring.datasource.password", "x"))
                .postProcessBeanFactory(null));
        assertDoesNotThrow(() -> guardFor(new MockEnvironment().withProperty("spring.datasource.password", ""))
                .postProcessBeanFactory(null));
    }
}
