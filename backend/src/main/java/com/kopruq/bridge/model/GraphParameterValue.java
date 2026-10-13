package com.kopruq.bridge.model;

import com.kopruq.bridge.enums.GraphParameterKind;

import java.util.List;

/** A graph node parameter value: number, boolean, string or list of numbers (the frontend union). */
public sealed interface GraphParameterValue permits GraphParameterValue.GraphNumberValue,
        GraphParameterValue.GraphBooleanValue, GraphParameterValue.GraphStringValue,
        GraphParameterValue.GraphNumberListValue {

    GraphParameterKind kind();

    record GraphNumberValue(double value) implements GraphParameterValue {
        public GraphNumberValue {
            SectionInvariants.finite("value", value);
        }

        @Override
        public GraphParameterKind kind() {
            return GraphParameterKind.NUMBER;
        }
    }

    record GraphBooleanValue(boolean value) implements GraphParameterValue {
        @Override
        public GraphParameterKind kind() {
            return GraphParameterKind.BOOLEAN;
        }
    }

    record GraphStringValue(String value) implements GraphParameterValue {
        public GraphStringValue {
            SectionInvariants.required("value", value);
        }

        @Override
        public GraphParameterKind kind() {
            return GraphParameterKind.STRING;
        }
    }

    record GraphNumberListValue(List<Double> values) implements GraphParameterValue {
        public GraphNumberListValue {
            values = SectionInvariants.copyNonNull("values", values);
            for (Double v : values) {
                SectionInvariants.finite("values element", v);
            }
        }

        @Override
        public GraphParameterKind kind() {
            return GraphParameterKind.NUMBER_ARRAY;
        }
    }
}
