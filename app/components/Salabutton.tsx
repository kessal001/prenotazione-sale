// components/SalaButton.tsx
import Link from 'next/link';
import Image from 'next/image';

interface SalaButtonProps {
  sala: string;
  color: string;
  hoverColor: string;
  imageUrl: string;
}

const SalaButton: React.FC<SalaButtonProps> = ({ sala, color, hoverColor, imageUrl }) => {
  return (
    <Link href={`/sala/${sala}`} className="flex justify-center w-full">
      <div className={`relative w-full max-w-4xl min-h-64 rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 group flex flex-col md:flex-row ${color} ${hoverColor}`}>
        
        {/* Parte immagine */}
        <div className="relative w-full md:w-2/5 h-48 md:h-full">
          <Image 
            src={imageUrl}
            alt={`Sala ${sala}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority
          />
        </div>
        
        {/* Parte testuale con gestione del testo lungo */}
        <div className="w-full md:w-3/5 flex flex-col items-center justify-center p-6 md:p-8 space-y-4">
          <span className="text-white text-4xl md:text-5xl font-bold drop-shadow-lg text-center break-words whitespace-normal px-4">
            {sala}
          </span>
          <span className="text-white text-lg md:text-xl opacity-80 text-center">
            Scopri di più
          </span>
        </div>
        
        {/* Effetto hover */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 ${hoverColor} transition-opacity duration-300`} />
      </div>
    </Link>
  );
};

export default SalaButton;