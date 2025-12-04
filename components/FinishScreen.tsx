
import React, { useEffect, useState } from 'react';

export const FinishScreen: React.FC<{ show: boolean }> = ({ show }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setVisible(true), 1000); // Delayed fade in
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="bg-black/60 backdrop-blur-md p-12 rounded-lg text-center border border-white/10 max-w-2xl mx-4">
        <h1 className="text-3xl md:text-5xl font-light tracking-widest text-white mb-6">
          SUMMIT REACHED
        </h1>
        <p className="text-lg md:text-xl text-neutral-300 font-light leading-relaxed italic">
          "You reached the summit with your own breath."
        </p>
      </div>
    </div>
  );
};
