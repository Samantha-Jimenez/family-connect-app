export default function FavoritedPhotosCard() {
    return (
      <div className="card bg-[#ffdaad] text-black p-6 shadow-lg">
        <h2 className="text-xl font-bold">⭐ Favorited Photos</h2>
        <p className="mt-2">Your favorite memories, all in one place.</p>
        <button className="btn btn-outline mt-4">View Favorites</button>
      </div>
    );
  }