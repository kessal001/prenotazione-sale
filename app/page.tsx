// pages/index.tsx
import SalaButton from './components/Salabutton'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 flex flex-col justify-center">
      <h1 className="text-4xl font-bold text-white text-center mb-12">Seleziona una Sala</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <SalaButton 
          sala="Sala Ovale" 
          color="bg-gradient-to-r from-purple-600 to-blue-500" 
          hoverColor="hover:from-purple-700 hover:to-blue-600"
          imageUrl='/images/len.jpg'
        />
                <SalaButton 
          sala="Sala Rettangolare" 
          color="bg-gradient-to-r from-amber-500 to-orange-500" 
          hoverColor="hover:from-amber-600 hover:to-orange-600"
          imageUrl='/images/rett.jpg'
        />
        <SalaButton 
          sala="Acquario Legno" 
          color="bg-gradient-to-r from-pink-500 to-rose-500" 
          hoverColor="hover:from-pink-600 hover:to-rose-600"
          imageUrl='/images/ova.jpg'
        />
        <SalaButton 
          sala="Acquario Vetro" 
          color="bg-gradient-to-r from-emerald-500 to-teal-600" 
          hoverColor="hover:from-emerald-600 hover:to-teal-700"
          imageUrl='/images/vet.jpg'
        />

      </div>
    </div>
  );
}