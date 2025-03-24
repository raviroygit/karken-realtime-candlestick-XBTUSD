import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from 'lucide-react';
import { TimeInterval, timeIntervals } from '@/lib/types';

interface IntervalSelectorProps {
  intervals: TimeInterval[];
  selectedInterval: number;
  onSelect: (interval: number) => void;
  className?: string;
}

const IntervalSelector: React.FC<IntervalSelectorProps> = ({
  intervals,
  selectedInterval,
  onSelect,
  className
}) => {
  const handleChange = (value: string) => {
    const interval = parseInt(value, 10);
    onSelect(interval);
  };

  return (
    <div className={className}>
      <div className="relative">
        <Select
          value={selectedInterval.toString()}
          onValueChange={handleChange}
        >
          <SelectTrigger className="bg-background border-gray-700 focus:ring-primary focus:ring-1 w-full sm:w-36">
            <SelectValue placeholder="Select Interval" />
          </SelectTrigger>
          <SelectContent className="bg-background border-gray-700">
            {intervals.map((interval) => (
              <SelectItem key={interval.value} value={interval.value.toString()}>
                {interval.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default IntervalSelector;
