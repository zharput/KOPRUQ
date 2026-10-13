package com.kopruq.bridge.model;

/** One named parameter of a graph node. The key may be an empty string but not null. */
public record GraphNodeParameter(String key, GraphParameterValue value) {

    public GraphNodeParameter {
        SectionInvariants.required("key", key);
        SectionInvariants.required("value", value);
    }
}
