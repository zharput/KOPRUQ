package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.application.ProjectRepository;
import com.kopruq.bridge.model.Project;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/** PostgreSQL/JPA adapter of the {@link ProjectRepository} port. */
@Repository
@Transactional
public class JpaProjectRepository implements ProjectRepository {

    private final ProjectJpaRepository jpa;

    public JpaProjectRepository(ProjectJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    public Project save(Project project) {
        ProjectEntity entity = jpa.findById(project.getId()).orElseGet(() -> new ProjectEntity(project.getId()));
        entity.apply(project);
        jpa.saveAndFlush(entity);
        return project;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Project> findById(UUID id) {
        return jpa.findById(id).map(ProjectEntity::toDomain);
    }
}
