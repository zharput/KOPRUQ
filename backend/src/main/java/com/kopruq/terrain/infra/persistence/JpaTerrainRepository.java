package com.kopruq.terrain.infra.persistence;

import com.kopruq.terrain.application.TerrainRepository;
import com.kopruq.terrain.model.TerrainModel;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/** PostgreSQL/JPA adapter of the {@link TerrainRepository} port. */
@Repository
@Transactional
public class JpaTerrainRepository implements TerrainRepository {

    private final TerrainJpaRepository jpa;

    public JpaTerrainRepository(TerrainJpaRepository jpa) {
        this.jpa = jpa;
    }

    /** Upsert by id: an existing row is updated in place (including its child rows), otherwise a row is inserted. */
    @Override
    public TerrainModel save(TerrainModel terrain) {
        TerrainEntity entity = jpa.findById(terrain.id()).orElseGet(() -> new TerrainEntity(terrain.id()));
        entity.apply(terrain);
        jpa.saveAndFlush(entity);
        return terrain;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<TerrainModel> findById(String id) {
        return jpa.findById(id).map(TerrainEntity::toDomain);
    }

    @Override
    public void deleteById(String id) {
        jpa.findById(id).ifPresent(e -> {
            jpa.delete(e);
            jpa.flush();
        });
    }
}
