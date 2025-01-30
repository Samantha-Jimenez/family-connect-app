"use client";

import React, { useState } from 'react'
import Image from 'next/image';

const Photos = () => {
  const [currentIndex, setCurrentIndex] = useState(0); // State to track the current index

  const images = [
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-1.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-2.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-3.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-4.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-5.jpg",
    "https://flowbite.s3.amazonaws.com/docs/gallery/square/image-6.jpg",
  ];

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length); // Cycle to the next image
  };

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length); // Cycle to the previous image
  };

  return (
    <div className='p-6'>
      <p className='text-2xl font-bold'>Photos</p>
      <form className="max-w-lg mx-auto">
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white" htmlFor="user_avatar">Upload file</label>
        <input className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400" aria-describedby="user_avatar_help" id="user_avatar" type="file" />
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-300" id="user_avatar_help">A profile picture is useful to confirm your are logged into your account</div>
      </form>
      <div className="flex items-center justify-center py-4 md:py-8 flex-wrap">
          <button type="button" className="border hover:bg-blue-700 focus:ring-4 focus:outline-none rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 border-blue-500 text-blue-500 hover:text-white hover:bg-blue-500 bg-gray-900 focus:ring-blue-800">All categories</button>
          <button type="button" className="border border-gray-900 bg-gray-900 hover:border-gray-700 focus:ring-4 focus:outline-none  rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 text-white focus:ring-gray-800">Shoes</button>
          <button type="button" className="border border-gray-900 bg-gray-900 hover:border-gray-700 focus:ring-4 focus:outline-none  rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 text-white focus:ring-gray-800">Bags</button>
          <button type="button" className="border border-gray-900 bg-gray-900 hover:border-gray-700 focus:ring-4 focus:outline-none  rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 text-white focus:ring-gray-800">Electronics</button>
          <button type="button" className="border border-gray-900 bg-gray-900 hover:border-gray-700 focus:ring-4 focus:outline-none  rounded-full text-base font-medium px-5 py-2.5 text-center me-3 mb-3 text-white focus:ring-gray-800">Gaming</button>
      </div>

{/* <div id="custom-controls-gallery" className="relative w-full overflow-hidden" data-carousel="slide">
    <div className="flex transition-transform duration-700 ease-in-out" id="carousel-items">
        <div className="min-w-full" data-carousel-item>
            <img src="https://flowbite.s3.amazonaws.com/docs/gallery/square/image.jpg" className="block max-w-full h-auto" alt="" />
        </div>
        <div className="min-w-full" data-carousel-item>
            <img src="https://flowbite.s3.amazonaws.com/docs/gallery/square/image-2.jpg" className="block max-w-full h-auto" alt="" />
        </div>
        <div className="min-w-full" data-carousel-item>
            <img src="https://flowbite.s3.amazonaws.com/docs/gallery/square/image-3.jpg" className="block max-w-full h-auto" alt="" />
        </div>
        <div className="min-w-full" data-carousel-item>
            <img src="https://flowbite.s3.amazonaws.com/docs/gallery/square/image-4.jpg" className="block max-w-full h-auto" alt="" />
        </div>
        <div className="min-w-full" data-carousel-item>
            <img src="https://flowbite.s3.amazonaws.com/docs/gallery/square/image-5.jpg" className="block max-w-full h-auto" alt="" />
        </div>
    </div>
    <div className="flex justify-center items-center pt-4">
        <button type="button" className="flex justify-center items-center me-4 h-full cursor-pointer group focus:outline-none" data-carousel-prev onClick={handlePrev}>
            <span className="text-gray-400 hover:text-gray-900 dark:hover:text-white group-focus:text-gray-900 dark:group-focus:text-white">
                <svg className="rtl:rotate-180 w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5H1m0 0 4 4M1 5l4-4"/>
                </svg>
                <span className="sr-only">Previous</span>
            </span>
        </button>
        <button type="button" className="flex justify-center items-center h-full cursor-pointer group focus:outline-none" data-carousel-next onClick={handleNext}>
            <span className="text-gray-400 hover:text-gray-900 dark:hover:text-white group-focus:text-gray-900 dark:group-focus:text-white">
                <svg className="rtl:rotate-180 w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
                </svg>
                <span className="sr-only">Next</span>
            </span>
        </button>
    </div>
</div> */}

        <div id="default-carousel" className="relative w-full" data-carousel="slide">
          <div className="relative h-56 overflow-hidden rounded-lg md:h-96">
              {images.map((image, index) => (
                  <div
                      key={index}
                      className={`absolute w-full h-full transition-opacity duration-700 ease-in-out ${
                          index === currentIndex ? 'opacity-100' : 'opacity-0'
                      }`}
                  >
                      <Image
                          src={image}
                          alt={`Slide ${index + 1}`}
                          fill
                          className="object-cover"
                          priority={index === 0}
                      />
                  </div>
              ))}
          </div>
          <div className="absolute z-30 flex -translate-x-1/2 bottom-5 left-1/2 space-x-3 rtl:space-x-reverse">
              {images.map((_, index) => (
                  <button
                      key={index}
                      type="button"
                      className={`w-3 h-3 rounded-full ${
                          currentIndex === index 
                              ? 'bg-white dark:bg-gray-800' 
                              : 'bg-white/50 dark:bg-gray-800/50'
                      }`}
                      aria-current={currentIndex === index}
                      aria-label={`Slide ${index + 1}`}
                      onClick={() => setCurrentIndex(index)}
                  />
              ))}
          </div>
          <div className="flex justify-center items-center pt-4">
            <button type="button" className="absolute top-0 start-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none" onClick={handlePrev}>
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-800/30 group-hover:bg-gray-800/60 group-focus:ring-4 group-focus:ring-white dark:group-focus:ring-gray-800/70 group-focus:outline-none">
                    <svg className="w-4 h-4 text-white dark:text-gray-800 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 1 1 5l4 4"/>
                    </svg>
                    <span className="sr-only">Previous</span>
                </span>
            </button>
            <button type="button" className="absolute top-0 end-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none" onClick={handleNext}>
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-800/30 group-hover:bg-gray-800/60 group-focus:ring-4 group-focus:ring-white dark:group-focus:ring-gray-800/70 group-focus:outline-none">
                    <svg className="w-4 h-4 text-white dark:text-gray-800 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4"/>
                    </svg>
                    <span className="sr-only">Next</span>
                </span>
            </button>
              {/* <button type="button" className="flex justify-center items-center me-4 h-full cursor-pointer group focus:outline-none" data-carousel-prev onClick={handlePrev}>
                  <span className="text-gray-400 hover:text-gray-900 dark:hover:text-white group-focus:text-gray-900 dark:group-focus:text-white">
                      <svg className="rtl:rotate-180 w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5H1m0 0 4 4M1 5l4-4"/>
                      </svg>
                      <span className="sr-only">Previous</span>
                  </span>
              </button>
              <button type="button" className="flex justify-center items-center h-full cursor-pointer group focus:outline-none" data-carousel-next onClick={handleNext}>
                  <span className="text-gray-400 hover:text-gray-900 dark:hover:text-white group-focus:text-gray-900 dark:group-focus:text-white">
                      <svg className="rtl:rotate-180 w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
                      </svg>
                      <span className="sr-only">Next</span>
                  </span>
              </button> */}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="grid gap-4">
              <div className="relative h-48">
                  <Image
                      className="rounded-lg object-cover"
                      src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image.jpg"
                      alt="Gallery image"
                      fill
                  />
              </div>
              <div>
                  <Image
                      className="h-auto max-w-full rounded-lg"
                      src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-1.jpg"
                      alt="Gallery image"
                      width={300}
                      height={300}
                  />
              </div>
              <div>
                  <Image
                      className="h-auto max-w-full rounded-lg"
                      src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-2.jpg"
                      alt="Gallery image"
                      width={300}
                      height={300}
                  />
              </div>
          </div>
          <div className="grid gap-4">
              <div>
                  <Image
                      className="h-auto max-w-full rounded-lg"
                      src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-3.jpg"
                      alt="Gallery image"
                      width={300}
                      height={300}
                  />
              </div>
              <div>
                  <Image
                      className="h-auto max-w-full rounded-lg"
                      src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-4.jpg"
                      alt="Gallery image"
                      width={300}
                      height={300}
                  />
              </div>
              <div>
                  <Image
                      className="h-auto max-w-full rounded-lg"
                      src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-5.jpg"
                      alt="Gallery image"
                      width={300}
                      height={300}
                  />
              </div>
          </div>
          <div className="grid gap-4">
              <div>
                  <Image
                      className="h-auto max-w-full rounded-lg"
                      src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-6.jpg"
                      alt="Gallery image"
                      width={300}
                      height={300}
                  />
              </div>
              <div>
                  <Image
                      className="h-auto max-w-full rounded-lg"
                      src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-7.jpg"
                      alt="Gallery image"
                      width={300}
                      height={300}
                  />
              </div>
              <div>
                  <Image
                      className="h-auto max-w-full rounded-lg"
                      src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-8.jpg"
                      alt="Gallery image"
                      width={300}
                      height={300}
                  />
              </div>
          </div>
          <div className="grid gap-4">
              <div>
                  <Image
                      className="h-auto max-w-full rounded-lg"
                      src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-9.jpg"
                      alt="Gallery image"
                      width={300}
                      height={300}
                  />
              </div>
              <div>
                  <Image
                      className="h-auto max-w-full rounded-lg"
                      src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-10.jpg"
                      alt="Gallery image"
                      width={300}
                      height={300}
                  />
              </div>
              <div>
                  <Image
                      className="h-auto max-w-full rounded-lg"
                      src="https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-11.jpg"
                      alt="Gallery image"
                      width={300}
                      height={300}
                  />
              </div>
          </div>
      </div>
    </div>
  )
}

export default Photos