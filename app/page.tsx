"use client";

import { Amplify } from "aws-amplify";
import awsconfig from "../aws-exports";
import { AuthProvider } from '../context/AuthContext';
import ProfileUserInfoCard from "@/components/ProfileUserInfoCard";
import TaggedPhotosCard from "@/components/TaggedPhotosCard";
import FavoritedPhotosCard from "@/components/FavoritedPhotosCard";
import FamilyMembersCard from "@/components/FamilyMembersCard";
import RecentUploadsCard from "@/components/RecentUploadsCard";
import Panel from "@/components/Panel";
import CallToAction from "@/components/CallToAction";
import { usePathname } from 'next/navigation';
import YourPhotosCard from "@/components/YourPhotosCard";

Amplify.configure(awsconfig);


export default function Home() {
  const pathname = usePathname();

  return (
    <AuthProvider>
      <div className="min-h-screen bg-white p-4 sm:p-6">
        <h1 className="text-4xl font-bold text-center mb-6 text-[#717568]">Welcome to Our Family Tree</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_16rem] gap-2 max-w-6xl mx-auto">
          <div className="col-span-1 sm:col-span-2">
            <ProfileUserInfoCard currentPath={pathname} />
          </div>
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 lg:row-span-5 lg:col-start-3">
            <Panel />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <CallToAction />
          </div>
          <div className="col-span-1">
            <TaggedPhotosCard />
          </div>
          {/* <div className="col-span-1">
            <FavoritedPhotosCard />
          </div> */}
          <div className="col-span-1">
            <YourPhotosCard />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <RecentUploadsCard />
          </div>
          <div className="col-span-1 sm:col-span-2">
            <FamilyMembersCard />
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}
