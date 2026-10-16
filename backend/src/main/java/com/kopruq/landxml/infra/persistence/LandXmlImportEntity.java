package com.kopruq.landxml.infra.persistence;

import com.kopruq.alignment.model.Alignment;
import com.kopruq.alignment.model.HorizontalElement;
import com.kopruq.alignment.model.Pvi;
import com.kopruq.alignment.model.VerticalProfile;
import com.kopruq.landxml.model.LandXmlImportResult;
import com.kopruq.terrain.model.TerrainModel;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

/**
 * Persistent form of a {@link LandXmlImportResult} WITHOUT its terrain: only a reference ({@code terrain_id}) is kept,
 * the terrain itself is stored by the terrain adapter. No alignment element rows means "no alignment"; no PVI rows
 * means "no vertical profile".
 */
@Entity
@Table(name = "landxml_import")
class LandXmlImportEntity {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "terrain_id", nullable = false, length = 36)
    private String terrainId;

    @Column(name = "profile_name")
    private String profileName;

    @ElementCollection
    @CollectionTable(name = "landxml_import_warning", joinColumns = @JoinColumn(name = "import_id"))
    @OrderColumn(name = "ordinal")
    @Column(name = "message", nullable = false)
    private List<String> warnings = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "landxml_alignment_element", joinColumns = @JoinColumn(name = "import_id"))
    @OrderColumn(name = "ordinal")
    private List<AlignmentElementEntity> alignmentElements = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "landxml_profile_pvi", joinColumns = @JoinColumn(name = "import_id"))
    @OrderColumn(name = "ordinal")
    private List<ProfilePviEntity> profilePvis = new ArrayList<>();

    protected LandXmlImportEntity() {
    }

    LandXmlImportEntity(String id) {
        this.id = id;
    }

    void apply(LandXmlImportResult r) {
        this.terrainId = r.terrain().id();
        this.profileName = r.profile() == null ? null : r.profile().name();

        this.warnings.clear();
        this.warnings.addAll(r.warnings());

        this.alignmentElements.clear();
        if (r.alignment() != null) {
            for (HorizontalElement element : r.alignment().elements()) {
                this.alignmentElements.add(AlignmentElementEntity.from(element));
            }
        }

        this.profilePvis.clear();
        if (r.profile() != null) {
            for (Pvi pvi : r.profile().pvis()) {
                this.profilePvis.add(ProfilePviEntity.from(pvi));
            }
        }
    }

    String getId() {
        return id;
    }

    String getTerrainId() {
        return terrainId;
    }

    LandXmlImportResult toDomain(TerrainModel terrain) {
        Alignment alignment = alignmentElements.isEmpty() ? null
                : new Alignment(alignmentElements.stream().map(AlignmentElementEntity::toDomain).toList());
        VerticalProfile profile = profilePvis.isEmpty() ? null
                : new VerticalProfile(profileName, profilePvis.stream().map(ProfilePviEntity::toDomain).toList());
        return new LandXmlImportResult(id, terrain, alignment, profile, List.copyOf(warnings));
    }
}
