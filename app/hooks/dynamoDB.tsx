import { DynamoDBClient, PutItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { fetchUserAttributes } from '@aws-amplify/auth';
import { getCurrentUser } from "aws-amplify/auth";

// Set up DynamoDB client
const dynamoDB = new DynamoDBClient({ 
  region: process.env.NEXT_PUBLIC_AWS_PROJECT_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,  // Ensure these are set in env
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  }
});

export async function saveUserToDB(first_name: string, last_name: string, email: string, username: string, bio: string, phone_number: string, birthday: string) {
  try {
    const userAttributes = await fetchUserAttributes();
    const user = await getCurrentUser();
    console.log(user.userId, 'user');
    console.log(userAttributes.email, 'userAttributes');
    
    if (!user || !user.userId) {
      throw new Error("User is not authenticated or missing userId.");
    }

    const userId = user.userId;
    const email = userAttributes.email || '';

    if (!userId || !email) {
      throw new Error("Missing userId or email.");
    }

    // Prepare data for DynamoDB
    const params = {
      TableName: "Users",
      Item: {
        userId: { S: userId },
        first_name: { S: first_name },
        last_name: { S: last_name },
        email: { S: email },
        username: { S: username },
        bio: { S: bio },
        phone_number: { S: phone_number },
        birthday: { S: birthday }
      },
    };

    await dynamoDB.send(new PutItemCommand(params));
    console.log("✅ User data saved to DynamoDB!");
  } catch (error) {
    console.error("❌ Error saving user to DynamoDB:", error);
  }
}

export async function getUserData(userId: string) {
  try {
    if (!userId) {
      throw new Error("❌ userId is required.");
    }

    const params = {
      TableName: "Users",
      Key: {
        userId: { S: userId },
      },
    };

    const data = await dynamoDB.send(new GetItemCommand(params));
    return data.Item ? data.Item : null;
  } catch (error) {
    console.error("❌ Error fetching user data:", error);
    return null;
  }
}
