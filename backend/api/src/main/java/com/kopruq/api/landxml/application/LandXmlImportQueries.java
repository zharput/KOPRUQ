package com.kopruq.api.landxml.application;

import com.kopruq.landxml.LandXmlImportRepository;
import com.kopruq.landxml.LandXmlImportResult;

import java.util.Optional;

/** Read side of the committed LandXML imports, shared by the alignment and the landxml features. */
public class LandXmlImportQueries {

    private final LandXmlImportRepository repository;

    public LandXmlImportQueries(LandXmlImportRepository repository) {
        this.repository = repository;
    }

    public Optional<LandXmlImportResult> findById(String id) {
        return repository.findById(id);
    }
}
