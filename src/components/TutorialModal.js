import React, { useState } from 'react';

const tutorialSteps = [
  {
    title: "Get Started",
    content: "Welcome! Type your questions or commands in the input field below to get started."
  },
  {
    title: "Manage Chats",
    content: "Click the '+' button in the sidebar to start a new chat. Your previous conversations will be saved here too."
  },
  {
    title: "All Set!",
    content: "You're all set! Ask me anything or try a command. Enjoy!"
  }
];

const TutorialModal = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(); // Call onComplete when the last step is finished
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = tutorialSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{step.title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            &times; {/* Close icon */}
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{step.content}</p>
        <div className="flex justify-between">
          <div>
            {currentStep > 0 && (
              <button 
                onClick={handlePrevious} 
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-md"
              >
                Previous
              </button>
            )}
          </div>
          <button 
            onClick={handleNext} 
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            {currentStep === tutorialSteps.length - 1 ? 'Get Started!' : 'Next'}
          </button>
        </div>
        <div className="mt-4 flex justify-center">
          {tutorialSteps.map((_, index) => (
            <span 
              key={index} 
              className={`h-2 w-2 mx-1 rounded-full ${index === currentStep ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            ></span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
