# syntax=docker/dockerfile:1
# KOPRUQ backend image: multi-stage (Maven build -> slim JRE runtime). Build context is ./backend.
# Tests are NOT run here (mvn -DskipTests); they run in `mvn package` / CI against H2 or the postgres-test profile.

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
# Resolve dependencies first so that this layer is cached until pom.xml changes.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 --no-create-home kopruq
COPY --from=build /build/target/kopruq-backend-*.jar /app/app.jar
USER kopruq
EXPOSE 8080
# DB_URL, DB_USERNAME and DB_PASSWORD must be supplied when running this image; there is no default password.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
