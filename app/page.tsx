'use client';

import { useRouter } from 'next/navigation';

const sale = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 4'];

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <h1 className="text-3xl font-bold">Seleziona una Sala Riunioni</h1>
      <div className="flex space-x-4">
        {sale.map((sala) => (
          <button
            key={sala}
            onClick={() => router.push(`/sala/${encodeURIComponent(sala)}`)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-800 transition"
          >
            {sala}
          </button>
        ))}
      </div>
    </main>
  );
}
