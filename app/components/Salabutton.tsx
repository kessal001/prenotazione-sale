// components/SalaButton.tsx
import Link from 'next/link';

interface SalaButtonProps {
  sala: string;
  color: string;
  hoverColor: string;
}

const SalaButton: React.FC<SalaButtonProps> = ({ sala, color, hoverColor }) => {
  return (
    <Link href={`/sala/${sala}`} className="flex justify-center">
      <button
        className={`text-white p-8 rounded-2xl text-2xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 w-full max-w-md ${color} ${hoverColor}`}
      >
        {sala}
      </button>
    </Link>
  );
};

export default SalaButton;