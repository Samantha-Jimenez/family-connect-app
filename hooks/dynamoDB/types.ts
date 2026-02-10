/**
 * Shared types and constants for DynamoDB/S3 operations.
 * No runtime dependencies on AWS or React.
 */

export interface TaggedPerson {
  id: string;
  name: string;
}

export interface PhotoData {
  album_ids: string[];
  photo_id: string;
  url: string;
  s3_key: string;
  uploaded_by: string;
  upload_date: string;
  family_group?: string;
  metadata: {
    location: {
      country: string;
      state: string;
      city: string;
      neighborhood: string;
    };
    description: string;
    date_taken: string;
    people_tagged: TaggedPerson[];
  };
  lastModified: string;
}

export interface AlbumData {
  album_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_date: string;
  cover_photo_id?: string;
}

export interface FamilyMember {
  family_member_id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  nick_name: string;
  email: string;
  username: string;
  bio: string;
  phone_number: string;
  birthday: string;
  birth_city: string;
  birth_state: string;
  profile_photo: string;
  current_city: string;
  current_state: string;
  death_date: string;
  use_first_name: boolean;
  use_middle_name: boolean;
  use_nick_name: boolean;
  show_zodiac?: boolean;
  family_group?: string;
  social_media?: {
    platform: string;
    url: string;
  }[];
}

export type NotificationType =
  | 'birthday'
  | 'hobby_comment'
  | 'photo_comment'
  | 'photo_tag'
  | 'event_rsvp'
  | 'event_reminder'
  | 'event_cancelled';

export interface Notification {
  notification_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
  metadata?: Record<string, unknown>;
}

export type RelationshipType =
  | 'parent' | 'child' | 'sibling'
  | 'spouse' | 'ex_spouse' | 'partner'
  | 'grandparent' | 'grandchild' | 'great_grandparent' | 'great_grandchild'
  | 'aunt' | 'uncle' | 'niece' | 'nephew'
  | 'grand_aunt' | 'grand_uncle' | 'grand_niece' | 'grand_nephew'
  | 'great_grand_aunt' | 'great_grand_uncle' | 'great_grand_niece' | 'great_grand_nephew'
  | 'cousin' | 'second_cousin' | 'cousin_once_removed'
  | 'step_parent' | 'step_child' | 'step_sibling'
  | 'parent_in_law' | 'child_in_law' | 'sibling_in_law'
  | 'son_in_law' | 'daughter_in_law'
  | 'father_in_law' | 'mother_in_law'
  | 'brother_in_law' | 'sister_in_law'
  | 'uncle_in_law' | 'aunt_in_law' | 'niece_in_law' | 'nephew_in_law'
  | 'cousin_in_law'
  | 'guardian' | 'ward' | 'godparent' | 'godchild';

export interface FamilyRelationship {
  relationship_id: string;
  person_a_id: string;
  person_b_id: string;
  relationship_type: RelationshipType;
  relationship_subtype?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  notes?: string;
  created_date: string;
  created_by: string;
}

export interface RelationshipValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export const RELATIONSHIP_RULES: Record<RelationshipType, {
  inverse?: RelationshipType;
  bidirectional: boolean;
  autoCreateInverse?: boolean;
}> = {
  parent: { inverse: 'child', bidirectional: true, autoCreateInverse: true },
  child: { inverse: 'parent', bidirectional: true, autoCreateInverse: true },
  sibling: { inverse: 'sibling', bidirectional: true, autoCreateInverse: true },
  spouse: { inverse: 'spouse', bidirectional: true, autoCreateInverse: true },
  ex_spouse: { inverse: 'ex_spouse', bidirectional: true, autoCreateInverse: true },
  partner: { inverse: 'partner', bidirectional: true, autoCreateInverse: true },
  grandparent: { inverse: 'grandchild', bidirectional: true, autoCreateInverse: true },
  grandchild: { inverse: 'grandparent', bidirectional: true, autoCreateInverse: true },
  great_grandparent: { inverse: 'great_grandchild', bidirectional: true, autoCreateInverse: true },
  great_grandchild: { inverse: 'great_grandparent', bidirectional: true, autoCreateInverse: true },
  aunt: { inverse: 'niece', bidirectional: false, autoCreateInverse: false },
  uncle: { inverse: 'nephew', bidirectional: false, autoCreateInverse: false },
  niece: { inverse: 'aunt', bidirectional: false, autoCreateInverse: false },
  nephew: { inverse: 'uncle', bidirectional: false, autoCreateInverse: false },
  grand_aunt: { inverse: 'grand_niece', bidirectional: false, autoCreateInverse: false },
  grand_uncle: { inverse: 'grand_nephew', bidirectional: false, autoCreateInverse: false },
  grand_niece: { inverse: 'grand_aunt', bidirectional: false, autoCreateInverse: false },
  grand_nephew: { inverse: 'grand_uncle', bidirectional: false, autoCreateInverse: false },
  great_grand_aunt: { inverse: 'great_grand_niece', bidirectional: false, autoCreateInverse: false },
  great_grand_uncle: { inverse: 'great_grand_nephew', bidirectional: false, autoCreateInverse: false },
  great_grand_niece: { inverse: 'great_grand_aunt', bidirectional: false, autoCreateInverse: false },
  great_grand_nephew: { inverse: 'great_grand_uncle', bidirectional: false, autoCreateInverse: false },
  cousin: { inverse: 'cousin', bidirectional: true, autoCreateInverse: true },
  second_cousin: { inverse: 'second_cousin', bidirectional: true, autoCreateInverse: true },
  cousin_once_removed: { inverse: 'cousin_once_removed', bidirectional: true, autoCreateInverse: true },
  step_parent: { inverse: 'step_child', bidirectional: true, autoCreateInverse: true },
  step_child: { inverse: 'step_parent', bidirectional: true, autoCreateInverse: true },
  step_sibling: { inverse: 'step_sibling', bidirectional: true, autoCreateInverse: true },
  parent_in_law: { inverse: 'child_in_law', bidirectional: true, autoCreateInverse: true },
  child_in_law: { inverse: 'parent_in_law', bidirectional: true, autoCreateInverse: true },
  sibling_in_law: { inverse: 'sibling_in_law', bidirectional: true, autoCreateInverse: true },
  son_in_law: { inverse: 'father_in_law', bidirectional: false, autoCreateInverse: false },
  daughter_in_law: { inverse: 'mother_in_law', bidirectional: false, autoCreateInverse: false },
  father_in_law: { inverse: 'son_in_law', bidirectional: false, autoCreateInverse: false },
  mother_in_law: { inverse: 'daughter_in_law', bidirectional: false, autoCreateInverse: false },
  brother_in_law: { inverse: 'sister_in_law', bidirectional: false, autoCreateInverse: false },
  sister_in_law: { inverse: 'brother_in_law', bidirectional: false, autoCreateInverse: false },
  uncle_in_law: { inverse: 'niece_in_law', bidirectional: false, autoCreateInverse: false },
  aunt_in_law: { inverse: 'nephew_in_law', bidirectional: false, autoCreateInverse: false },
  niece_in_law: { inverse: 'uncle_in_law', bidirectional: false, autoCreateInverse: false },
  nephew_in_law: { inverse: 'aunt_in_law', bidirectional: false, autoCreateInverse: false },
  cousin_in_law: { inverse: 'cousin_in_law', bidirectional: true, autoCreateInverse: true },
  guardian: { inverse: 'ward', bidirectional: true, autoCreateInverse: true },
  ward: { inverse: 'guardian', bidirectional: true, autoCreateInverse: true },
  godparent: { inverse: 'godchild', bidirectional: true, autoCreateInverse: true },
  godchild: { inverse: 'godparent', bidirectional: true, autoCreateInverse: true },
};

export interface CalendarEventData {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  location?: string;
  description?: string;
  userId?: string;
  createdBy?: string;
  category?: 'birthday' | 'holiday' | 'family-event' | 'appointment';
  rrule?: {
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    byweekday?: number[];
    until?: string;
  };
}

export interface FamilyTreeNode {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo?: string;
  spouse?: FamilyTreeNode;
  previousSpouses?: FamilyTreeNode[];
  children?: FamilyTreeNode[];
  parents?: FamilyTreeNode[];
  siblings?: FamilyTreeNode[];
  relationships?: Array<{
    personId: string;
    relationshipType: RelationshipType;
    person: FamilyTreeNode;
  }>;
}

export interface NotificationPreferences {
  disabledTypes: NotificationType[];
}
