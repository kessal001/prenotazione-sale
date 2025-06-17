// components/SalaButton.tsx
import Link from 'next/link';

interface SalaButtonProps {
  sala: string;
}

const SalaButton: React.FC<SalaButtonProps> = ({ sala }) => {
  return (
    <Link href={`/sala/${sala}`}>
      <button
        className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-700 transition"
      >
        {sala}
      </button>
    </Link>
  );
};

export default SalaButton;
