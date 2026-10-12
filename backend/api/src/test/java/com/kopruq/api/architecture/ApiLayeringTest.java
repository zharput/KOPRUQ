package com.kopruq.api.architecture;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * BACKEND-ARCHITECTURE Faz 1 (docs/architecture/backend-reference.md R1/R2): the layering inside the {@code api}
 * module is checked by the build. Plain JUnit over the real {@code src/main/java} tree; the rules are pure
 * functions tested with synthetic input below.
 * <ol>
 *   <li>{@code @RestController} classes live only in {@code com.kopruq.api.<feature>.api}.</li>
 *   <li>{@code ..application..} classes import no Spring, no jakarta and no {@code com.kopruq.api.<x>.api.} type
 *       ({@code com.kopruq.api.error} is allowed).</li>
 *   <li>A feature package has only the sub-packages {@code api}, {@code application} and {@code infra}; no class
 *       sits directly in {@code com.kopruq.api.<feature>} (except the shared {@code config}, {@code error} and
 *       {@code observability} packages).</li>
 * </ol>
 */
class ApiLayeringTest {

    private static final Pattern PACKAGE = Pattern.compile("^\\s*package\\s+([\\w.]+)\\s*;", Pattern.MULTILINE);
    private static final Pattern REST_CONTROLLER = Pattern.compile("^\\s*@RestController\\b", Pattern.MULTILINE);
    private static final String ROOT = "com.kopruq.api";
    private static final Set<String> SHARED = Set.of("config", "error", "observability");
    private static final Set<String> LAYERS = Set.of("api", "application", "infra");
    private static final Pattern FEATURE_API_PACKAGE = Pattern.compile("com\\.kopruq\\.api\\.\\w+\\.api(\\..*)?");
    private static final Pattern FEATURE_API_IMPORT = Pattern.compile("com\\.kopruq\\.api\\.\\w+\\.api\\..*");

    // ---- the real tree

    @Test
    void apiMainSources_respectTheLayering() throws IOException {
        Map<String, String> sources = readJavaSources(findApiMainRoot());
        assertTrue(sources.size() > 20, "api sources not read correctly: " + sources.size());
        assertEquals(List.of(), violations(sources), "api layering violations");
    }

    // ---- the rules themselves, tested with synthetic input (a rule that cannot fail proves nothing)

    @Test
    void rule1_flagsARestControllerOutsideTheFeatureApiPackage() {
        Map<String, String> sources = Map.of(
                "a/Bad.java", "package com.kopruq.api.alignment;\n@RestController\nclass Bad {}\n",
                "b/Bad2.java", "package com.kopruq.api.alignment.application;\n@RestController\nclass Bad2 {}\n",
                "c/Good.java", "package com.kopruq.api.alignment.api;\n@RestController\nclass Good {}\n");
        List<String> v = violations(sources);
        assertEquals(2, v.stream().filter(s -> s.contains("@RestController")).count());
    }

    @Test
    void rule2_flagsSpringJakartaAndApiLayerImportsInApplication_butAllowsTheErrorPackage() {
        Map<String, String> sources = Map.of(
                "A.java", "package com.kopruq.api.landxml.application;\n"
                        + "import org.springframework.stereotype.Service;\n"
                        + "import jakarta.servlet.Filter;\n"
                        + "import com.kopruq.api.landxml.api.LandXmlController;\n"
                        + "import com.kopruq.api.error.InvalidRequestException;\n");
        assertEquals(3, violations(sources).size());
    }

    @Test
    void rule3_flagsAClassDirectlyInAFeaturePackageAndAnUnknownSubPackage() {
        Map<String, String> sources = Map.of(
                "A.java", "package com.kopruq.api.terrain;\nclass A {}\n",
                "B.java", "package com.kopruq.api.terrain.helpers;\nclass B {}\n",
                "C.java", "package com.kopruq.api.config;\nclass C {}\n",
                "D.java", "package com.kopruq.api;\nclass D {}\n",
                "E.java", "package com.kopruq.api.terrain.infra;\nclass E {}\n");
        assertEquals(2, violations(sources).size());
    }

    @Test
    void cleanSources_haveNoViolations() {
        Map<String, String> sources = Map.of(
                "A.java", "package com.kopruq.api.alignment.api;\n@RestController\nclass A {}\n",
                "B.java", "package com.kopruq.api.alignment.application;\nimport java.util.List;\nclass B {}\n");
        assertEquals(List.of(), violations(sources));
    }

    // ---- the rules

    static List<String> violations(Map<String, String> sources) {
        List<String> violations = new ArrayList<>();
        for (Map.Entry<String, String> file : sources.entrySet()) {
            String name = file.getKey();
            String content = file.getValue();
            Matcher m = PACKAGE.matcher(content);
            if (!m.find()) {
                violations.add(name + ": no package declaration");
                continue;
            }
            String pkg = m.group(1);
            if (REST_CONTROLLER.matcher(content).find() && !FEATURE_API_PACKAGE.matcher(pkg).matches()) {
                violations.add(name + ": @RestController in " + pkg + " (must be in com.kopruq.api.<feature>.api)");
            }
            if (isApplicationPackage(pkg)) {
                for (String imported : ModuleBoundaryRules.imports(content)) {
                    if (imported.startsWith("org.springframework.") || imported.startsWith("jakarta.")
                            || FEATURE_API_IMPORT.matcher(imported).matches()) {
                        violations.add(name + ": application class in " + pkg + " imports " + imported);
                    }
                }
            }
            if (!isAllowedPackage(pkg)) {
                violations.add(name + ": package " + pkg
                        + " is not com.kopruq.api, a shared package, or <feature>.{api,application,infra}");
            }
        }
        return violations;
    }

    private static boolean isApplicationPackage(String pkg) {
        return pkg.startsWith(ROOT + ".") && (pkg.endsWith(".application") || pkg.contains(".application."));
    }

    private static boolean isAllowedPackage(String pkg) {
        if (pkg.equals(ROOT)) {
            return true;
        }
        if (!pkg.startsWith(ROOT + ".")) {
            return false;
        }
        String[] parts = pkg.substring(ROOT.length() + 1).split("\\.");
        if (SHARED.contains(parts[0])) {
            return true;
        }
        return parts.length >= 2 && LAYERS.contains(parts[1]);
    }

    // ---- helpers

    private static Path findApiMainRoot() {
        Path dir = Path.of("").toAbsolutePath();
        while (dir != null) {
            Path direct = dir.resolve("src/main/java/com/kopruq/api");
            if (Files.isDirectory(direct)) {
                return dir.resolve("src/main/java");
            }
            Path nested = dir.resolve("api/src/main/java/com/kopruq/api");
            if (Files.isDirectory(nested)) {
                return dir.resolve("api/src/main/java");
            }
            dir = dir.getParent();
        }
        throw new IllegalStateException("api/src/main/java was not found above " + Path.of("").toAbsolutePath());
    }

    private static Map<String, String> readJavaSources(Path dir) throws IOException {
        Map<String, String> sources = new LinkedHashMap<>();
        try (Stream<Path> files = Files.walk(dir)) {
            for (Path file : files.filter(p -> p.toString().endsWith(".java")).toList()) {
                sources.put(dir.relativize(file).toString().replace('\\', '/'), Files.readString(file, StandardCharsets.UTF_8));
            }
        }
        return sources;
    }
}
