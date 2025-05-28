// src/components/Display/InitialDisplay.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface InitialDisplayProps {
  show: boolean;
}

const InitialDisplay: React.FC<InitialDisplayProps> = ({ show }) => {
  if (!show) return null;

  return (
    <motion.div 
      className=" inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="text-center">
        <motion.div
          animate={{
            scale: [1, 1, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-8"
        >
          <img 
            src="/logocutout.png" // Replace with your logo path
            alt="Intelligensi.ai Logo"
            className="w-32 h-32 mx-auto"
          />
        </motion.div>
        
        {/* Welcome Message */}
        <motion.h1
          animate={{
            opacity: [0.6, 1, 0.6],
            y: [0, 0, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-xl font-light text-white"
        >
          Welcome to Intelligensi.ai
        </motion.h1>
      </div>
    </motion.div>
  );
};

export default InitialDisplay; // Changed to default export