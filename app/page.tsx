"use client";
import { Amplify } from "aws-amplify";
import { AuthProvider } from '../context/AuthContext';
import ProfileUserInfoCard from "@/components/ProfileUserInfoCard";
import TaggedPhotosCard from "@/components/TaggedPhotosCard";
import Panel from "@/components/Panel";
import CallToAction from "@/components/CallToAction";
import UploadedPhotosCard from "@/components/UploadedPhotosCard";
import { useEffect, useState } from 'react';
import Settings from "@/components/Settings";
import { ToastProvider } from '../context/ToastContext';
import { UserProvider } from '../context/UserContext';
import { useAuthenticator } from '@aws-amplify/ui-react';
import FavoritedPhotosCard from "@/components/FavoritedPhotosCard";
import AlbumsCard from "@/components/AlbumsCard";
import { CalendarProvider } from '@/context/CalendarContext';
import Calendar from '@/app/calendar/page';

// Move Amplify configuration into a try-catch block
try {
  const awsconfig = require("../aws-exports").default;
  Amplify.configure(awsconfig);
} catch (error) {
  console.error("Error configuring Amplify:", error);
}

type Tab = 'uploads' | 'tagged' | 'favorites' | 'albums' | 'settings';

const HomePage = () => {
  const { user } = useAuthenticator();
  const [isConfigured, setIsConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('uploads');

  useEffect(() => {
    try {
      const awsconfig = require("../aws-exports").default;
      Amplify.configure(awsconfig);
      setIsConfigured(true);
    } catch (error) {
      console.error("Error configuring Amplify:", error);
      setIsConfigured(false);
    }
  }, []);

  if (!isConfigured) {
    return <div>Loading...</div>;
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <UserProvider>
          <CalendarProvider>
            <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_16rem] gap-4 max-w-7xl mx-auto">
                <div className="col-span-1 sm:col-span-2">
                  <ProfileUserInfoCard userId={user.userId}/>
                </div>
                <div className="col-span-1 sm:col-span-2 lg:col-span-1 lg:row-span-5 lg:col-start-3">
                  <Panel />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <CallToAction />
                </div>
                
                <div className="col-span-1 sm:col-span-2">
                  <div data-theme="light" className="tabs tabs-bordered rounded-lg shadow-lg">
                    <a 
                      className={`tab tab-lg ${activeTab === 'uploads' ? 'tab-active' : ''}`}
                      onClick={() => setActiveTab('uploads')}
                    >
                      Uploads
                    </a>
                    <a 
                      className={`tab tab-lg ${activeTab === 'tagged' ? 'tab-active' : ''}`}
                      onClick={() => setActiveTab('tagged')}
                    >
                      Tagged
                    </a>
                    <a
                      className={`tab tab-lg ${activeTab === 'favorites' ? 'tab-active' : ''}`}
                      onClick={() => setActiveTab('favorites')}
                    >
                      Favorites
                    </a>
                    <a 
                      className={`tab tab-lg ${activeTab === 'albums' ? 'tab-active' : ''}`}
                      onClick={() => setActiveTab('albums')}
                    >
                      Albums
                    </a>
                    <a 
                      className={`tab tab-lg ${activeTab === 'settings' ? 'tab-active' : ''}`}
                      onClick={() => setActiveTab('settings')}
                    >
                      Settings
                    </a>
                  </div>

                  <div className="mt-4">
                    {activeTab === 'uploads' && <UploadedPhotosCard />}
                    {activeTab === 'tagged' && <TaggedPhotosCard userId={user.userId} />}
                    {activeTab === 'favorites' && <FavoritedPhotosCard />}
                    {activeTab === 'albums' && <AlbumsCard userId={user.userId} auth={true}/>}
                    {activeTab === 'settings' && <Settings />}
                  </div>
                </div>
              </div>
            </div>
          </CalendarProvider>
        </UserProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

export default HomePage;
