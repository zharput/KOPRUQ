package com.kopruq.shared.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.PriorityOrdered;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Fails the start-up with a clear message when the database password is not configured.
 *
 * <p>{@code application.properties} deliberately gives {@code spring.datasource.password=${DB_PASSWORD}} no default
 * (no secret lives in the repository). Spring Boot's property binding would silently keep the unresolved text
 * {@code ${DB_PASSWORD}} as the password and the failure would surface later as a confusing authentication error.
 * Reading the property strictly here makes the start-up stop with
 * {@code Could not resolve placeholder 'DB_PASSWORD'} before any connection is attempted. (The test configuration
 * supplies its own password, so tests are unaffected.)
 */
@Component
public class DatabaseConfigurationGuard implements BeanFactoryPostProcessor, EnvironmentAware, PriorityOrdered {

    private Environment environment;

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
        // throws IllegalArgumentException("Could not resolve placeholder 'DB_PASSWORD' ...") when it is missing
        environment.getRequiredProperty("spring.datasource.password");
    }

    @Override
    public int getOrder() {
        return HIGHEST_PRECEDENCE;
    }
}
