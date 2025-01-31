export default function TaggedPhotosCard() {
    return (
      <div className="card bg-[#ffdaad] text-black shadow-lg p-6">
        <h2 className="text-xl font-bold">📌 Tagged Photos</h2>
        <p className="mt-2">See the photos you're tagged in.</p>
        <button className="btn btn-outline mt-4">View Photos</button>
      </div>
    );
  }