import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from 'lucide-react';
import { TradingPair } from '@/lib/types';

interface PairSelectorProps {
  pairs: TradingPair[];
  selectedPair: TradingPair;
  onSelect: (pair: TradingPair) => void;
  className?: string;
}

const PairSelector: React.FC<PairSelectorProps> = ({
  pairs,
  selectedPair,
  onSelect,
  className
}) => {
  const handleChange = (value: string) => {
    const pair = pairs.find(p => p.id === value);
    if (pair) {
      onSelect(pair);
    }
  };

  return (
    <div className={className}>
      <div className="relative">
        <Select
          value={selectedPair.id}
          onValueChange={handleChange}
        >
          <SelectTrigger className="bg-background border-gray-700 focus:ring-primary focus:ring-1 w-full sm:w-48">
            <SelectValue placeholder="Select Trading Pair" />
          </SelectTrigger>
          <SelectContent className="bg-background border-gray-700 text-white">
            {pairs.map((pair) => (
              <SelectItem key={pair.id} value={pair.id} className='text-white'>
                {pair.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default PairSelector;
