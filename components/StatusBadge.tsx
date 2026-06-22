
import React from 'react';
import { SessionStatus } from '../types';

interface Props {
  status: SessionStatus;
}

const StatusBadge: React.FC<Props> = ({ status }) => {
  const configs = {
    [SessionStatus.DISCONNECTED]: { label: 'Inactive', classes: 'bg-slate-100 text-slate-600' },
    [SessionStatus.CONNECTING]: { label: 'Connecting', classes: 'bg-amber-100 text-amber-600' },
    [SessionStatus.CONNECTED]: { label: 'Live', classes: 'bg-emerald-100 text-emerald-600' },
    [SessionStatus.ERROR]: { label: 'Error', classes: 'bg-rose-100 text-rose-600' },
  };

  const { label, classes } = configs[status];

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${classes}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
