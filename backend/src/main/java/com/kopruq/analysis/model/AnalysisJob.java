package com.kopruq.analysis.model;

import com.kopruq.analysis.enums.AnalysisStatus;

/** @param result null while {@code status} is {@link AnalysisStatus#RUNNING} */
public record AnalysisJob(AnalysisJobId id, AnalysisStatus status, AnalysisResult result) {
}
