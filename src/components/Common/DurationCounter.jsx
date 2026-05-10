import React, { useState, useEffect } from 'react';

function DurationCounter({ startTime }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date() - new Date(startTime);
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      
      let str = '';
      if (hours > 0) str += `${hours}:`;
      str += `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setElapsed(str);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  return <span className="value">{elapsed}</span>;
}

export default DurationCounter;
