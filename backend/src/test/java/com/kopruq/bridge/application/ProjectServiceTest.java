package com.kopruq.bridge.application;

import com.kopruq.bridge.infra.InMemoryProjectContentRepository;
import com.kopruq.bridge.infra.InMemoryProjectRepository;
import com.kopruq.shared.exception.ResourceNotFoundException;
import com.kopruq.shared.exception.RevisionConflictException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionOperations;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static com.kopruq.bridge.WorkspaceFixtures.row;
import static com.kopruq.bridge.WorkspaceFixtures.workspace;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProjectServiceTest {

    /** A clock the test can move; sub-microsecond digits prove the truncation. */
    static final class MovableClock extends Clock {
        Instant now = Instant.parse("2030-01-01T00:00:00.123456789Z");

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }

        void advance(Duration d) {
            now = now.plus(d);
        }
    }

    private InMemoryProjectRepository projects;
    private InMemoryProjectContentRepository contents;
    private MovableClock clock;
    private ProjectService service;

    @BeforeEach
    void setUp() {
        projects = new InMemoryProjectRepository();
        contents = new InMemoryProjectContentRepository();
        clock = new MovableClock();
        service = new ProjectService(projects, contents, TransactionOperations.withoutTransaction(), clock);
    }

    @Test
    void list_isEmptyWithoutProjects() {
        assertEquals(List.of(), service.list());
    }

    @Test
    void create_startsAtRevisionZero_withEqualTimes_andStoresTheName() {
        var created = service.create(workspace("Koridor A", row("b-1")));

        assertEquals(0, created.revision());
        assertEquals(created.createdUtc(), created.updatedUtc());
        assertEquals(Instant.parse("2030-01-01T00:00:00.123456Z"), created.createdUtc(), "truncated to microseconds");
        assertEquals("Koridor A", projects.findById(created.projectId()).orElseThrow().getProjectName());
        assertEquals(workspace("Koridor A", row("b-1")), created.workspace());
        assertEquals(created.workspace(), service.document(created.projectId()).workspace());
    }

    @Test
    void list_newestChangeFirst_ties_byProjectId() {
        var first = service.create(workspace("first"));
        clock.advance(Duration.ofSeconds(1));
        var second = service.create(workspace("second"));
        assertEquals(List.of(second.projectId(), first.projectId()),
                service.list().stream().map(ProjectSummary::projectId).toList());

        clock.advance(Duration.ofSeconds(1));
        service.replace(first.projectId(), 0, workspace("first"));
        assertEquals(List.of(first.projectId(), second.projectId()),
                service.list().stream().map(ProjectSummary::projectId).toList());

        clock.advance(Duration.ofSeconds(1));
        var a = service.create(workspace("a"));
        var b = service.create(workspace("b"));
        var tied = service.list().stream().filter(s -> s.updatedUtc().equals(a.updatedUtc())).toList();
        assertEquals(2, tied.size());
        assertTrue(tied.get(0).projectId().compareTo(tied.get(1).projectId()) < 0);
        assertTrue(List.of(a.projectId(), b.projectId()).contains(tied.get(0).projectId()));
    }

    @Test
    void replace_withCurrentRevision_raisesRevision_setsExactClockTime_andRenames() {
        var created = service.create(workspace("old", row("b-1")));
        clock.advance(Duration.ofMinutes(5));

        var result = service.replace(created.projectId(), 0, workspace("new", row("b-2"), row("b-1")));

        assertEquals(1, result.revision());
        assertEquals(Instant.parse("2030-01-01T00:05:00.123456Z"), result.updatedUtc());
        var doc = service.document(created.projectId());
        assertEquals(1, doc.revision());
        assertEquals(created.createdUtc(), doc.createdUtc());
        assertEquals(result.updatedUtc(), doc.updatedUtc());
        assertEquals("new", doc.workspace().project().name());
        assertEquals(List.of("b-2", "b-1"), doc.workspace().bridges().stream().map(r -> r.id()).toList());
        assertEquals("new", service.list().get(0).name());
    }

    @Test
    void replace_withStaleRevision_isRejected_andChangesNothing() {
        var created = service.create(workspace("old", row("b-1")));
        service.replace(created.projectId(), 0, workspace("old", row("b-1")));
        int writes = contents.replaceCalls();
        var before = service.document(created.projectId());

        var e = assertThrows(RevisionConflictException.class,
                () -> service.replace(created.projectId(), 0, workspace("other", row("x"))));

        assertEquals(0, e.expectedRevision());
        assertEquals(1, e.currentRevision());
        assertEquals(writes, contents.replaceCalls(), "nothing was written");
        assertEquals(before, service.document(created.projectId()));
        assertEquals("old", projects.findById(created.projectId()).orElseThrow().getProjectName());
    }

    @Test
    void sameRevisionTwice_firstWins_secondConflicts() {
        var created = service.create(workspace("p"));

        service.replace(created.projectId(), 0, workspace("p1"));

        assertThrows(RevisionConflictException.class, () -> service.replace(created.projectId(), 0, workspace("p2")));
        assertEquals("p1", service.document(created.projectId()).workspace().project().name());
    }

    @Test
    void unknownProject_is404WithCode_forDocumentAndReplace() {
        UUID id = UUID.randomUUID();

        var read = assertThrows(ResourceNotFoundException.class, () -> service.document(id));
        var write = assertThrows(ResourceNotFoundException.class, () -> service.replace(id, 0, workspace("p")));

        assertEquals("PROJECT_NOT_FOUND", read.code());
        assertEquals("PROJECT_NOT_FOUND", write.code());
        assertTrue(read.getMessage().contains(id.toString()));
    }

    @Test
    void projectWithoutStoredWorkspace_readsWithNullWorkspace() {
        var legacy = new com.kopruq.bridge.model.Project();
        projects.save(legacy);

        assertNull(service.document(legacy.getId()).workspace());
        assertEquals(0, service.document(legacy.getId()).revision());
    }
}
