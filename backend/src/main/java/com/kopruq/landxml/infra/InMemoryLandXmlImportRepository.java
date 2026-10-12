package com.kopruq.landxml.infra;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import com.kopruq.landxml.application.LandXmlImportRepository;
import com.kopruq.landxml.model.LandXmlImportResult;

public final class InMemoryLandXmlImportRepository implements LandXmlImportRepository {

    private final Map<String, LandXmlImportResult> byId = new ConcurrentHashMap<>();

    @Override
    public LandXmlImportResult save(LandXmlImportResult result) {
        byId.put(result.id(), result);
        return result;
    }

    @Override
    public Optional<LandXmlImportResult> findById(String id) {
        return Optional.ofNullable(byId.get(id));
    }
}
