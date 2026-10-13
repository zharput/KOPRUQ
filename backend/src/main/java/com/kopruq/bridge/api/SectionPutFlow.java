package com.kopruq.bridge.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.kopruq.bridge.api.DesignSystemPutRequests.SectionPut;
import com.kopruq.bridge.application.ProjectRevision;
import com.kopruq.bridge.application.ProjectService;
import com.kopruq.bridge.model.ProjectSection;
import com.kopruq.shared.exception.FieldViolation;
import com.kopruq.shared.exception.InvalidRequestException;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;

/**
 * The shared flow of every section {@code PUT}: read the body strictly, collect the {@code expectedRevision} and
 * {@code value} problems in one 400, replace the section through the service, and answer with the stored value.
 * Used by the design-system, load-input and graph controllers.
 */
final class SectionPutFlow {

    static final String VALUE = "value";

    private SectionPutFlow() {
    }

    static <V, M extends ProjectSection, R> SectionWriteResponse<R> write(ProjectService projects,
            ProjectRequestReader reader, UUID projectId, JsonNode body, Class<? extends SectionPut<V>> type,
            Function<V, M> toModel, Function<M, R> toDto) {
        SectionPut<V> request = reader.read(body, type);
        List<FieldViolation> violations = new ArrayList<>();
        if (request.expectedRevision() == null) {
            violations.add(new FieldViolation("expectedRevision", "is required"));
        }
        M model = null;
        if (!body.has(VALUE)) {
            violations.add(new FieldViolation(VALUE, "is required"));
        } else {
            try {
                model = toModel.apply(request.value());
            } catch (InvalidRequestException e) {
                violations.addAll(e.violations());
            }
        }
        if (!violations.isEmpty()) {
            throw new InvalidRequestException(violations);
        }
        ProjectRevision revision = projects.replace(projectId, request.expectedRevision(), model);
        return new SectionWriteResponse<>(revision.projectId(), revision.revision(), revision.updatedUtc(),
                toDto.apply(model));
    }
}
