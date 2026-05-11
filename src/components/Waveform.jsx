import { motion } from 'framer-motion';
import './Waveform.css';

const Waveform = ({ isActive = true, count = 40 }) => {
  const bars = Array.from({ length: count }, (_, i) => i);

  const getRandomHeight = (index) => {
    // Create a pattern that looks like a waveform
    const position = (index / count) * Math.PI * 4;
    const baseHeight = Math.sin(position) * 0.5 + 0.5;
    return Math.max(0.1, baseHeight);
  };

  return (
    <div className="waveform-container">
      <motion.div 
        className="waveform"
        animate={isActive ? 'active' : 'inactive'}
        initial="inactive"
      >
        {bars.map((index) => (
          <motion.div
            key={index}
            className="waveform-bar"
            variants={{
              active: {
                height: `${getRandomHeight(index) * 100}%`,
                transition: {
                  duration: 0.2,
                  repeat: Infinity,
                  repeatType: 'mirror',
                  delay: index * 0.02,
                }
              },
              inactive: {
                height: `${getRandomHeight(index) * 60}%`,
                transition: {
                  duration: 0.3,
                  delay: index * 0.01,
                }
              }
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default Waveform;
