package com.kopruq.bridge.infra;

import com.kopruq.bridge.application.ProjectContent;
import com.kopruq.bridge.application.ProjectContentRepository;
import com.kopruq.bridge.model.BearingFamilyCatalog;
import com.kopruq.bridge.model.BridgeDefinitions;
import com.kopruq.bridge.model.CrossSectionSection;
import com.kopruq.bridge.model.FoundationFamilyCatalog;
import com.kopruq.bridge.model.GirderLibrarySection;
import com.kopruq.bridge.model.GraphDocument;
import com.kopruq.bridge.model.MaterialAssignmentCatalog;
import com.kopruq.bridge.model.PierCapFamilyCatalog;
import com.kopruq.bridge.model.PierFamilyCatalog;
import com.kopruq.bridge.model.PreferredSpanRulesSection;
import com.kopruq.bridge.model.ProjectSection;
import com.kopruq.bridge.model.ProjectWorkspace;
import com.kopruq.bridge.model.SeismicInputsSection;
import com.kopruq.bridge.model.SelfWeightInputsSection;
import com.kopruq.bridge.model.TemperatureInputsSection;
import com.kopruq.bridge.model.TrafficLm1Section;
import com.kopruq.bridge.model.WindInputsSection;
import com.kopruq.bridge.model.WindSnapshotSection;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Test double of the {@link ProjectContentRepository} port. Keeps one {@link ProjectContent} per project. */
public class InMemoryProjectContentRepository implements ProjectContentRepository {

    private final Map<UUID, ProjectContent> contents = new HashMap<>();
    private int replaceCalls;

    @Override
    public ProjectContent load(UUID projectId) {
        return contents.getOrDefault(projectId, ProjectContent.ofWorkspace(null));
    }

    @Override
    public void replace(UUID projectId, ProjectSection section) {
        replaceCalls++;
        ProjectContent c = load(projectId);
        contents.put(projectId, switch (section) {
            case ProjectWorkspace s -> new ProjectContent(s, c.bridgeDefinitions(), c.pierFamilies(),
                    c.pierCapFamilies(), c.foundationFamilies(), c.bearingFamilies(), c.materialAssignments(),
                    c.girderLibrary(), c.preferredSpanRules(), c.crossSection()).withLoadsAndGraphs(c.loads(), c.graphs());
            case BridgeDefinitions s -> new ProjectContent(c.workspace(), s, c.pierFamilies(), c.pierCapFamilies(),
                    c.foundationFamilies(), c.bearingFamilies(), c.materialAssignments(), c.girderLibrary(),
                    c.preferredSpanRules(), c.crossSection()).withLoadsAndGraphs(c.loads(), c.graphs());
            case PierFamilyCatalog s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(), s,
                    c.pierCapFamilies(), c.foundationFamilies(), c.bearingFamilies(), c.materialAssignments(),
                    c.girderLibrary(), c.preferredSpanRules(), c.crossSection()).withLoadsAndGraphs(c.loads(), c.graphs());
            case PierCapFamilyCatalog s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(),
                    c.pierFamilies(), s, c.foundationFamilies(), c.bearingFamilies(), c.materialAssignments(),
                    c.girderLibrary(), c.preferredSpanRules(), c.crossSection()).withLoadsAndGraphs(c.loads(), c.graphs());
            case FoundationFamilyCatalog s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(),
                    c.pierFamilies(), c.pierCapFamilies(), s, c.bearingFamilies(), c.materialAssignments(),
                    c.girderLibrary(), c.preferredSpanRules(), c.crossSection()).withLoadsAndGraphs(c.loads(), c.graphs());
            case BearingFamilyCatalog s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(),
                    c.pierFamilies(), c.pierCapFamilies(), c.foundationFamilies(), s, c.materialAssignments(),
                    c.girderLibrary(), c.preferredSpanRules(), c.crossSection()).withLoadsAndGraphs(c.loads(), c.graphs());
            case MaterialAssignmentCatalog s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(),
                    c.pierFamilies(), c.pierCapFamilies(), c.foundationFamilies(), c.bearingFamilies(), s,
                    c.girderLibrary(), c.preferredSpanRules(), c.crossSection()).withLoadsAndGraphs(c.loads(), c.graphs());
            case GirderLibrarySection s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(),
                    c.pierFamilies(), c.pierCapFamilies(), c.foundationFamilies(), c.bearingFamilies(),
                    c.materialAssignments(), s.library(), c.preferredSpanRules(), c.crossSection()).withLoadsAndGraphs(c.loads(), c.graphs());
            case PreferredSpanRulesSection s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(),
                    c.pierFamilies(), c.pierCapFamilies(), c.foundationFamilies(), c.bearingFamilies(),
                    c.materialAssignments(), c.girderLibrary(), s.rules(), c.crossSection()).withLoadsAndGraphs(c.loads(), c.graphs());
            case CrossSectionSection s -> new ProjectContent(c.workspace(), c.bridgeDefinitions(),
                    c.pierFamilies(), c.pierCapFamilies(), c.foundationFamilies(), c.bearingFamilies(),
                    c.materialAssignments(), c.girderLibrary(), c.preferredSpanRules(), s.values()).withLoadsAndGraphs(c.loads(), c.graphs());
            case SeismicInputsSection s -> c.withLoadsAndGraphs(c.loads().withSeismic(s.inputs()), c.graphs());
            case WindInputsSection s -> c.withLoadsAndGraphs(c.loads().withWind(s.inputs()), c.graphs());
            case TemperatureInputsSection s -> c.withLoadsAndGraphs(c.loads().withTemperature(s.inputs()),
                    c.graphs());
            case SelfWeightInputsSection s -> c.withLoadsAndGraphs(c.loads().withSelfWeight(s.inputs()),
                    c.graphs());
            case TrafficLm1Section s -> c.withLoadsAndGraphs(c.loads().withTrafficLm1(s.inputs()), c.graphs());
            case WindSnapshotSection s -> c.withLoadsAndGraphs(c.loads().withWindSnapshot(s.snapshot()),
                    c.graphs());
            case GraphDocument s -> c.withLoadsAndGraphs(c.loads(), upsert(c.graphs(), s));
        });
    }

    /** A graph keeps its position when replaced, a new one is appended (as the real adapter does). */
    private static List<GraphDocument> upsert(List<GraphDocument> graphs, GraphDocument graph) {
        List<GraphDocument> result = new ArrayList<>(graphs);
        for (int i = 0; i < result.size(); i++) {
            if (result.get(i).id().equals(graph.id())) {
                result.set(i, graph);
                return result;
            }
        }
        result.add(graph);
        return result;
    }

    public int replaceCalls() {
        return replaceCalls;
    }
}
