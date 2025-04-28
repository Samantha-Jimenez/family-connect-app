import React from 'react'
import UpcomingEvents from './UpcomingEvents'
import PastEvents from './PastEvents'

const Panel = () => {
  return (
    <>
      <div className="bg-white rounded-3xl text-black shadow-lg mb-4">
        <UpcomingEvents />
      </div>
      <div className="bg-white rounded-3xl text-black shadow-lg">
        <PastEvents />
      </div>
    </>
  )
}

export default Panel