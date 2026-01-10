"use client";
import { Amplify } from "aws-amplify";
import { AuthProvider } from '../context/AuthContext';
import ProfileUserInfoCard from "@/components/ProfileUserInfoCard";
import TaggedPhotosCard from "@/components/TaggedPhotosCard";
import Panel from "@/components/Panel";
import CallToAction from "@/components/CallToAction";
import UploadedPhotosCard from "@/components/UploadedPhotosCard";
import { useEffect, useState } from 'react';
import { ToastProvider } from '../context/ToastContext';
import { UserProvider } from '../context/UserContext';
import { useAuthenticator } from '@aws-amplify/ui-react';
import FavoritedPhotosCard from "@/components/FavoritedPhotosCard";
import AlbumsCard from "@/components/AlbumsCard";
import { CalendarProvider } from '@/context/CalendarContext';
import Calendar from '@/app/calendar/page';
import LoadSpinner from '@/components/LoadSpinner';
import DemoNoticeModal from '@/components/DemoNoticeModal';
import { isDemoUser } from '@/utils/demoConfig';

// Move Amplify configuration into a try-catch block
try {
  const awsconfig = require("../aws-exports").default;
  Amplify.configure(awsconfig);
} catch (error) {
  console.error("Error configuring Amplify:", error);
}

type Tab = 'uploads' | 'tagged' | 'favorites' | 'albums';

const HomePage = () => {
  const { user } = useAuthenticator();
  const [isConfigured, setIsConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('uploads');
  const [showDemoNotice, setShowDemoNotice] = useState(false);

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

  // Show demo notice modal for demo users once per login session
  useEffect(() => {
    if (user?.userId && isDemoUser(user.userId)) {
      const sessionKey = `demoNoticeShown_${user.userId}`;
      const hasShownInSession = sessionStorage.getItem(sessionKey);
      
      // Only show if it hasn't been shown in this session
      if (!hasShownInSession) {
        // Small delay to ensure page is loaded
        setTimeout(() => {
          setShowDemoNotice(true);
        }, 500);
      }
    } else {
      // If user is not a demo user or logged out, hide the modal
      setShowDemoNotice(false);
    }
  }, [user?.userId]);

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <LoadSpinner size={64} />
      </div>
    );
  }

  const handleCloseDemoNotice = () => {
    setShowDemoNotice(false);
    // Mark as shown in sessionStorage so it won't show again until logout
    if (user?.userId) {
      const sessionKey = `demoNoticeShown_${user.userId}`;
      sessionStorage.setItem(sessionKey, 'true');
    }
  };

  return (
    <AuthProvider>
      <ToastProvider>
        <UserProvider>
          <CalendarProvider>
            <DemoNoticeModal 
              isOpen={showDemoNotice} 
              onClose={handleCloseDemoNotice}
            />
            <div className="min-h-screen bg-gray-100 p-2 sm:p-6 opacity-0 animate-[fadeIn_0.6s_ease-in_forwards]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_14rem] xl:grid-cols-[1fr_1fr_16rem] gap-4 max-w-7xl mx-auto">
                <div className="col-span-1 sm:col-span-2 opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]" style={{ animationDelay: '0.2s' }}>
                  <ProfileUserInfoCard userId={user.userId}/>
                </div>
                <div className="col-span-1 sm:col-span-2 lg:col-span-1 lg:row-span-5 lg:col-start-3 max-[1023px]:hidden opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]" style={{ animationDelay: '0.3s' }}>
                  <Panel />
                </div>
                <div className="col-span-1 sm:col-span-2 opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]" style={{ animationDelay: '0.4s' }}>
                  <CallToAction />
                </div>
                
                <div className="col-span-1 sm:col-span-2">
                  <div data-theme="light" className="tabs tabs-bordered bg-white rounded-lg shadow-lg opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]" style={{ animationDelay: '0.5s' }}>
                    <a 
                      className={`tab tab-lg text-sm poppins-light ${activeTab === 'uploads' ? 'tab-active' : ''}`}
                      onClick={() => setActiveTab('uploads')}
                    >
                      Uploads
                    </a>
                    <a 
                      className={`tab tab-lg text-sm poppins-light ${activeTab === 'tagged' ? 'tab-active' : ''}`}
                      onClick={() => setActiveTab('tagged')}
                    >
                      Tagged
                    </a>
                    <a
                      className={`tab tab-lg text-sm poppins-light ${activeTab === 'favorites' ? 'tab-active' : ''}`}
                      onClick={() => setActiveTab('favorites')}
                    >
                      Favorites
                    </a>
                    <a 
                      className={`tab tab-lg text-sm poppins-light ${activeTab === 'albums' ? 'tab-active' : ''}`}
                      onClick={() => setActiveTab('albums')}
                    >
                      Albums
                    </a>
                  </div>

                  <div className="mt-4 opacity-0 animate-[fadeIn_0.4s_ease-in_forwards]" style={{ animationDelay: '0.6s' }}>
                    {activeTab === 'uploads' && <UploadedPhotosCard userId={user.userId as string} />}
                    {activeTab === 'tagged' && <TaggedPhotosCard userId={user.userId} />}
                    {activeTab === 'favorites' && <FavoritedPhotosCard />}
                    {activeTab === 'albums' && <AlbumsCard userId={user.userId} auth={true}/>}
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
