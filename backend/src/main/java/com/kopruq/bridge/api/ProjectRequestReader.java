package com.kopruq.bridge.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import com.kopruq.shared.exception.FieldViolation;
import com.kopruq.shared.exception.InvalidRequestException;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

/**
 * Strict reader of the project request bodies: unlike the rest of the API, an unknown field is rejected (with its
 * field path) instead of being ignored, because a silently dropped field would mean silently lost project data.
 * The strictness is local to this reader; the global mapper configuration is untouched.
 */
@Component
public class ProjectRequestReader {

    private final ObjectMapper mapper;

    public ProjectRequestReader(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public <T> T read(JsonNode body, Class<T> type) {
        if (body == null || !body.isObject()) {
            throw new InvalidRequestException(List.of(new FieldViolation("body", "must be a JSON object")));
        }
        try {
            return mapper.readerFor(type)
                    .with(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                    .without(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
                    .readValue(body);
        } catch (UnrecognizedPropertyException e) {
            throw new InvalidRequestException(List.of(new FieldViolation(pathOf(e), "is not a known field")));
        } catch (JsonProcessingException e) {
            String path = e instanceof JsonMappingException mapping ? pathOf(mapping) : "body";
            throw new InvalidRequestException(List.of(
                    new FieldViolation(path.isEmpty() ? "body" : path, "has an invalid value")));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static String pathOf(JsonMappingException e) {
        StringBuilder path = new StringBuilder();
        for (JsonMappingException.Reference ref : e.getPath()) {
            if (ref.getFieldName() != null) {
                if (path.length() > 0) {
                    path.append('.');
                }
                path.append(ref.getFieldName());
            } else if (ref.getIndex() >= 0) {
                path.append('[').append(ref.getIndex()).append(']');
            }
        }
        return path.toString();
    }
}
