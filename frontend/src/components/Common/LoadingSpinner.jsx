import React from 'react';

const LoadingSpinner = ({ size = 'md', text = 'Loading Kashwave...' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4">
      <div className={`rounded-full border-brand-500/20 border-t-brand-500 animate-spin ${sizeClasses[size]}`}></div>
      {text && <p className="text-sm text-slate-400 font-medium tracking-wide animate-pulse">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
