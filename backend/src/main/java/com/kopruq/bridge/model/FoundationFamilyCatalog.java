package com.kopruq.bridge.model;

import java.util.List;

/** The foundation families of a project; ids are unique and not blank. */
public record FoundationFamilyCatalog(List<FoundationFamily> families) implements ProjectSection {

    public FoundationFamilyCatalog {
        families = SectionInvariants.copyNonNull("families", families);
        SectionInvariants.uniqueNonBlank("families", families, FoundationFamily::id);
    }
}
