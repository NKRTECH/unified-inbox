'use client';

/**
 * Date Range Picker Component
 * 
 * Allows users to select a date range for analytics filtering
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [startDate, setStartDate] = useState(value.startDate.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(value.endDate.toISOString().split('T')[0]);

  const handleApply = () => {
    onChange({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  };

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    
    onChange({
      startDate: start,
      endDate: end,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-6 border-2 border-gray-300 rounded-lg bg-white shadow-sm">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label htmlFor="start-date" className="block text-sm font-bold text-gray-900 mb-2">
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate}
            className="w-full px-3 py-2 text-gray-900 font-medium border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="end-date" className="block text-sm font-bold text-gray-900 mb-2">
            End Date
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 text-gray-900 font-medium border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleApply}
          className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Apply
        </button>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={() => handlePreset(7)}
          className="px-4 py-2 text-sm font-semibold text-gray-900 bg-white border-2 border-gray-400 rounded-md hover:bg-gray-100 transition-colors"
        >
          Last 7 days
        </button>
        <button
          onClick={() => handlePreset(30)}
          className="px-4 py-2 text-sm font-semibold text-gray-900 bg-white border-2 border-gray-400 rounded-md hover:bg-gray-100 transition-colors"
        >
          Last 30 days
        </button>
        <button
          onClick={() => handlePreset(90)}
          className="px-4 py-2 text-sm font-semibold text-gray-900 bg-white border-2 border-gray-400 rounded-md hover:bg-gray-100 transition-colors"
        >
          Last 90 days
        </button>
      </div>
    </div>
  );
}
