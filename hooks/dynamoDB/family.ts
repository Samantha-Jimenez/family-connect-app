/**
 * Family table operations: members, profile, notification preferences.
 */

import { GetItemCommand, PutItemCommand, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth';
import { v4 as uuidv4 } from 'uuid';
import { getUserFamilyGroup, normalizeFamilyGroup } from '@/utils/demoConfig';
import { dynamoDB, TABLES } from './client';
import type { FamilyMember, NotificationPreferences } from './types';

export interface GetUserDataReturn {
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
  profile_photo?: string;
  current_city?: string;
  current_state?: string;
  city: string;
  state: string;
  cta_visible?: boolean;
  death_date: string;
  show_zodiac: boolean;
  social_media: { platform: string; url: string }[];
  pets: { name: string; birthday: string; death_date?: string; image?: string }[];
  hobbies: string[];
  languages: { name: string; proficiency: string }[];
  use_first_name: boolean;
  use_middle_name: boolean;
  use_nick_name: boolean;
}

export const saveUserToDB = async (
  first_name: string,
  last_name: string,
  middle_name: string,
  nick_name: string,
  email: string,
  username: string,
  bio: string,
  phone_number: string,
  birthday: string,
  birth_city: string,
  birth_state: string,
  profile_photo?: string,
  current_city?: string,
  current_state?: string,
  show_zodiac?: boolean,
  social_media?: { platform: string; url: string }[],
  pets?: { name: string; birthday: string; death_date?: string; image?: string }[],
  hobbies?: string[],
  languages?: { name: string; proficiency: string }[],
  use_first_name?: boolean,
  use_middle_name?: boolean,
  use_nick_name?: boolean
) => {
  try {
    const userAttributes = await fetchUserAttributes();
    const user = await getCurrentUser();

    if (!user || !user.userId) {
      throw new Error('User is not authenticated or missing userId.');
    }

    const userId = user.userId;
    const userEmail = userAttributes.email || email;

    if (!userId || !userEmail) {
      throw new Error('Missing userId or email.');
    }

    const userFamilyGroup = getUserFamilyGroup(userId);

    const item: Record<string, unknown> = {
      family_member_id: { S: userId },
      first_name: { S: first_name },
      last_name: { S: last_name },
      middle_name: { S: middle_name },
      nick_name: { S: nick_name },
      email: { S: userEmail },
      username: { S: username },
      bio: { S: bio },
      phone_number: { S: phone_number },
      birthday: { S: birthday },
      birth_city: { S: birth_city },
      birth_state: { S: birth_state },
      profile_photo: { S: profile_photo || '' },
      current_city: { S: current_city || '' },
      current_state: { S: current_state || '' },
      show_zodiac: { BOOL: show_zodiac ?? false },
      use_first_name: { BOOL: use_first_name ?? true },
      use_middle_name: { BOOL: use_middle_name ?? false },
      use_nick_name: { BOOL: use_nick_name ?? false },
    };

    if (userFamilyGroup) {
      item.family_group = { S: userFamilyGroup };
    }

    if (social_media && social_media.length > 0) {
      item.social_media = {
        L: social_media.map((sm) => ({
          M: {
            platform: { S: sm.platform },
            url: { S: sm.url },
          },
        })),
      };
    }

    if (pets && pets.length > 0) {
      item.pets = {
        L: pets.map((pet) => ({
          M: {
            name: { S: pet.name },
            birthday: { S: pet.birthday },
            death_date: { S: pet.death_date || '' },
            image: { S: pet.image || '' },
          },
        })),
      };
    }

    if (hobbies && hobbies.length > 0) {
      item.hobbies = {
        L: hobbies.map((hobby) => ({ S: hobby })),
      };
    }

    if (languages && languages.length > 0) {
      item.languages = {
        L: languages.map((lang) => ({
          M: {
            name: { S: lang.name },
            proficiency: { S: lang.proficiency },
          },
        })),
      };
    }

    await dynamoDB.send(
      new PutItemCommand({
        TableName: TABLES.FAMILY,
        Item: item as Record<string, import('@aws-sdk/client-dynamodb').AttributeValue>,
      })
    );
  } catch (error) {
    console.error('❌ Error saving user to DynamoDB:', error);
    throw error;
  }
};

export const getUserData = async (userId: string): Promise<GetUserDataReturn | null> => {
  try {
    if (!userId) {
      throw new Error('❌ userId is required.');
    }

    const data = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: userId } },
      })
    );

    if (!data.Item) {
      throw new Error('User not found');
    }

    const item = data.Item;
    return {
      first_name: item.first_name?.S || '',
      last_name: item.last_name?.S || '',
      middle_name: item.middle_name?.S || '',
      nick_name: item.nick_name?.S || '',
      email: item.email?.S || '',
      username: item.username?.S || '',
      bio: item.bio?.S || '',
      phone_number: item.phone_number?.S || '',
      birthday: item.birthday?.S || '',
      birth_city: item.birth_city?.S || '',
      birth_state: item.birth_state?.S || '',
      profile_photo: item.profile_photo?.S || undefined,
      current_city: item.current_city?.S || '',
      current_state: item.current_state?.S || '',
      city: item.city?.S || '',
      state: item.state?.S || '',
      cta_visible: item.cta_visible?.BOOL,
      death_date: item.death_date?.S || '',
      show_zodiac: item.show_zodiac?.BOOL ?? false,
      social_media:
        item.social_media?.L?.map((i: { M?: { platform?: { S?: string }; url?: { S?: string } } }) => ({
          platform: i.M?.platform?.S || '',
          url: i.M?.url?.S || '',
        })) || [],
      pets:
        item.pets?.L?.map((i: { M?: { name?: { S?: string }; birthday?: { S?: string }; death_date?: { S?: string }; image?: { S?: string } } }) => ({
          name: i.M?.name?.S || '',
          birthday: i.M?.birthday?.S || '',
          death_date: i.M?.death_date?.S || undefined,
          image: i.M?.image?.S || undefined,
        })) || [],
      hobbies: item.hobbies?.L?.map((i: { S?: string }) => i.S || '') || [],
      languages:
        item.languages?.L?.map((i: { M?: { name?: { S?: string }; proficiency?: { S?: string } } }) => ({
          name: i.M?.name?.S || '',
          proficiency: i.M?.proficiency?.S || '',
        })) || [],
      use_first_name: item.use_first_name?.BOOL ?? true,
      use_middle_name: item.use_middle_name?.BOOL ?? false,
      use_nick_name: item.use_nick_name?.BOOL ?? false,
    };
  } catch (error) {
    console.error('❌ Error fetching user data:', error);
    return null;
  }
};

export const getAllFamilyMembers = async (userId?: string, includeAllGroups?: boolean): Promise<FamilyMember[]> => {
  try {
    let currentUserId = userId;
    if (!currentUserId && !includeAllGroups) {
      try {
        const user = await getCurrentUser();
        currentUserId = user.userId;
      } catch {
        // User not authenticated
      }
    }

    const familyGroup = currentUserId ? getUserFamilyGroup(currentUserId) : '';

    const response = await dynamoDB.send(
      new ScanCommand({ TableName: TABLES.FAMILY })
    );

    if (!response.Items) {
      return [];
    }

    const mappedMembers = response.Items.map((item) => ({
      family_member_id: item.family_member_id?.S || '',
      first_name: item.first_name?.S || '',
      last_name: item.last_name?.S || '',
      middle_name: item.middle_name?.S || '',
      nick_name: item.nick_name?.S || '',
      email: item.email?.S || '',
      username: item.username?.S || '',
      bio: item.bio?.S || '',
      phone_number: item.phone_number?.S || '',
      birthday: item.birthday?.S || '',
      birth_city: item.birth_city?.S || '',
      birth_state: item.birth_state?.S || '',
      profile_photo: item.profile_photo?.S || '',
      current_city: item.current_city?.S || '',
      current_state: item.current_state?.S || '',
      death_date: item.death_date?.S || '',
      use_first_name: item.use_first_name?.BOOL ?? true,
      use_middle_name: item.use_middle_name?.BOOL ?? false,
      use_nick_name: item.use_nick_name?.BOOL ?? false,
      show_zodiac: item.show_zodiac?.BOOL ?? false,
      family_group: normalizeFamilyGroup(item.family_group?.S),
    }));

    if (includeAllGroups) {
      return mappedMembers;
    }

    return mappedMembers.filter((member) => normalizeFamilyGroup(member.family_group) === familyGroup);
  } catch (error) {
    console.error('❌ Error fetching family members:', error);
    return [];
  }
};

export const getAllHobbies = async (familyGroup?: string): Promise<string[]> => {
  try {
    const response = await dynamoDB.send(new ScanCommand({ TableName: TABLES.FAMILY }));

    if (!response.Items) {
      return [];
    }

    const allHobbies = new Set<string>();
    response.Items.forEach((item) => {
      if (familyGroup) {
        const memberGroup = normalizeFamilyGroup(item.family_group?.S);
        if (memberGroup !== familyGroup) return;
      }
      if (item.hobbies?.L) {
        item.hobbies.L.forEach((hobby: { S?: string }) => {
          const hobbyName = hobby.S || '';
          if (hobbyName.trim()) allHobbies.add(hobbyName.trim());
        });
      }
    });

    return Array.from(allHobbies).sort();
  } catch (error) {
    console.error('❌ Error fetching all hobbies:', error);
    return [];
  }
};

export const getFamilyMembersWithHobby = async (
  hobby: string
): Promise<Array<{ id: string; name: string; profile_photo?: string }>> => {
  try {
    const response = await dynamoDB.send(new ScanCommand({ TableName: TABLES.FAMILY }));

    if (!response.Items) {
      return [];
    }

    const members: Array<{ id: string; name: string; profile_photo?: string }> = [];

    response.Items.forEach((item) => {
      if (item.hobbies?.L) {
        const hobbies = item.hobbies.L.map((h: { S?: string }) => (h.S || '').trim().toLowerCase());
        if (hobbies.includes(hobby.trim().toLowerCase())) {
          const memberId = item.family_member_id?.S || '';
          if (memberId) {
            members.push({
              id: memberId,
              name: `${item.first_name?.S || ''} ${item.last_name?.S || ''}`.trim(),
              profile_photo: item.profile_photo?.S || undefined,
            });
          }
        }
      }
    });

    return members;
  } catch (error) {
    console.error('❌ Error fetching family members with hobby:', error);
    return [];
  }
};

export const getFamilyMembersWithoutEmail = async (): Promise<FamilyMember[]> => {
  try {
    const response = await dynamoDB.send(
      new ScanCommand({
        TableName: TABLES.FAMILY,
        FilterExpression: 'attribute_not_exists(email) OR email = :emptyString',
        ExpressionAttributeValues: { ':emptyString': { S: '' } },
      })
    );

    if (!response.Items) {
      return [];
    }

    return response.Items.map((item) => ({
      family_member_id: item.family_member_id?.S || '',
      first_name: item.first_name?.S || '',
      last_name: item.last_name?.S || '',
      middle_name: item.middle_name?.S || '',
      nick_name: item.nick_name?.S || '',
      email: item.email?.S || '',
      username: item.username?.S || '',
      bio: item.bio?.S || '',
      phone_number: item.phone_number?.S || '',
      birthday: item.birthday?.S || '',
      birth_city: item.birth_city?.S || '',
      birth_state: item.birth_state?.S || '',
      profile_photo: item.profile_photo?.S || '',
      current_city: item.current_city?.S || '',
      current_state: item.current_state?.S || '',
      death_date: item.death_date?.S || '',
      use_first_name: item.use_first_name?.BOOL ?? true,
      use_middle_name: item.use_middle_name?.BOOL ?? false,
      use_nick_name: item.use_nick_name?.BOOL ?? false,
      show_zodiac: item.show_zodiac?.BOOL ?? false,
    }));
  } catch (error) {
    console.error('❌ Error fetching family members without email:', error);
    return [];
  }
};

export const updateFamilyMember = async (
  familyMemberId: string,
  data: {
    firstName: string;
    lastName: string;
    middleName?: string;
    nickName?: string;
    email: string;
    username: string;
    bio: string;
    phoneNumber: string;
    birthday: string;
    birth_city: string;
    birth_state: string;
    profile_photo: string;
    current_city: string;
    current_state: string;
    death_date: string;
    family_group?: string;
    use_first_name?: boolean;
    use_middle_name?: boolean;
    use_nick_name?: boolean;
    show_zodiac?: boolean;
  }
) => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: familyMemberId } },
        UpdateExpression:
          'SET first_name = :firstName, last_name = :lastName, middle_name = :middleName, nick_name = :nickName, email = :email, username = :username, bio = :bio, phone_number = :phoneNumber, birthday = :birthday, birth_city = :birth_city, birth_state = :birth_state, profile_photo = :profile_photo, current_city = :current_city, current_state = :current_state, death_date = :death_date, family_group = :family_group, use_first_name = :use_first_name, use_middle_name = :use_middle_name, use_nick_name = :use_nick_name, show_zodiac = :show_zodiac',
        ExpressionAttributeValues: {
          ':firstName': { S: data.firstName },
          ':lastName': { S: data.lastName },
          ':middleName': { S: data.middleName || '' },
          ':nickName': { S: data.nickName || '' },
          ':email': { S: data.email },
          ':username': { S: data.username },
          ':bio': { S: data.bio },
          ':phoneNumber': { S: data.phoneNumber },
          ':birthday': { S: data.birthday },
          ':birth_city': { S: data.birth_city },
          ':birth_state': { S: data.birth_state },
          ':profile_photo': { S: data.profile_photo },
          ':current_city': { S: data.current_city },
          ':current_state': { S: data.current_state },
          ':death_date': { S: data.death_date },
          ':family_group': { S: data.family_group || '' },
          ':use_first_name': { BOOL: data.use_first_name ?? true },
          ':use_middle_name': { BOOL: data.use_middle_name ?? false },
          ':use_nick_name': { BOOL: data.use_nick_name ?? false },
          ':show_zodiac': { BOOL: data.show_zodiac ?? false },
        },
        ReturnValues: 'UPDATED_NEW',
      })
    );
  } catch (error) {
    console.error('❌ Error updating family member:', error);
    throw error;
  }
};

export const getUserDataById = async (memberId: string) => {
  try {
    const data = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: memberId } },
      })
    );
    return data.Item ? data.Item : null;
  } catch (error) {
    console.error('❌ Error fetching user data by ID:', error);
    throw error;
  }
};

export const addFamilyMember = async (memberData: {
  firstName: string;
  lastName: string;
  middleName?: string;
  nickName?: string;
  email: string;
  username?: string;
  bio?: string;
  phoneNumber?: string;
  birthday?: string;
  birth_city?: string;
  birth_state?: string;
  profile_photo: string;
  current_city?: string;
  current_state?: string;
  death_date?: string;
  family_group?: string;
}) => {
  try {
    await dynamoDB.send(
      new PutItemCommand({
        TableName: TABLES.FAMILY,
        Item: {
          family_member_id: { S: uuidv4() },
          first_name: { S: memberData.firstName },
          last_name: { S: memberData.lastName },
          middle_name: { S: memberData.middleName || '' },
          nick_name: { S: memberData.nickName || '' },
          email: { S: memberData.email },
          username: { S: memberData.username || '' },
          bio: { S: memberData.bio || '' },
          phone_number: { S: memberData.phoneNumber || '' },
          birthday: { S: memberData.birthday || '' },
          birth_city: { S: memberData.birth_city || '' },
          birth_state: { S: memberData.birth_state || '' },
          profile_photo: { S: memberData.profile_photo },
          current_city: { S: memberData.current_city || '' },
          current_state: { S: memberData.current_state || '' },
          death_date: { S: memberData.death_date || '' },
          use_first_name: { BOOL: true },
          use_middle_name: { BOOL: false },
          use_nick_name: { BOOL: false },
          family_group: { S: memberData.family_group || '' },
        },
      })
    );
  } catch (error) {
    console.error('❌ Error adding family member:', error);
    throw error;
  }
};

export const adminUpdateMemberHobbies = async (memberId: string, hobbies: string[]) => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: memberId } },
        UpdateExpression: 'SET hobbies = :hobbies',
        ExpressionAttributeValues: {
          ':hobbies': {
            L: hobbies.map((hobby) => ({ S: hobby.trim() })).filter((h) => h.S && h.S.length > 0),
          },
        },
      })
    );
  } catch (error) {
    console.error('❌ Error updating hobbies:', error);
    throw error;
  }
};

export const adminUpdateMemberSocialMedia = async (
  memberId: string,
  socialMedia: { platform: string; url: string }[]
) => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: memberId } },
        UpdateExpression: 'SET social_media = :social_media',
        ExpressionAttributeValues: {
          ':social_media': {
            L: socialMedia
              .filter((sm) => sm.platform.trim() && sm.url.trim())
              .map((sm) => ({
                M: {
                  platform: { S: sm.platform.trim() },
                  url: { S: sm.url.trim() },
                },
              })),
          },
        },
      })
    );
  } catch (error) {
    console.error('❌ Error updating social media:', error);
    throw error;
  }
};

export const adminUpdateMemberPets = async (
  memberId: string,
  pets: { name: string; birthday: string; death_date?: string; image?: string }[]
) => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: memberId } },
        UpdateExpression: 'SET pets = :pets',
        ExpressionAttributeValues: {
          ':pets': {
            L: pets.map((pet) => ({
              M: {
                name: { S: pet.name.trim() },
                birthday: { S: pet.birthday || '' },
                death_date: { S: pet.death_date || '' },
                image: { S: pet.image || '' },
              },
            })),
          },
        },
      })
    );
  } catch (error) {
    console.error('❌ Error updating pets:', error);
    throw error;
  }
};

export const adminUpdateMemberLanguages = async (
  memberId: string,
  languages: { name: string; proficiency: string }[]
) => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: memberId } },
        UpdateExpression: 'SET languages = :languages',
        ExpressionAttributeValues: {
          ':languages': {
            L: languages
              .filter((lang) => lang.name.trim() && lang.proficiency.trim())
              .map((lang) => ({
                M: {
                  name: { S: lang.name.trim() },
                  proficiency: { S: lang.proficiency.trim() },
                },
              })),
          },
        },
      })
    );
  } catch (error) {
    console.error('❌ Error updating languages:', error);
    throw error;
  }
};

export const getUserNameById = async (
  userId: string
): Promise<{ firstName: string; lastName: string } | null> => {
  try {
    const data = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: userId } },
      })
    );

    if (!data.Item) {
      return null;
    }

    const first_name = data.Item.first_name?.S || '';
    const last_name = data.Item.last_name?.S || '';
    const middle_name = data.Item.middle_name?.S || '';
    const nick_name = data.Item.nick_name?.S || '';
    const use_first_name = data.Item.use_first_name?.BOOL ?? true;
    const use_middle_name = data.Item.use_middle_name?.BOOL ?? false;
    const use_nick_name = data.Item.use_nick_name?.BOOL ?? false;

    let preferredFirstName = first_name;
    if (use_nick_name && nick_name) {
      preferredFirstName = nick_name;
    } else if (use_middle_name && middle_name) {
      preferredFirstName = middle_name;
    }

    return { firstName: preferredFirstName, lastName: last_name };
  } catch (error) {
    console.error('❌ Error fetching user name by ID:', error);
    return null;
  }
};

export const getProfilePhotoById = async (userId: string): Promise<string | null> => {
  try {
    const data = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: userId } },
      })
    );

    if (!data.Item || !data.Item.profile_photo) {
      return null;
    }

    return data.Item.profile_photo.S || null;
  } catch (error) {
    console.error('❌ Error fetching profile photo by ID:', error);
    return null;
  }
};

export const setUserCTAVisible = async (userId: string, visible: boolean) => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: userId } },
        UpdateExpression: 'SET cta_visible = :visible',
        ExpressionAttributeValues: { ':visible': { BOOL: visible } },
      })
    );
  } catch (error) {
    console.error('❌ Error updating CTA visibility:', error);
    throw error;
  }
};

export const getNotificationPreferencesFromDB = async (
  userId: string
): Promise<NotificationPreferences> => {
  try {
    const data = await dynamoDB.send(
      new GetItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: userId } },
      })
    );

    if (data.Item?.notification_preferences?.S) {
      return JSON.parse(data.Item.notification_preferences.S);
    }

    return { disabledTypes: [] };
  } catch (error) {
    console.error('❌ Error fetching notification preferences:', error);
    return { disabledTypes: [] };
  }
};

export const saveNotificationPreferencesToDB = async (
  userId: string,
  preferences: NotificationPreferences
): Promise<void> => {
  try {
    await dynamoDB.send(
      new UpdateItemCommand({
        TableName: TABLES.FAMILY,
        Key: { family_member_id: { S: userId } },
        UpdateExpression: 'SET notification_preferences = :prefs',
        ExpressionAttributeValues: {
          ':prefs': { S: JSON.stringify(preferences) },
        },
      })
    );
  } catch (error) {
    console.error('❌ Error saving notification preferences:', error);
    throw error;
  }
};
