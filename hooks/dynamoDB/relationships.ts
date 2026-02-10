/**
 * Family relationships and family tree operations.
 */

import {
  DeleteItemCommand,
  PutItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { getCurrentUser } from 'aws-amplify/auth';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDB, TABLES } from './client';
import { getAllFamilyMembers } from './family';
import type {
  FamilyMember,
  FamilyRelationship,
  FamilyTreeNode,
  RelationshipType,
  RelationshipValidationResult,
} from './types';
import { RELATIONSHIP_RULES } from './types';

async function checkIfAncestor(
  ancestorId: string,
  descendantId: string,
  visited: Set<string> = new Set(),
  depth: number = 0,
  maxDepth: number = 10
): Promise<boolean> {
  try {
    if (visited.has(descendantId) || depth > maxDepth) {
      return false;
    }
    visited.add(descendantId);

    const relationships = await getFamilyRelationships(descendantId);

    for (const rel of relationships) {
      if (rel.relationship_type === 'parent') {
        if (rel.person_b_id === descendantId) {
          const parentId = rel.person_a_id;
          if (parentId === ancestorId) return true;
          if (await checkIfAncestor(ancestorId, parentId, visited, depth + 1, maxDepth)) {
            return true;
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.error('❌ Error checking ancestry:', error);
    return false;
  }
}

export const validateRelationship = async (
  personA: string,
  personB: string,
  relationshipType: RelationshipType
): Promise<RelationshipValidationResult> => {
  try {
    if (personA === personB) {
      return { valid: false, error: 'A person cannot have a relationship with themselves' };
    }

    const existingRelationships = await getFamilyRelationships(personA);
    const duplicateRelationship = existingRelationships.find(
      (rel) =>
        ((rel.person_a_id === personA && rel.person_b_id === personB) ||
          (rel.person_a_id === personB && rel.person_b_id === personA)) &&
        rel.relationship_type === relationshipType
    );

    if (duplicateRelationship) {
      return {
        valid: false,
        error: `Relationship already exists between these members: ${duplicateRelationship.relationship_type}`,
      };
    }

    if (relationshipType === 'parent') {
      try {
        const validationPromise = checkIfAncestor(personB, personA, new Set());
        const timeoutPromise = new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Validation timeout')), 5000)
        );
        const isAncestor = await Promise.race([validationPromise, timeoutPromise]);
        if (isAncestor) {
          return { valid: false, error: 'This would create a circular parent-child relationship' };
        }
      } catch (error) {
        console.warn('⚠️ Relationship validation timeout or error:', error);
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('❌ Error validating relationship:', error);
    return { valid: false, error: 'Error validating relationship' };
  }
};

export const addFamilyRelationship = async (
  sourceId: string,
  targetId: string,
  relationshipType: RelationshipType,
  options?: {
    relationshipSubtype?: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
    autoCreateInverse?: boolean;
  }
): Promise<string> => {
  try {
    const validation = await validateRelationship(sourceId, targetId, relationshipType);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const relationshipId = uuidv4();
    const currentUser = await getCurrentUser();
    const createdBy = currentUser.userId;

    await dynamoDB.send(
      new PutItemCommand({
        TableName: TABLES.RELATIONSHIPS,
        Item: {
          relationship_id: { S: relationshipId },
          source_id: { S: sourceId },
          target_id: { S: targetId },
          relationship_type: { S: relationshipType },
          relationship_subtype: { S: options?.relationshipSubtype || '' },
          start_date: { S: options?.startDate || '' },
          end_date: { S: options?.endDate || '' },
          is_active: { BOOL: true },
          notes: { S: options?.notes || '' },
          created_date: { S: new Date().toISOString() },
          created_by: { S: createdBy },
        },
      })
    );

    const shouldCreateInverse =
      options?.autoCreateInverse !== false &&
      RELATIONSHIP_RULES[relationshipType]?.autoCreateInverse;

    if (shouldCreateInverse && RELATIONSHIP_RULES[relationshipType]?.inverse) {
      const inverseType = RELATIONSHIP_RULES[relationshipType].inverse!;
      const inverseRelationshipId = uuidv4();
      await dynamoDB.send(
        new PutItemCommand({
          TableName: TABLES.RELATIONSHIPS,
          Item: {
            relationship_id: { S: inverseRelationshipId },
            source_id: { S: targetId },
            target_id: { S: sourceId },
            relationship_type: { S: inverseType },
            relationship_subtype: { S: options?.relationshipSubtype || '' },
            start_date: { S: options?.startDate || '' },
            end_date: { S: options?.endDate || '' },
            is_active: { BOOL: true },
            notes: { S: options?.notes || '' },
            created_date: { S: new Date().toISOString() },
            created_by: { S: createdBy },
          },
        })
      );
    }

    return relationshipId;
  } catch (error) {
    console.error('❌ Error adding relationship:', error);
    throw error;
  }
};

export const getFamilyRelationships = async (
  familyMemberId: string,
  userId?: string
): Promise<FamilyRelationship[]> => {
  try {
    let familyMemberIds: string[] = [];
    if (userId) {
      const familyMembers = await getAllFamilyMembers(userId);
      familyMemberIds = familyMembers.map((m) => m.family_member_id);
    } else {
      try {
        const user = await getCurrentUser();
        if (user?.userId) {
          const familyMembers = await getAllFamilyMembers(user.userId);
          familyMemberIds = familyMembers.map((m) => m.family_member_id);
        }
      } catch {
        // User not authenticated
      }
    }

    const response = await dynamoDB.send(
      new ScanCommand({
        TableName: TABLES.RELATIONSHIPS,
        FilterExpression: 'source_id = :id OR target_id = :id',
        ExpressionAttributeValues: { ':id': { S: familyMemberId } },
      })
    );

    if (!response.Items) {
      return [];
    }

    const relationships = response.Items.map((item) => ({
      relationship_id: item.relationship_id?.S || '',
      person_a_id: item.source_id?.S || '',
      person_b_id: item.target_id?.S || '',
      relationship_type: (item.relationship_type?.S as RelationshipType) || 'sibling',
      relationship_subtype: item.relationship_subtype?.S || '',
      start_date: item.start_date?.S || '',
      end_date: item.end_date?.S || '',
      is_active: item.is_active?.BOOL ?? true,
      notes: item.notes?.S || '',
      created_date: item.created_date?.S || '',
      created_by: item.created_by?.S || '',
    }));

    if (familyMemberIds.length > 0) {
      return relationships.filter(
        (rel) =>
          familyMemberIds.includes(rel.person_a_id) && familyMemberIds.includes(rel.person_b_id)
      );
    }

    return relationships;
  } catch (error) {
    console.error('❌ Error fetching relationships:', error);
    return [];
  }
};

export const removeFamilyRelationship = async (relationshipId: string): Promise<void> => {
  try {
    await dynamoDB.send(
      new DeleteItemCommand({
        TableName: TABLES.RELATIONSHIPS,
        Key: { relationship_id: { S: relationshipId } },
      })
    );
  } catch (error) {
    console.error('❌ Error removing relationship:', error);
    throw error;
  }
};

function getInverseRelationshipType(relationshipType: RelationshipType): RelationshipType {
  const rule = RELATIONSHIP_RULES[relationshipType];
  return rule?.inverse ?? relationshipType;
}

function buildRelationshipGraph(relationships: FamilyRelationship[]) {
  const graph = new Map<string, Set<string>>();
  const relationshipTypes = new Map<string, Map<string, RelationshipType>>();

  relationships.forEach((rel) => {
    if (!graph.has(rel.person_a_id)) {
      graph.set(rel.person_a_id, new Set());
      relationshipTypes.set(rel.person_a_id, new Map());
    }
    if (!graph.has(rel.person_b_id)) {
      graph.set(rel.person_b_id, new Set());
      relationshipTypes.set(rel.person_b_id, new Map());
    }
    graph.get(rel.person_a_id)!.add(rel.person_b_id);
    graph.get(rel.person_b_id)!.add(rel.person_a_id);
    const inverseType = getInverseRelationshipType(rel.relationship_type);
    relationshipTypes.get(rel.person_a_id)!.set(rel.person_b_id, rel.relationship_type);
    relationshipTypes.get(rel.person_b_id)!.set(rel.person_a_id, inverseType);
  });

  return { graph, relationshipTypes };
}

async function buildNode(
  personId: string,
  relationshipGraph: {
    graph: Map<string, Set<string>>;
    relationshipTypes: Map<string, Map<string, RelationshipType>>;
  },
  allMembers: FamilyMember[],
  visited: Set<string>,
  depth: number = 0,
  maxDepth: number = 5
): Promise<FamilyTreeNode | null> {
  if (depth > maxDepth) return null;
  if (visited.has(personId)) return null;
  visited.add(personId);

  const member = allMembers.find((m) => m.family_member_id === personId);
  if (!member) return null;

  const node: FamilyTreeNode = {
    id: member.family_member_id,
    first_name: member.first_name,
    last_name: member.last_name,
    profile_photo: member.profile_photo,
    relationships: [],
  };

  const connectedPersons = relationshipGraph.graph.get(personId) || new Set();
  let spouse: FamilyTreeNode | undefined;
  const children: FamilyTreeNode[] = [];
  const parents: FamilyTreeNode[] = [];
  const siblings: FamilyTreeNode[] = [];

  for (const connectedPersonId of connectedPersons) {
    const relationshipType = relationshipGraph.relationshipTypes
      .get(personId)
      ?.get(connectedPersonId);
    if (!relationshipType) continue;

    const branchVisited = new Set(visited);
    const connectedPerson = await buildNode(
      connectedPersonId,
      relationshipGraph,
      allMembers,
      branchVisited,
      depth + 1,
      maxDepth
    );
    if (!connectedPerson) continue;

    node.relationships!.push({
      personId: connectedPersonId,
      relationshipType,
      person: connectedPerson,
    });

    switch (relationshipType) {
      case 'spouse':
        spouse = connectedPerson;
        break;
      case 'child':
        children.push(connectedPerson);
        break;
      case 'parent':
        parents.push(connectedPerson);
        break;
      case 'sibling':
        siblings.push(connectedPerson);
        break;
    }
  }

  if (spouse) node.spouse = spouse;
  if (children.length > 0) node.children = children;
  if (parents.length > 0) node.parents = parents;
  if (siblings.length > 0) node.siblings = siblings;

  return node;
}

async function generateTreeStructure(
  rootPersonId: string,
  relationshipGraph: {
    graph: Map<string, Set<string>>;
    relationshipTypes: Map<string, Map<string, RelationshipType>>;
  },
  allMembers: FamilyMember[]
): Promise<FamilyTreeNode | null> {
  const member = allMembers.find((m) => m.family_member_id === rootPersonId);
  if (!member) return null;
  const visited = new Set<string>();
  return buildNode(rootPersonId, relationshipGraph, allMembers, visited);
}

export const getAllFamilyRelationships = async (
  userId?: string
): Promise<FamilyRelationship[]> => {
  try {
    let familyMemberIds: string[] = [];
    if (userId) {
      const familyMembers = await getAllFamilyMembers(userId);
      familyMemberIds = familyMembers.map((m) => m.family_member_id);
    } else {
      try {
        const user = await getCurrentUser();
        if (user?.userId) {
          const familyMembers = await getAllFamilyMembers(user.userId);
          familyMemberIds = familyMembers.map((m) => m.family_member_id);
        }
      } catch {
        // User not authenticated
      }
    }

    const response = await dynamoDB.send(new ScanCommand({ TableName: TABLES.RELATIONSHIPS }));

    if (!response.Items) {
      return [];
    }

    const relationships = response.Items.map((item) => ({
      relationship_id: item.relationship_id?.S || '',
      person_a_id: item.source_id?.S || '',
      person_b_id: item.target_id?.S || '',
      relationship_type: (item.relationship_type?.S as RelationshipType) || 'sibling',
      relationship_subtype: item.relationship_subtype?.S || '',
      start_date: item.start_date?.S || '',
      end_date: item.end_date?.S || '',
      is_active: item.is_active?.BOOL ?? true,
      notes: item.notes?.S || '',
      created_date: item.created_date?.S || '',
      created_by: item.created_by?.S || '',
    }));

    if (familyMemberIds.length > 0) {
      return relationships.filter(
        (rel) =>
          familyMemberIds.includes(rel.person_a_id) && familyMemberIds.includes(rel.person_b_id)
      );
    }

    return relationships;
  } catch (error) {
    console.error('❌ Error fetching all relationships:', error);
    return [];
  }
};

export const buildFamilyTreeFromRelationships = async (
  rootPersonId: string
): Promise<FamilyTreeNode | null> => {
  try {
    const allRelationships = await getAllFamilyRelationships();
    const allMembers = await getAllFamilyMembers();
    const relationshipGraph = buildRelationshipGraph(allRelationships);
    return generateTreeStructure(rootPersonId, relationshipGraph, allMembers);
  } catch (error) {
    console.error('❌ Error building family tree:', error);
    return null;
  }
};

export const suggestPossibleRelationships = async (
  personAId: string,
  personBId: string
): Promise<Array<{ relationshipType: RelationshipType; confidence: number; reason: string }>> => {
  try {
    const personARelationships = await getFamilyRelationships(personAId);
    const personBRelationships = await getFamilyRelationships(personBId);
    const allMembers = await getAllFamilyMembers();

    const suggestions: Array<{
      relationshipType: RelationshipType;
      confidence: number;
      reason: string;
    }> = [];

    const personAConnections = personARelationships.map((rel) => ({
      personId: rel.person_a_id === personAId ? rel.person_b_id : rel.person_a_id,
      relationshipType: rel.relationship_type,
    }));

    const personBConnections = personBRelationships.map((rel) => ({
      personId: rel.person_a_id === personBId ? rel.person_b_id : rel.person_a_id,
      relationshipType: rel.relationship_type,
    }));

    const commonConnections = personAConnections.filter((connA) =>
      personBConnections.some((connB) => connB.personId === connA.personId)
    );

    for (const commonConn of commonConnections) {
      const personBConnToCommon = personBConnections.find(
        (conn) => conn.personId === commonConn.personId
      );
      if (!personBConnToCommon) continue;

      if (
        commonConn.relationshipType === 'parent' &&
        personBConnToCommon.relationshipType === 'parent'
      ) {
        suggestions.push({
          relationshipType: 'sibling',
          confidence: 0.9,
          reason: `Both are children of the same parent (${commonConn.personId})`,
        });
      }

      if (
        commonConn.relationshipType === 'parent' &&
        personBConnToCommon.relationshipType === 'child'
      ) {
        suggestions.push({
          relationshipType: 'grandparent',
          confidence: 0.8,
          reason: 'One is parent and other is child of the same person',
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  } catch (error) {
    console.error('❌ Error suggesting relationships:', error);
    return [];
  }
};
