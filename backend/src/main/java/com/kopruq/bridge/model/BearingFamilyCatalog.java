package com.kopruq.bridge.model;

import java.util.List;

/** The bearing families of a project; ids are unique and not blank. */
public record BearingFamilyCatalog(List<BearingFamily> families) implements ProjectSection {

    public BearingFamilyCatalog {
        families = SectionInvariants.copyNonNull("families", families);
        SectionInvariants.uniqueNonBlank("families", families, BearingFamily::id);
    }
}
