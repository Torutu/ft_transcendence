// src/components/LoadingSpinner.tsx
// const LoadingSpinner = () => (
//   <div className="flex justify-center items-center h-screen">
//     <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
//   </div>
// );

// export default LoadingSpinner;

// src/components/LoadingSpinner.tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const LoadingSpinner = ({ size = 'md', color = 'blue-500' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className="flex justify-center items-center">
      <div 
        className={`animate-spin rounded-full border-t-4 border-b-4 border-${color} ${sizeClasses[size]}`}
      ></div>
    </div>
  );
};

export default LoadingSpinner;