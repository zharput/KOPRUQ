package com.spanova.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Backend API entry point (spec/architecture amendment v2). P00
 * (foundation only): starts up, exposes actuator health, and nothing
 * else yet - no controllers, no business logic. See docs/roadmap.md for
 * what each following milestone adds here.
 */
@SpringBootApplication
public class SpanovaApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(SpanovaApiApplication.class, args);
    }
}
