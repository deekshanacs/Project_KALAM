import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { pageVariants } from '../../utils/animations';

interface PageWrapperProps {
  children: ReactNode;
  title?: string;
}

export function PageWrapper({ children, title }: PageWrapperProps) {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      variants={shouldReduce ? {} : pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex-1 overflow-auto p-6 scrollbar-thin"
    >
      {title && (
        <h1 className="text-2xl font-semibold text-white mb-6 tracking-tight">
          {title}
        </h1>
      )}
      {children}
    </motion.div>
  );
}
