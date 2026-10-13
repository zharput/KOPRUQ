package com.kopruq.bridge.model;

/** The girder library section; a null {@code library} means "cleared / not set". */
public record GirderLibrarySection(GirderLibrary library) implements ProjectSection {
}
