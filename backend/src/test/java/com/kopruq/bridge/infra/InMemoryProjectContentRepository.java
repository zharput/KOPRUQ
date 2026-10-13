package com.kopruq.bridge.infra;

import com.kopruq.bridge.application.ProjectContent;
import com.kopruq.bridge.application.ProjectContentRepository;
import com.kopruq.bridge.model.ProjectSection;
import com.kopruq.bridge.model.ProjectWorkspace;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** Test double of the {@link ProjectContentRepository} port. */
public class InMemoryProjectContentRepository implements ProjectContentRepository {

    private final Map<UUID, ProjectWorkspace> workspaces = new HashMap<>();
    private int replaceCalls;

    @Override
    public ProjectContent load(UUID projectId) {
        return new ProjectContent(workspaces.get(projectId));
    }

    @Override
    public void replace(UUID projectId, ProjectSection section) {
        replaceCalls++;
        switch (section) {
            case ProjectWorkspace workspace -> workspaces.put(projectId, workspace);
        }
    }

    public int replaceCalls() {
        return replaceCalls;
    }
}
