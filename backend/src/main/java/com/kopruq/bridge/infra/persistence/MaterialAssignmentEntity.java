package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.model.MaterialAssignment;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Persistent form of one {@link MaterialAssignment}; {@code materialNo} is a plain number. */
@Entity
@Table(name = "family_material")
class MaterialAssignmentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "ordinal", nullable = false)
    private int ordinal;

    @Column(name = "assignment_id", nullable = false)
    private String assignmentId;

    @Column(name = "material_no")
    private Double materialNo;

    @Column(name = "element")
    private String element;

    @Column(name = "concrete_class")
    private String concreteClass;

    protected MaterialAssignmentEntity() {
    }

    MaterialAssignmentEntity(UUID projectId, int ordinal, MaterialAssignment m) {
        this.projectId = projectId;
        this.ordinal = ordinal;
        this.assignmentId = m.id();
        this.materialNo = m.no();
        this.element = m.element();
        this.concreteClass = m.concreteClass();
    }

    MaterialAssignment toDomain() {
        return new MaterialAssignment(assignmentId, materialNo, element, concreteClass);
    }
}
