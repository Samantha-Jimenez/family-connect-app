import React from 'react'
import RSVP from './RSVP'

const ProfileOverview = ({ userId }: { userId: string }) => {
  return (
    <div>
        <RSVP userId={userId} />

        {/* ADD MORE COMPONENTS HERE */}
        <div className="card bg-white text-black shadow-lg p-6 col-span-1 sm:col-span-2">
            <h2 className="text-xl font-bold">🌳 Family Tree</h2>
            <p className="mt-2">Explore your family connections.</p>
            <button className="btn btn-outline mt-4 bg-[#717568] text-white border-0">View Family Tree</button>
        </div>
    </div>
  )
}

export default ProfileOverview