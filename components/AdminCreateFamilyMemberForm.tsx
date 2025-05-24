import React, { useRef } from 'react'

const AdminCreateFamilyMemberForm = ({ handleAddFamilyMember, formData, handleInputChange, imagePreview, handleImageChange, isUploading, uploadProgress, handleClearImage }: { handleAddFamilyMember: (e: React.FormEvent<HTMLFormElement>) => void, formData: any, handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void, imagePreview: string | null, handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void, isUploading: boolean, uploadProgress: number, handleClearImage: () => void }) => {
    const US_STATES = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
      ];
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    return (
    <div>
      <div className="mt-8 bg-white shadow-lg p-8 rounded-lg mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">Create Family Member</h2>
        <form onSubmit={handleAddFamilyMember} className="space-y-4">
          <div className="grid md:grid-cols-4 md:gap-6">
            <div className="relative z-0 w-full mb-5 group">
              <input
                type="text"
                name="firstName"
                id="admin_first_name"
                value={formData.firstName}
                onChange={handleInputChange}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
                required
              />
              <label htmlFor="admin_first_name" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">First name</label>
            </div>
            <div className="relative z-0 w-full mb-5 group">
              <input
                type="text"
                name="lastName"
                id="admin_last_name"
                value={formData.lastName}
                onChange={handleInputChange}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
                required
              />
              <label htmlFor="admin_last_name" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Last name</label>
            </div>
            <div className="relative z-0 w-full mb-5 group">
            <input
              type="text"
              name="username"
              id="admin_username"
              value={formData.username}
              onChange={handleInputChange}
              className="block py-2.5 px-0 w-full text-sm bg-transparent border-0 border-b-2 border-gray-300 appearance-none text-black focus:outline-none focus:ring-0 focus:border-blue-600 peer"
              placeholder=" "
            />
            <label htmlFor="admin_username" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Username</label>
          </div>
          <div className="relative z-0 w-full mb-5 group">
            <input
              type="email"
              name="email"
              id="admin_email"
              value={formData.email}
              onChange={handleInputChange}
              className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
              placeholder=" "
            />
            <label htmlFor="admin_email" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Email address</label>
          </div>
          </div>
          <div className="grid md:grid-cols-4 md:gap-6">
            <div className="relative z-0 w-full mb-5 group">
              <input
                type="text"
                name="birth_city"
                id="admin_birth_city"
                value={formData.birth_city}
                onChange={handleInputChange}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
              />
              <label htmlFor="admin_birth_city" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Birth City/Town</label>
            </div>
            <div className="relative z-0 w-full mb-5 group">
              <select
                name="birth_state"
                id="admin_birth_state"
                value={formData.birth_state}
                onChange={handleInputChange}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
              >
                <option value="">Select Birth State</option>
                {US_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              <label htmlFor="admin_birth_state" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Birth State</label>
            </div>
            <div className="relative z-0 w-full mb-5 group">
              <input
                type="text"
                name="current_city"
                id="admin_current_city"
                value={formData.current_city}
                onChange={handleInputChange}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
              />
              <label htmlFor="admin_current_city" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Current City/Town</label>
            </div>
            <div className="relative z-0 w-full mb-5 group">
              <select
                name="current_state"
                id="admin_current_state"
                value={formData.current_state}
                onChange={handleInputChange}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
              >
                <option value="">Select Current State</option>
                {US_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              <label htmlFor="admin_current_state" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">State</label>
            </div>
          </div>
          <div className="grid md:grid-cols-4 md:gap-6">
            <div className="relative z-0 mb-5 group md:col-span-2 md:col-start-1">
              <input
                type="text"
                name="bio"
                id="admin_bio"
                value={formData.bio}
                onChange={handleInputChange}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
              />
              <label htmlFor="admin_bio" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Bio</label>
            </div>
            <div className="relative z-0 w-full mb-5 group md:row-span-1 md:col-span-1 md:col-start-3">
              <input
                type="date"
                name="birthday"
                id="admin_birthday"
                value={formData.birthday}
                onChange={handleInputChange}
                className="block py-2.5 px-0 w-full text-sm bg-transparent border-0 border-b-2 border-gray-300 appearance-none text-black focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
              />
              <label htmlFor="admin_birthday" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 whitespace-nowrap">Birthday (MM/DD/YYYY)</label>
            </div>
            <div className="relative z-0 w-full mb-5 group md:row-span-1 md:col-span-1 md:col-start-4">
              <input
                type="tel"
                name="phoneNumber"
                id="admin_phone"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
              />
              <label htmlFor="admin_phone" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Phone number</label>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-6 z-0 w-full mb-5 group">
            <div className="relative z-0 mb-5 group md:col-start-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
              <div className="flex items-center gap-2 w-full">
                <div className="avatar">
                  <div className="w-24 h-24 rounded-full">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Profile preview"
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
                  onChange={handleImageChange}
                  className="file-input file-input-bordered w-full bg-gray-200"
                  disabled={isUploading}
                  ref={fileInputRef}
                />
                {imagePreview && (
                  <button
                    type="button"
                    className="mx-2 px-3 py-1 bg-red-400 text-white rounded hover:bg-red-500"
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      handleClearImage();
                    }}
                  >
                    Clear
                  </button>
                )}
                {isUploading && (
                  <div className="w-full">
                    <progress
                      className="progress progress-success w-full"
                      value={uploadProgress}
                      max="100"
                    ></progress>
                    <p className="text-center text-sm text-gray-600 mt-1">
                      {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="relative z-0 mb-5 group md:col-span-2 md:col-start-1 md:row-span-1 md:col-span-1 md:col-start-3">
            <input
                type="date"
                name="death_date"
                id="admin_death_date"
                value={formData.death_date}
                onChange={handleInputChange}
                className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer"
                placeholder=" "
              />
            <label htmlFor="admin_death_date" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 whitespace-nowrap">Death Date</label>
            </div>
          </div>
          <button type="submit" className="text-white bg-yellow-800/80 hover:bg-yellow-800/90 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full px-5 py-2.5 text-center">
            Add Family Member
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminCreateFamilyMemberForm