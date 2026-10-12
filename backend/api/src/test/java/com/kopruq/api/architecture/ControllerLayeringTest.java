package com.kopruq.api.architecture;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * BACKEND-REMEDIATION Faz 10 (backend-reference R2 / R12): controllers get their collaborators through the
 * constructor (no {@code new SomeService()} fields) and CORS is configured in one place (no {@code @CrossOrigin}).
 */
class ControllerLayeringTest {

    private static final Pattern NEW_COLLABORATOR_FIELD = Pattern.compile(
            "(?m)^\\s*(?:private|protected|public)?\\s*(?:static\\s+)?(?:final\\s+)?[A-Z]\\w*(?:<[^>]*>)?\\s+\\w+\\s*=\\s*new\\s+"
                    + "[A-Z]\\w*(?:Service|Engine|Generator|Factory|Catalog|Builder|Repository|UseCase|Sampler)\\s*\\(");

    /** The annotation used on a class (a line starting with it) - a mention in a comment does not count. */
    private static final Pattern CROSS_ORIGIN_USE = Pattern.compile(
            "(?m)^\\s*@CrossOrigin\\b|import\\s+org\\.springframework\\.web\\.bind\\.annotation\\.CrossOrigin");
    private static final Pattern REST_CONTROLLER = Pattern.compile("(?m)^\\s*@RestController\\b(?!Advice)");

    private static Path apiMainSources() {
        Path dir = Path.of("").toAbsolutePath();
        while (dir != null) {
            Path candidate = dir.resolve("api/src/main/java");
            if (Files.isDirectory(candidate)) {
                return candidate;
            }
            Path here = dir.resolve("src/main/java");
            if (dir.getFileName() != null && dir.getFileName().toString().equals("api") && Files.isDirectory(here)) {
                return here;
            }
            dir = dir.getParent();
        }
        throw new IllegalStateException("api/src/main/java not found");
    }

    private static List<Path> javaFiles() throws IOException {
        try (Stream<Path> files = Files.walk(apiMainSources())) {
            return files.filter(p -> p.toString().endsWith(".java")).toList();
        }
    }

    @Test
    void noControllerUsesCrossOrigin_corsLivesInWebCorsConfiguration() throws IOException {
        List<String> offenders = new ArrayList<>();
        for (Path file : javaFiles()) {
            String source = Files.readString(file, StandardCharsets.UTF_8);
            if (CROSS_ORIGIN_USE.matcher(source).find()) {
                offenders.add(file.getFileName().toString());
            }
        }
        assertEquals(List.of(), offenders);
    }

    @Test
    void noControllerBuildsItsCollaboratorsWithNew() throws IOException {
        List<String> offenders = new ArrayList<>();
        int controllers = 0;
        for (Path file : javaFiles()) {
            String source = Files.readString(file, StandardCharsets.UTF_8);
            if (!REST_CONTROLLER.matcher(source).find()) {
                continue;
            }
            controllers++;
            if (NEW_COLLABORATOR_FIELD.matcher(source).find()) {
                offenders.add(file.getFileName().toString());
            }
        }
        assertEquals(12, controllers, "expected the 12 existing controllers");
        assertEquals(List.of(), offenders);
    }

    @Test
    void theGuardPatternDoesCatchTheOldStyle() {
        assertTrue(CROSS_ORIGIN_USE.matcher("@CrossOrigin(origins = \"http://localhost:5173\")").find());
        assertTrue(CROSS_ORIGIN_USE.matcher("import org.springframework.web.bind.annotation.CrossOrigin;").find());
        assertFalse(CROSS_ORIGIN_USE.matcher(" * that every controller used to carry: @CrossOrigin(origins = x)").find());
        assertTrue(NEW_COLLABORATOR_FIELD.matcher("    private final FastSolverModelBuilder modelBuilder = new FastSolverModelBuilder();").find());
        assertTrue(NEW_COLLABORATOR_FIELD.matcher("    private final TerrainImportService importService = new TerrainImportService();").find());
        assertFalse(NEW_COLLABORATOR_FIELD.matcher("    private final TerrainRepository repository;").find());
        assertFalse(NEW_COLLABORATOR_FIELD.matcher("        List<String> warnings = new ArrayList<>();").find());
    }
}
