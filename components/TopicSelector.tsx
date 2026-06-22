
import React from 'react';
import { Topic } from '../types';

interface Props {
  topics: Topic[];
  selected: Topic;
  onSelect: (topic: Topic) => void;
  disabled: boolean;
}

// Map each topic to a bright background accent or pastel visual style
const getTopicCardStyle = (id: string, isSelected: boolean) => {
  const styles: Record<string, { activeBg: string, activeBorder: string, iconColor: string, hoverBg: string, borderLeft: string }> = {
    'free-talk': {
      activeBg: 'bg-indigo-50/80',
      activeBorder: 'border-indigo-500',
      iconColor: 'text-indigo-600',
      hoverBg: 'hover:bg-indigo-50/30',
      borderLeft: 'border-l-4 border-l-indigo-500'
    },
    'daily-communication': {
      activeBg: 'bg-emerald-50/80',
      activeBorder: 'border-emerald-500',
      iconColor: 'text-emerald-600',
      hoverBg: 'hover:bg-emerald-50/30',
      borderLeft: 'border-l-4 border-l-emerald-500'
    },
    'classroom-communication': {
      activeBg: 'bg-sky-50/80',
      activeBorder: 'border-sky-500',
      iconColor: 'text-sky-600',
      hoverBg: 'hover:bg-sky-50/30',
      borderLeft: 'border-l-4 border-l-sky-500'
    },
    'primary-school-activities': {
      activeBg: 'bg-amber-50/80',
      activeBorder: 'border-amber-500',
      iconColor: 'text-amber-600',
      hoverBg: 'hover:bg-amber-50/30',
      borderLeft: 'border-l-4 border-l-amber-500'
    },
    'parent-communication': {
      activeBg: 'bg-rose-50/80',
      activeBorder: 'border-rose-500',
      iconColor: 'text-rose-600',
      hoverBg: 'hover:bg-rose-50/30',
      borderLeft: 'border-l-4 border-l-rose-500'
    },
    'teaching-methods': {
      activeBg: 'bg-violet-50/80',
      activeBorder: 'border-violet-500',
      iconColor: 'text-violet-600',
      hoverBg: 'hover:bg-violet-50/30',
      borderLeft: 'border-l-4 border-l-violet-500'
    },
    'daily-routines': {
      activeBg: 'bg-teal-50/80',
      activeBorder: 'border-teal-500',
      iconColor: 'text-teal-600',
      hoverBg: 'hover:bg-teal-50/30',
      borderLeft: 'border-l-4 border-l-teal-500'
    },
    'hobbies-interests': {
      activeBg: 'bg-pink-50/80',
      activeBorder: 'border-pink-500',
      iconColor: 'text-pink-600',
      hoverBg: 'hover:bg-pink-50/30',
      borderLeft: 'border-l-4 border-l-pink-500'
    },
    'food-drinks': {
      activeBg: 'bg-orange-50/80',
      activeBorder: 'border-orange-500',
      iconColor: 'text-orange-600',
      hoverBg: 'hover:bg-orange-50/30',
      borderLeft: 'border-l-4 border-l-orange-500'
    },
    'health-exercise': {
      activeBg: 'bg-green-50/80',
      activeBorder: 'border-green-500',
      iconColor: 'text-green-600',
      hoverBg: 'hover:bg-green-50/30',
      borderLeft: 'border-l-4 border-l-green-400'
    },
    'travel-holidays': {
      activeBg: 'bg-cyan-50/80',
      activeBorder: 'border-cyan-500',
      iconColor: 'text-cyan-600',
      hoverBg: 'hover:bg-cyan-50/30',
      borderLeft: 'border-l-4 border-l-cyan-500'
    }
  };

  const current = styles[id] || styles['free-talk'];
  if (isSelected) {
    return `border-2 ${current.activeBorder} ${current.activeBg} ${current.borderLeft} scale-[1.01] shadow-md shadow-slate-100`;
  }
  return `border-slate-200 bg-white hover:border-slate-300 ${current.hoverBg} ${current.borderLeft}`;
};

const TopicSelector: React.FC<Props> = ({ topics, selected, onSelect, disabled }) => {
  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
      {topics.map((topic) => {
        const isSelected = selected.id === topic.id;
        return (
          <button
            key={topic.id}
            onClick={() => !disabled && onSelect(topic)}
            disabled={disabled}
            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 relative cursor-pointer ${getTopicCardStyle(topic.id, isSelected)} ${
              disabled && !isSelected ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`font-bold text-sm md:text-base ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                {topic.title}
              </span>
              {isSelected && (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
              {topic.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default TopicSelector;
