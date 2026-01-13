import React, { useState, useMemo } from 'react'
import AdminCreateFamilyMemberForm from './AdminCreateFamilyMemberForm'
import { FamilyMember } from "@/hooks/dynamoDB";
import { getFullImageUrl } from '@/utils/imageUtils';
import { DEMO_FAMILY_GROUP, REAL_FAMILY_GROUP } from '@/utils/demoConfig';

// Define the correct type for form data
export type AdminFormData = {
  firstName: string;
  lastName: string;
  middleName: string;
  nickName: string;
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
};

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const AdminMembers = ({ familyMembers, handleAddFamilyMember, formData, handleInputChange, imagePreview, handleImageChange, isUploading, uploadProgress, handleClearImage, editingMemberId, setEditingMemberId, editFormData, setEditFormData, handleEditInputChange, handleUpdateMember, handleEditImageChange, editImagePreview, editIsUploading, editUploadProgress, sortField, sortDirection, handleSort, isDemoMember, setIsDemoMember }: { familyMembers: FamilyMember[], handleAddFamilyMember: (e: React.FormEvent<HTMLFormElement>) => void, formData: AdminFormData, handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void, imagePreview: string | null, handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void, isUploading: boolean, uploadProgress: number, handleClearImage: () => void, editingMemberId: string | null, setEditingMemberId: (id: string | null) => void, editFormData: AdminFormData, setEditFormData: (formData: AdminFormData) => void, handleEditInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void, handleUpdateMember: (e: React.FormEvent<HTMLFormElement>) => void, handleEditImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void, editImagePreview: string | null, editIsUploading: boolean, editUploadProgress: number, sortField: keyof FamilyMember | null, sortDirection: 'asc' | 'desc', handleSort: (field: keyof FamilyMember) => void, isDemoMember: boolean, setIsDemoMember: (value: boolean) => void }) => {
  
  const [showDemoMembers, setShowDemoMembers] = useState(false);

  // Filter members based on the toggle
  const filteredMembers = useMemo(() => {
    return familyMembers.filter(member => {
      const memberGroup = member.family_group || REAL_FAMILY_GROUP;
      if (showDemoMembers) {
        return memberGroup === DEMO_FAMILY_GROUP;
      } else {
        return memberGroup === REAL_FAMILY_GROUP;
      }
    });
  }, [familyMembers, showDemoMembers]);

  const renderSortableHeader = (field: keyof FamilyMember, label: string) => {
    const isActive = sortField === field;
    return (
      <th 
        className="px-4 py-2 text-left text-gray-700 cursor-pointer hover:bg-gray-300 select-none"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {isActive && (
            <span className="text-sm">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
          {!isActive && (
            <span className="text-sm text-gray-400">↕</span>
          )}
        </div>
      </th>
    );
  };

  return (
    <div>
        <AdminCreateFamilyMemberForm
            handleAddFamilyMember={handleAddFamilyMember}
            formData={formData}
            handleInputChange={handleInputChange}
            imagePreview={imagePreview}
            handleImageChange={handleImageChange}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            handleClearImage={handleClearImage}
            isDemoMember={isDemoMember}
            setIsDemoMember={setIsDemoMember}
        />

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Family Members</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Show:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDemoMembers(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !showDemoMembers
                      ? 'bg-yellow-800/80 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Real Members
                </button>
                <button
                  onClick={() => setShowDemoMembers(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showDemoMembers
                      ? 'bg-yellow-800/80 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Demo Members
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table w-full bg-white shadow-md rounded-lg">
              <thead className="bg-gray-200">
                <tr>
                  {renderSortableHeader('first_name', 'First Name')}
                  {renderSortableHeader('last_name', 'Last Name')}
                  {renderSortableHeader('middle_name', 'Middle Name')}
                  {renderSortableHeader('nick_name', 'Nick Name')}
                  {renderSortableHeader('email', 'Email')}
                  {renderSortableHeader('username', 'Username')}
                  <th className="px-4 py-2 text-left text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(member => (
                  <React.Fragment key={member.family_member_id}>
                    <tr
                      className="hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        if (editingMemberId === member.family_member_id) {
                          setEditingMemberId(null);
                        } else {
                          setEditingMemberId(member.family_member_id);
                          setEditFormData({
                            firstName: member.first_name,
                            lastName: member.last_name,
                            middleName: member.middle_name || '',
                            nickName: member.nick_name || '',
                            email: member.email,
                            username: member.username,
                            bio: member.bio,
                            phoneNumber: member.phone_number,
                            birthday: member.birthday,
                            birth_city: member.birth_city,
                            birth_state: member.birth_state,
                            profile_photo: member.profile_photo,
                            current_city: member.current_city,
                            current_state: member.current_state,
                            death_date: member.death_date,
                            family_group: member.family_group || REAL_FAMILY_GROUP,
                            use_first_name: member.use_first_name ?? true,
                            use_middle_name: member.use_middle_name ?? false,
                            use_nick_name: member.use_nick_name ?? false,
                            show_zodiac: member.show_zodiac ?? false,
                          });
                        }
                      }}
                    >
                      <td className="border-t px-4 py-2 text-gray-800">{member.first_name}</td>
                      <td className="border-t px-4 py-2 text-gray-800">{member.last_name}</td>
                      <td className="border-t px-4 py-2 text-gray-800">{member.middle_name || '-'}</td>
                      <td className="border-t px-4 py-2 text-gray-800">{member.nick_name || '-'}</td>
                      <td className="border-t px-4 py-2 text-gray-800">{member.email}</td>
                      <td className="border-t px-4 py-2 text-gray-800">{member.username}</td>
                      <td className="border-t px-4 py-2 text-gray-800">
                        <a href={`/profile/${member.family_member_id}`} className="btn bg-yellow-800/60 hover:bg-yellow-800/80 text-white border-none shadow-none">
                          View Profile
                        </a>
                      </td>
                    </tr>
                    {editingMemberId === member.family_member_id && (
                      <tr>
                        <td colSpan={7}>
                          <form onSubmit={handleUpdateMember} className="p-4 bg-gray-100 rounded-lg">
                            <div className="grid md:grid-cols-4 md:gap-6">
                              <div className="relative z-0 w-full mb-5 group">
                                <input
                                  type="text"
                                  name="firstName"
                                  id="edit_first_name"
                                  value={editFormData.firstName}
                                  onChange={handleEditInputChange}
                                  className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                  placeholder=" "
                                  required
                                />
                                <label htmlFor="edit_first_name" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">First name</label>
                              </div>
                              <div className="relative z-0 w-full mb-5 group">
                                <input
                                  type="text"
                                  name="lastName"
                                  id="edit_last_name"
                                  value={editFormData.lastName}
                                  onChange={handleEditInputChange}
                                  className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                  placeholder=" "
                                  required
                                />
                                <label htmlFor="edit_last_name" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Last name</label>
                              </div>
                              <div className="relative z-0 w-full mb-5 group">
                                <input
                                  type="text"
                                  name="middleName"
                                  id="edit_middle_name"
                                  value={editFormData.middleName}
                                  onChange={handleEditInputChange}
                                  className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                  placeholder=" "
                                />
                                <label htmlFor="edit_middle_name" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Middle name</label>
                              </div>
                              <div className="relative z-0 w-full mb-5 group">
                                <input
                                  type="text"
                                  name="nickName"
                                  id="edit_nick_name"
                                  value={editFormData.nickName}
                                  onChange={handleEditInputChange}
                                  className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                  placeholder=" "
                                />
                                <label htmlFor="edit_nick_name" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Nick name</label>
                              </div>
                            </div>
                            <div className="grid md:grid-cols-2 md:gap-6">
                              <div className="relative z-0 w-full mb-5 group">
                                <input
                                  type="text"
                                  name="birth_city"
                                  id="edit_birth_city"
                                  value={editFormData.birth_city}
                                  onChange={handleEditInputChange}
                                  className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                  placeholder=" "
                                />
                                <label htmlFor="edit_birth_city" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Birth City/Town</label>
                              </div>
                              <div className="relative z-0 w-full mb-5 group">
                                <select
                                  name="birth_state"
                                  id="edit_birth_state"
                                  value={editFormData.birth_state}
                                  onChange={handleEditInputChange}
                                  className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                >
                                  <option value="">Select Birth State</option>
                                  {US_STATES.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                  ))}
                                </select>
                                <label htmlFor="edit_birth_state" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Birth State</label>
                              </div>
                            </div>
                            <div className="relative z-0 w-full mb-5 group">
                              <input
                                type="text"
                                name="username"
                                id="edit_username"
                                value={editFormData.username}
                                onChange={handleEditInputChange}
                                className="block py-2.5 px-0 w-full text-sm bg-transparent border-0 border-b-2 border-gray-300 appearance-none text-black focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                placeholder=" "
                              />
                              <label htmlFor="edit_username" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Username</label>
                            </div>
                            <div className="relative z-0 w-full mb-5 group">
                              <input
                                type="email"
                                name="email"
                                id="edit_email"
                                value={editFormData.email}
                                onChange={handleEditInputChange}
                                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                placeholder=" "
                              />
                              <label htmlFor="edit_email" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Email address</label>
                            </div>
                            <div className="grid md:grid-cols-2 md:gap-6">
                              <div className="relative z-0 w-full mb-5 group">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="date"
                                    name="birthday"
                                    id="edit_birthday"
                                    value={editFormData.birthday}
                                    onChange={handleEditInputChange}
                                    className="block py-2.5 px-0 w-full text-sm bg-transparent border-0 border-b-2 border-gray-300 appearance-none text-black focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                    placeholder=" "
                                  />
                                  <label className="flex items-center gap-1 text-xs text-gray-600">
                                    <input
                                      type="checkbox"
                                      checked={!!(editFormData.birthday && editFormData.birthday.startsWith('1000-'))}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          // If birthday exists, replace year with 1000, otherwise set to 1000-01-01
                                          const currentDate = editFormData.birthday || '1000-01-01';
                                          const [, month, day] = currentDate.split('-');
                                          handleEditInputChange({
                                            target: {
                                              name: 'birthday',
                                              value: `1000-${month || '01'}-${day || '01'}`
                                            }
                                          } as any);
                                        } else {
                                          // If unchecking, set to current year or keep existing year
                                          const currentDate = editFormData.birthday || new Date().toISOString().split('T')[0];
                                          const [, month, day] = currentDate.split('-');
                                          const currentYear = new Date().getFullYear();
                                          handleEditInputChange({
                                            target: {
                                              name: 'birthday',
                                              value: `${currentYear}-${month || '01'}-${day || '01'}`
                                            }
                                          } as any);
                                        }
                                      }}
                                      className="checkbox checkbox-xs"
                                    />
                                    <span>Year unknown</span>
                                  </label>
                                </div>
                                <label htmlFor="edit_birthday" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Birthday (MM/DD/YYYY)</label>
                              </div>
                              <div className="relative z-0 w-full mb-5 group">
                                <input
                                  type="tel"
                                  name="phoneNumber"
                                  id="edit_phone"
                                  value={editFormData.phoneNumber}
                                  onChange={handleEditInputChange}
                                  className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                  placeholder=" "
                                />
                                <label htmlFor="edit_phone" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Phone number</label>
                              </div>
                            </div>
                            <div className="relative z-0 w-full mb-5 group">
                              <textarea
                                name="bio"
                                id="edit_bio"
                                value={editFormData.bio}
                                onChange={(e) => {
                                  handleEditInputChange(e);
                                  // Auto-resize textarea
                                  const textarea = e.target;
                                  textarea.style.height = 'auto';
                                  textarea.style.height = textarea.scrollHeight + 'px';
                                }}
                                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer resize-none overflow-hidden"
                                placeholder=" "
                                rows={2}
                                style={{ minHeight: '2.5rem' }}
                              />
                              <label htmlFor="edit_bio" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Bio</label>
                            </div>
                            
                            <div className="mb-6">
                              <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Name Display</h3>
                              <div className="grid md:grid-cols-[10rem_10rem_10rem] gap-4">
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    id="edit_use_first_name"
                                    name="primary_name"
                                    value="first_name"
                                    checked={editFormData.use_first_name ?? true}
                                    onChange={(e) => {
                                      setEditFormData({
                                        ...editFormData,
                                        use_first_name: true,
                                        use_middle_name: false,
                                        use_nick_name: false
                                      });
                                    }}
                                    className="radio radio-success w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-lime focus:ring-2"
                                  />
                                  <label htmlFor="edit_use_first_name" className="ml-2 text-sm text-gray-900">
                                    Use first name
                                  </label>
                                </div>
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    id="edit_use_middle_name"
                                    name="primary_name"
                                    value="middle_name"
                                    checked={editFormData.use_middle_name ?? false}
                                    disabled={!editFormData.middleName || editFormData.middleName.trim() === ''}
                                    onChange={(e) => {
                                      setEditFormData({
                                        ...editFormData,
                                        use_first_name: false,
                                        use_middle_name: true,
                                        use_nick_name: false
                                      });
                                    }}
                                    className="radio radio-success w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-lime focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                  <label htmlFor="edit_use_middle_name" className={`ml-2 text-sm text-gray-900 ${!editFormData.middleName || editFormData.middleName.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    Use middle name
                                  </label>
                                </div>
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    id="edit_use_nick_name"
                                    name="primary_name"
                                    value="nick_name"
                                    checked={editFormData.use_nick_name ?? false}
                                    disabled={!editFormData.nickName || editFormData.nickName.trim() === ''}
                                    onChange={(e) => {
                                      setEditFormData({
                                        ...editFormData,
                                        use_first_name: false,
                                        use_middle_name: false,
                                        use_nick_name: true
                                      });
                                    }}
                                    className="radio radio-success w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-lime focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                  <label htmlFor="edit_use_nick_name" className={`ml-2 text-sm text-gray-900 ${!editFormData.nickName || editFormData.nickName.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    Use nick name
                                  </label>
                                </div>
                              </div>
                            </div>

                            <div className="mb-4 flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="edit_show_zodiac"
                                name="show_zodiac"
                                checked={editFormData.show_zodiac ?? false}
                                onChange={(e) => {
                                  setEditFormData({
                                    ...editFormData,
                                    show_zodiac: e.target.checked
                                  });
                                }}
                                className="checkbox checkbox-success w-4 h-4 bg-gray-100 border-gray-300 rounded focus:ring-lime focus:ring-2 [--chkfg:white]"
                              />
                              <label htmlFor="edit_show_zodiac" className="ml-2 text-sm text-gray-900">
                                Show zodiac sign on profile
                              </label>
                            </div>

                            <div className="grid md:grid-cols-2 md:gap-6">
                              <div className="relative z-0 w-full mb-5 group">
                                <input
                                  type="text"
                                  name="current_city"
                                  id="edit_current_city"
                                  value={editFormData.current_city}
                                  onChange={handleEditInputChange}
                                  className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                  placeholder=" "
                                />
                                <label htmlFor="edit_current_city" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Current City/Town</label>
                              </div>
                              <div className="relative z-0 w-full mb-5 group">
                                <select
                                  name="current_state"
                                  id="edit_current_state"
                                  value={editFormData.current_state}
                                  onChange={handleEditInputChange}
                                  className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                >
                                  <option value="">Select Current State</option>
                                  {US_STATES.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                  ))}
                                </select>
                                <label htmlFor="edit_current_state" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">State</label>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 md:gap-6">
                              <div className="relative z-0 w-full mb-5 group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                                <div className="flex flex-col items-center gap-2 w-full">
                                  <div className="avatar">
                                    <div className="w-24 h-24 rounded-full">
                                      {editImagePreview ? (
                                        <img
                                          src={editImagePreview}
                                          alt="Profile preview"
                                          className="rounded-full object-cover w-24 h-24"
                                        />
                                      ) : editFormData.profile_photo ? (
                                        <img
                                          src={getFullImageUrl(editFormData.profile_photo)}
                                          alt="Current profile"
                                          className="rounded-full object-cover w-24 h-24"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                                          <span className="icon-[mdi--account] text-4xl text-gray-400" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleEditImageChange}
                                    className="file-input file-input-bordered w-full"
                                    disabled={editIsUploading}
                                  />
                                  {editIsUploading && (
                                    <div className="w-full">
                                      <progress
                                        className="progress progress-success w-full"
                                        value={editUploadProgress}
                                        max="100"
                                      ></progress>
                                      <p className="text-center text-sm text-gray-600 mt-1">
                                        {editUploadProgress}%
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="relative z-0 w-full mb-5 group">
                                <input
                                  type="date"
                                  name="death_date"
                                  id="edit_death_date"
                                  value={editFormData.death_date}
                                  onChange={handleEditInputChange}
                                  className="block py-2.5 px-0 w-full text-sm bg-transparent border-0 border-b-2 border-gray-300 appearance-none text-black focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                                  placeholder=" "
                                />
                                <label htmlFor="edit_death_date" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Death Date (MM/DD/YYYY)</label>
                              </div>

                            </div>

                            <div className="mb-4 flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="edit_isDemoMember"
                                checked={editFormData.family_group === DEMO_FAMILY_GROUP}
                                onChange={(e) => {
                                  const newFamilyGroup = e.target.checked ? DEMO_FAMILY_GROUP : REAL_FAMILY_GROUP;
                                  setEditFormData({
                                    ...editFormData,
                                    family_group: newFamilyGroup,
                                  });
                                }}
                                className="checkbox checkbox-sm"
                              />
                              <label htmlFor="edit_isDemoMember" className="text-sm font-medium text-gray-700 cursor-pointer">
                                Demo Family Member
                              </label>
                            </div>

                            <button type="submit" className="text-white bg-[#914F2F] hover:bg-[#914F2F]/90 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full px-5 py-2.5 text-center mt-2">
                              Update
                            </button>
                          </form>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

    </div>
  )
}

export default AdminMembers