import React from 'react'

const PassedMemberOverview = ({ memberData }: { memberData: any }) => {
  return (
    <div className="flex flex-col gap-4">
        <h1>Memorial</h1>
        <p>allow members to add a comment in honor of the passed member</p>

        <div className="flex flex-col gap-4 border-2 border-gray-300 rounded-lg p-4">
            <h1 className="text-2xl font-bold">Leave a Comment</h1>
            <textarea placeholder="Add a comment" className="w-full h-16 border-2 border-gray-300 rounded-lg p-2" />
            <button className="bg-blue-500 text-white rounded-lg p-2">Submit</button>
        </div>
        <div className="flex flex-col gap-4 border-2 border-gray-300 rounded-lg p-4">
            <h1 className="text-2xl font-bold">Comments</h1>
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2">
                    <h2 className="text-lg font-bold">John Doe</h2>
                    <p className="text-sm text-gray-500">January 1, 2021</p>
                </div>
            </div>
        </div>
    </div>
  )
}

export default PassedMemberOverview