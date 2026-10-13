package com.kopruq.shared.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * The one CORS policy of the API (it replaces the identical {@code @CrossOrigin(origins = "http://localhost:5173")}
 * that every controller used to carry): browsers may call {@code /api/**} from the configured origins with GET,
 * POST, PUT and HEAD, and may read the {@value CorrelationIdFilter#HEADER} response header.
 *
 * <p>The allowed origins come from {@code kopruq.cors.allowed-origins} (comma separated; the default in
 * {@code application.properties} is the Vite dev server, the value the controllers had).
 */
@Configuration(proxyBeanMethods = false)
public class WebCorsConfiguration implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public WebCorsConfiguration(@Value("${kopruq.cors.allowed-origins:http://localhost:5173}") String[] allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "HEAD")
                .allowedHeaders("*")
                .exposedHeaders(CorrelationIdFilter.HEADER)
                .maxAge(1800);
    }
}
