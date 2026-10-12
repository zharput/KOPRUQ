package com.kopruq.api.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Gives every request a correlation id: a safe incoming {@value #HEADER}
 * value is reused, otherwise a random UUID is generated. The id is put in
 * the logging MDC (key {@value #MDC_KEY}), echoed in the response header
 * and copied into the error body by {@code ApiExceptionHandler}, so one id
 * ties a client-visible error to its server log lines.
 *
 * <p>An incoming value is accepted only if it is 1-64 characters of
 * letters, digits or hyphens; anything else (spaces, newlines, control
 * characters ...) is replaced, so a client cannot inject text into the log.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Correlation-ID";
    public static final String MDC_KEY = "correlationId";

    private static final Pattern SAFE_ID = Pattern.compile("^[A-Za-z0-9-]{1,64}$");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String incoming = request.getHeader(HEADER);
        String id = incoming != null && SAFE_ID.matcher(incoming).matches() ? incoming : UUID.randomUUID().toString();
        MDC.put(MDC_KEY, id);
        response.setHeader(HEADER, id);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }
}
