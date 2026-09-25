package com.kopruq.analysis;

/** @param result null while {@code status} is {@link AnalysisStatus#RUNNING} */
public record AnalysisJob(AnalysisJobId id, AnalysisStatus status, AnalysisResult result) {
}
