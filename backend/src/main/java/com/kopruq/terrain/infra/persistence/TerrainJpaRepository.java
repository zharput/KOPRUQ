package com.kopruq.terrain.infra.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data access to {@link TerrainEntity}; used only by {@link JpaTerrainRepository}. */
interface TerrainJpaRepository extends JpaRepository<TerrainEntity, String> {
}
