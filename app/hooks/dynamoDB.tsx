import { DynamoDBClient, PutItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { getCurrentUser } from '@aws-amplify/auth';

// Set up DynamoDB client
const dynamoDB = new DynamoDBClient({ region: "us-east-2" }); // Adjust region

export async function saveUserToDB(name: string, username: string, birthday: string) {
  try {
    const user = await getCurrentUser();
    const userId = user.userId;
    
    // Prepare data to save in DynamoDB
    const params = {
      TableName: "Users",
      Item: {
        userId: { S: userId },
        name: { S: name },
        username: { S: username },
        birthday: { S: birthday },
        email: { S: user.signInDetails?.loginId || '' },  // Email is typically the loginId
      },
    };
    
    await dynamoDB.send(new PutItemCommand(params));
    console.log("User data saved to DynamoDB!");
  } catch (error) {
    console.error("Error saving user to DynamoDB:", error);
  }
}

export async function getUserData(userId: string) {
  const params = {
    TableName: "Users",  // Your DynamoDB table name
    Key: {
      userId: { S: userId },
    },
  };

  try {
    const data = await dynamoDB.send(new GetItemCommand(params));
    return data.Item ? data.Item : null; // Return null if user data doesn't exist
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}