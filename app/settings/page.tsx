"use client"
import { AttributeValue } from '@aws-sdk/client-dynamodb';
import React, { useState } from 'react'
import { saveUserToDB } from '../hooks/dynamoDB';

const Settings = () => {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveUserToDB(name, username, birthday);
  };

  const [userData] = useState<Record<string, AttributeValue> | null>(null);

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Username:</label>
        <input 
          type="text" 
          value={userData?.username?.S || username}
          onChange={(e) => setUsername(e.target.value)} 
          className="text-gray-800"
        />
      </div>
      <div>
        <label>Name:</label>
        <input 
          type="text" 
          value={userData?.name?.S || name} 
          onChange={(e) => setName(e.target.value)} 
          className="text-black"
        />
      </div>
      <div>
        <label>Birthday:</label>
        <input 
          type="date" 
          value={userData?.birthday?.S || birthday} 
          onChange={(e) => setBirthday(e.target.value)} 
          className="text-black"
        />
      </div>
      <button type="submit">Save</button>
    </form>
  );
}

export default Settings