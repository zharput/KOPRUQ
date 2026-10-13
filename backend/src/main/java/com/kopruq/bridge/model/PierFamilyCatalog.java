package com.kopruq.bridge.model;

import java.util.List;

/** The pier families of a project; ids are unique and not blank. An empty list is a valid, empty catalog. */
public record PierFamilyCatalog(List<PierFamily> families) implements ProjectSection {

    public PierFamilyCatalog {
        families = SectionInvariants.copyNonNull("families", families);
        SectionInvariants.uniqueNonBlank("families", families, PierFamily::id);
    }
}
